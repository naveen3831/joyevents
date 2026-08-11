import express from "express";
import CustomServiceRequest from "../models/CustomServiceRequest.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  emitCustomServiceRequestCreated,
  emitCustomServiceQuoted,
  emitCustomServiceRejected,
  emitCustomServicePaid,
  emitWalletUpdated
} from "../realtime.js";

const router = express.Router();
const requireAdmin = requireRole("admin");

// Helper to safely send notifications without failing the main transaction
async function safeCreateNotification({ userId, title, message, type = "general", actionUrl = "" }) {
  try {
    await Notification.create({
      userId,
      title,
      message,
      type: ["booking", "event", "service", "general"].includes(type) ? type : "general",
      actionUrl
    });
  } catch (err) {
    console.error("Failed to create notification safely:", err.message);
  }
}

// 1. Create a custom service enquiry (Customer)
router.post("/", verifyToken, async (req, res) => {
  try {
    const { serviceTitle, category, eventDate, location, budget, quantity, count, description } = req.body;

    if (!serviceTitle || !eventDate || !location || !description) {
      return res.status(400).json({ error: "Missing required fields: serviceTitle, eventDate, location, and description" });
    }

    const request = new CustomServiceRequest({
      user: req.user._id,
      serviceTitle,
      category: category || "General",
      eventDate: new Date(eventDate),
      location,
      budget: Number(budget) || 0,
      quantity: Number(quantity || count) || 1,
      description,
      status: "pending"
    });

    await request.save();
    const populatedRequest = await CustomServiceRequest.findById(request._id).populate("user", "name email mobile");

    // Notify admins safely
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await safeCreateNotification({
          userId: admin._id,
          title: "New Custom Service Enquiry",
          message: `${req.user.name || "A customer"} requested a custom service: "${serviceTitle}" (${category || "General"})`,
          type: "service",
          actionUrl: "/admin-dashboard/users?tab=custom-services"
        });
      }
    } catch (e) {
      console.error("Error notifying admins:", e);
    }

    // Realtime WS broadcast to admins
    try {
      emitCustomServiceRequestCreated(populatedRequest);
    } catch (e) {
      console.error("Error emitting realtime custom service event:", e);
    }

    res.status(201).json({
      message: "Custom service enquiry submitted successfully!",
      request: populatedRequest
    });
  } catch (err) {
    console.error("Error creating custom service request:", err);
    res.status(500).json({ error: err.message || "Failed to submit enquiry" });
  }
});

// 2. Get customer's own enquiries
router.get("/my", verifyToken, async (req, res) => {
  try {
    const requests = await CustomServiceRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch enquiries" });
  }
});

// 3. Admin: Get all custom service enquiries
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const requests = await CustomServiceRequest.find()
      .populate("user", "name email mobile role")
      .sort({ createdAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch enquiries" });
  }
});

// 4. Admin: Send quotation for custom service enquiry
router.post("/:id/quote", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { quotationAmount, quotationNote } = req.body;
    const amount = Number(quotationAmount);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: "Quotation amount must be a positive number" });
    }

    const request = await CustomServiceRequest.findById(req.params.id).populate("user", "name email");
    if (!request) {
      return res.status(404).json({ error: "Custom service request not found" });
    }

    request.status = "quoted";
    request.quotationAmount = amount;
    request.quotationNote = quotationNote || "";
    request.quotedAt = new Date();
    await request.save();

    // Create notification for customer safely
    await safeCreateNotification({
      userId: request.user._id,
      title: "Quotation Received!",
      message: `Admin sent a quotation of ₹${amount.toLocaleString()} for your service request "${request.serviceTitle}".`,
      type: "booking",
      actionUrl: "/customer-dashboard/my-requests"
    });

    // Realtime WS emission
    try {
      emitCustomServiceQuoted(request.user._id, request);
    } catch (e) {}

    res.json({
      message: "Quotation sent successfully to customer!",
      request
    });
  } catch (err) {
    console.error("Error sending quotation:", err);
    res.status(500).json({ error: err.message || "Failed to send quotation" });
  }
});

// 5. Admin: Reject custom service enquiry
router.post("/:id/reject", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const request = await CustomServiceRequest.findById(req.params.id).populate("user", "name email");
    if (!request) {
      return res.status(404).json({ error: "Custom service request not found" });
    }

    request.status = "rejected";
    request.rejectionReason = rejectionReason || "Service cannot be fulfilled at this time.";
    request.rejectedAt = new Date();
    await request.save();

    // Create notification for customer safely
    await safeCreateNotification({
      userId: request.user._id,
      title: "Request Update",
      message: `Your custom service request "${request.serviceTitle}" was declined: ${request.rejectionReason}`,
      type: "booking",
      actionUrl: "/customer-dashboard/my-requests"
    });

    // Realtime WS emission
    try {
      emitCustomServiceRejected(request.user._id, request);
    } catch (e) {}

    res.json({
      message: "Custom service enquiry rejected",
      request
    });
  } catch (err) {
    console.error("Error rejecting custom service request:", err);
    res.status(500).json({ error: err.message || "Failed to reject enquiry" });
  }
});

// 6. Customer: Accept quotation and pay
router.post("/:id/pay", verifyToken, async (req, res) => {
  try {
    const request = await CustomServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Custom service request not found" });
    }

    if (String(request.user) !== String(req.user._id)) {
      return res.status(403).json({ error: "Unauthorized access to this request" });
    }

    if (request.status !== "quoted") {
      return res.status(400).json({ error: "This request is not in quoted status" });
    }

    const { paymentMethod, paymentId } = req.body;

    if (paymentMethod === "wallet") {
      const customerUser = await User.findById(req.user._id);
      if (!customerUser || (customerUser.walletBalance || 0) < request.quotationAmount) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }
      customerUser.walletBalance = (customerUser.walletBalance || 0) - request.quotationAmount;
      await customerUser.save();
      try {
        emitWalletUpdated(customerUser._id, customerUser.walletBalance);
      } catch (e) {}
    }

    // Create a corresponding booking record for customer records
    const booking = new Booking({
      customer: req.user._id,
      serviceName: `Custom Service: ${request.serviceTitle}`,
      price: request.quotationAmount,
      datetime: request.eventDate,
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: paymentId || `PAY-${Date.now()}`,
      paymentMethod: paymentMethod || "card",
      customerLocation: {
        address: request.location
      }
    });

    await booking.save();

    request.status = "paid";
    request.paymentStatus = "paid";
    request.paymentId = booking.paymentId;
    request.paidAt = new Date();
    request.bookingId = booking._id;
    await request.save();

    // Notify Admin safely
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await safeCreateNotification({
          userId: admin._id,
          title: "Custom Service Paid!",
          message: `${req.user.name || "Customer"} accepted quote and paid ₹${request.quotationAmount.toLocaleString()} for "${request.serviceTitle}".`,
          type: "booking",
          actionUrl: "/admin-dashboard/users?tab=custom-services"
        });
      }
    } catch (e) {}

    // Emit WS event
    try {
      emitCustomServicePaid(request);
    } catch (e) {}

    res.json({
      message: "Payment processed successfully for custom service!",
      request,
      booking
    });
  } catch (err) {
    console.error("Error paying for custom service request:", err);
    res.status(500).json({ error: err.message || "Payment failed" });
  }
});

export default router;
