import express from "express";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import Message from "../models/Message.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/auth.js";
import { sendContactMessage } from "../utils/sendEmail.js";
import { validateEmail, normalizeEmail } from "../utils/validation.js";
import { emitMessageCreated, emitMessageReplied, emitNotificationCreated } from "../realtime.js";

const router = express.Router();

// POST /api/contact/merchant — send message (public)
router.post("/merchant", async (req, res) => {
  const { senderName, senderEmail, message, merchantId, eventId, serviceId, bookingId, customerId } = req.body;
  if (!senderName?.trim() || !senderEmail?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Name, email and message are required" });
  }
  const emailErr = validateEmail(senderEmail);
  if (emailErr) return res.status(400).json({ error: emailErr });
  const normalizedSenderEmail = normalizeEmail(senderEmail);
  try {
    let merchant = null;
    let itemTitle = "your listing";
    let resolvedEventId = null;
    let resolvedServiceId = null;

    if (merchantId) {
      merchant = await User.findById(merchantId).select("name email");
    } else if (bookingId) {
      // Resolve merchant via the booking's assignedTo or linked event or service
      const booking = await Booking.findById(bookingId)
        .populate("assignedTo", "name email")
        .populate({ path: "event", select: "title createdBy", populate: { path: "createdBy", select: "name email" } })
        .populate({ path: "service", select: "name createdBy", populate: { path: "createdBy", select: "name email" } });
      if (booking?.assignedTo?.email) {
        merchant = booking.assignedTo;
        itemTitle = booking.eventName || booking.serviceName || booking.event?.title || booking.service?.name || "your booking";
        resolvedEventId = booking.event?._id || null;
        resolvedServiceId = booking.service?._id || null;
      } else if (booking?.event?.createdBy) {
        merchant = booking.event.createdBy;
        itemTitle = booking.event.title || booking.eventName || "your booking";
        resolvedEventId = booking.event._id;
      } else if (booking?.service?.createdBy) {
        merchant = booking.service.createdBy;
        itemTitle = booking.service.name || booking.serviceName || "your booking";
        resolvedServiceId = booking.service._id;
      }
    } else if (eventId) {
      const event = await Event.findById(eventId).populate("createdBy", "name email");
      if (event?.createdBy) { merchant = event.createdBy; itemTitle = event.title; resolvedEventId = event._id; }
    } else if (serviceId) {
      const service = await Service.findById(serviceId).populate("createdBy", "name email");
      if (service?.createdBy) { merchant = service.createdBy; itemTitle = service.name; resolvedServiceId = service._id; }
    }

    if (!merchant?.email) return res.status(404).json({ error: "Merchant not found" });

    const newMsg = await Message.create({
      senderName: senderName.trim(),
      senderEmail: normalizedSenderEmail,
      message: message.trim(),
      merchant: merchant._id,
      eventId: resolvedEventId,
      serviceId: resolvedServiceId,
      itemTitle,
      customerId: customerId || null,
    });

    emitMessageCreated(newMsg);

    // Create in-app notification for merchant
    try {
      await Notification.create({
        userId: merchant._id,
        title: "New Customer Enquiry",
        message: `${senderName.trim()} sent a message regarding "${itemTitle}": "${message.trim().slice(0, 70)}${message.trim().length > 70 ? '...' : ''}"`,
        type: "general",
        actionUrl: "/merchant-dashboard/inbox"
      });
    } catch (notifErr) {
      console.error("Failed to create notification for merchant message:", notifErr.message);
    }

    sendContactMessage({
      senderName: senderName.trim(),
      senderEmail: normalizedSenderEmail,
      message: message.trim(),
      merchantEmail: merchant.email,
      merchantName: merchant.name,
      itemTitle,
    }).catch(err => console.error("Email send failed:", err.message));

    res.json({ success: true, message: "Message sent to the organiser!" });
  } catch (e) {
    console.error("contact/merchant error:", e.message);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET /api/contact/inbox — merchant inbox (MUST be before /:id routes)
router.get("/inbox", verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({ merchant: req.user._id }).sort({ updatedAt: -1, createdAt: -1 });
    res.json({ messages });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// GET /api/contact/customer-inbox — customer inbox (MUST be before /:id routes)
router.get("/customer-inbox", verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ customerId: req.user._id }, { senderEmail: req.user.email }]
    }).populate("merchant", "name email").sort({ updatedAt: -1, createdAt: -1 });
    res.json({ messages });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// PATCH /api/contact/:id/read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, merchant: req.user._id },
      { read: true },
      { new: true }
    );
    if (!msg) return res.status(404).json({ error: "Message not found" });
    res.json({ message: msg });
  } catch (e) {
    res.status(500).json({ error: "Failed to update message" });
  }
});

