import express from "express";
import User from "../models/User.js";
import Event from "../models/Event.js";
import Service from "../models/Service.js";
import Message from "../models/Message.js";
import { verifyToken } from "../middleware/auth.js";
import { sendContactMessage } from "../utils/sendEmail.js";
import { validateEmail, normalizeEmail } from "../utils/validation.js";

const router = express.Router();

// POST /api/contact/merchant — send message (public)
router.post("/merchant", async (req, res) => {
  const { senderName, senderEmail, message, merchantId, eventId, serviceId, customerId } = req.body;
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
    } else if (eventId) {
      const event = await Event.findById(eventId).populate("createdBy", "name email");
      if (event?.createdBy) { merchant = event.createdBy; itemTitle = event.title; resolvedEventId = event._id; }
    } else if (serviceId) {
      const service = await Service.findById(serviceId).populate("createdBy", "name email");
      if (service?.createdBy) { merchant = service.createdBy; itemTitle = service.name; resolvedServiceId = service._id; }
    }

    if (!merchant?.email) return res.status(404).json({ error: "Merchant not found" });

    await Message.create({
      senderName: senderName.trim(),
      senderEmail: normalizedSenderEmail,
      message: message.trim(),
      merchant: merchant._id,
      eventId: resolvedEventId,
      serviceId: resolvedServiceId,
      itemTitle,
      customerId: customerId || null,
    });

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
    const messages = await Message.find({ merchant: req.user._id }).sort({ createdAt: -1 });
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
    }).populate("merchant", "name email").sort({ updatedAt: -1 });
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

    msg.replies.push({ from: "merchant", text: text.trim() });
    await msg.save();

    const merchant = await User.findById(req.user._id).select("name email");
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

    msg.replies.push({ from: "customer", text: text.trim() });
    await msg.save();

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