// POST /api/contact/:id/reply — merchant replies
router.post("/:id/reply", verifyToken, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Reply text required" });
  if (text.length > 1000) return res.status(400).json({ error: "Reply cannot exceed 1000 characters" });
  try {
    const msg = await Message.findOne({ _id: req.params.id, merchant: req.user._id });
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const newReply = { from: "merchant", text: text.trim(), createdAt: new Date() };
    msg.replies.push(newReply);
    await msg.save();

    emitMessageReplied(msg, newReply);

    const merchant = await User.findById(req.user._id).select("name email");

    // Create in-app notification for customer
    if (msg.customerId) {
      try {
        await Notification.create({
          userId: msg.customerId,
          title: "New Reply from Organiser",
          message: `${merchant?.name || "Organiser"} replied regarding "${msg.itemTitle}": "${text.trim().slice(0, 70)}${text.trim().length > 70 ? '...' : ''}"`,
          type: "general",
          actionUrl: "/customer-dashboard/messages"
        });
      } catch (notifErr) {
        console.error("Failed to create notification for merchant reply:", notifErr.message);
      }
    }

    sendContactMessage({
      senderName: merchant.name,
      senderEmail: merchant.email,
      message: text.trim(),
      merchantEmail: msg.senderEmail,
      merchantName: msg.senderName,
      itemTitle: `Reply to your enquiry about "${msg.itemTitle}"`,
    }).catch(err => console.error("Reply email failed:", err.message));

    res.json({ success: true, message: msg });
  } catch (e) {
    console.error("reply error:", e.message);
    res.status(500).json({ error: "Failed to send reply" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    await Message.findOneAndDelete({ _id: req.params.id, merchant: req.user._id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});

// POST /api/contact/:id/customer-reply — customer replies back
router.post("/:id/customer-reply", verifyToken, async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Reply text required" });
  if (text.length > 1000) return res.status(400).json({ error: "Reply cannot exceed 1000 characters" });
  try {
    const user = req.user;
    const msg = await Message.findOne({
      _id: req.params.id,
      $or: [{ customerId: user._id }, { senderEmail: user.email }]
    }).populate("merchant", "name email");
    if (!msg) return res.status(404).json({ error: "Message not found" });

    const newReply = { from: "customer", text: text.trim(), createdAt: new Date() };
    msg.replies.push(newReply);
    msg.read = false; // Reset read status to false so merchant sees NEW badge and unread count update!
    await msg.save();

    emitMessageReplied(msg, newReply);

    // Create in-app notification for merchant
    if (msg.merchant) {
      try {
        const merchantId = msg.merchant._id || msg.merchant;
        await Notification.create({
          userId: merchantId,
          title: "New Customer Reply",
          message: `${user.name || "Customer"} replied regarding "${msg.itemTitle}": "${text.trim().slice(0, 70)}${text.trim().length > 70 ? '...' : ''}"`,
          type: "general",
          actionUrl: "/merchant-dashboard/inbox"
        });
      } catch (notifErr) {
        console.error("Failed to create notification for customer reply:", notifErr.message);
      }
    }

    const merchantEmail = msg.merchant ? msg.merchant.email : "unknown@domain.com";
    const merchantName = msg.merchant ? msg.merchant.name : "Organiser";

    sendContactMessage({
      senderName: user.name || "Customer",
      senderEmail: user.email,
      message: text.trim(),
      merchantEmail: merchantEmail,
      merchantName: merchantName,
      itemTitle: `Customer follow-up on "${msg.itemTitle}"`,
    }).catch(err => console.error("Customer reply email failed:", err.message));

    res.json({ success: true, message: msg });
  } catch (e) {
    console.error("customer-reply error:", e.message);
    res.status(500).json({ error: "Failed to send reply", details: e.message });
  }
});

// POST /api/contact/admin — send contact message to admin (public)
router.post("/admin", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: "Name, email and message are required" });
  }
  const emailErr = validateEmail(email);
  if (emailErr) return res.status(400).json({ error: emailErr });
  const normalizedEmail = normalizeEmail(email);

  try {
    const { sendContactUsToAdmin } = await import("../utils/sendEmail.js");
    await sendContactUsToAdmin({
      name: name.trim(),
      email: normalizedEmail,
      subject: subject ? subject.trim() : "",
      message: message.trim(),
    });

    res.json({ success: true, message: "Your message has been sent to the admin!" });
  } catch (e) {
    console.error("contact/admin error:", e.message);
    res.status(500).json({ error: e.message || "Failed to send message to the admin" });
  }
});

export default router;
