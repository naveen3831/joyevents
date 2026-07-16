import { Router } from "express";
import Booking from "../models/Booking.js";
import PromoCode from "../models/PromoCode.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/auth.js";
import { formatCurrency } from "../utils/formatCurrency.js";
import { getReferralSettings } from "../utils/referrals.js";

const router = Router();

function buildReferralReuseQuery({ customer, eventId, serviceId }) {
  const itemFilters = [];
  if (eventId) itemFilters.push({ event: eventId });
  if (serviceId) itemFilters.push({ service: serviceId });
  if (itemFilters.length === 0) return null;

  return {
    customer,
    "referral.referrer": { $exists: true, $ne: null },
    $or: itemFilters
  };
}

// Merchant: Create promo code
router.post("/promo-codes", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const { code, description, appliesTo, applicableCategories, discountType, discountValue, maxUses, expiryDate, applicableEvents, applicableServices, minBookingAmount, maxDiscount } = req.body;


    // Validate code format
    if (!code || !/^[A-Z0-9]{3,15}$/i.test(code)) {
      return res.status(400).json({ error: "Promo code must be between 3 and 15 alphanumeric characters" });
    }
    if (description && description.length > 150) {
      return res.status(400).json({ error: "Promo description cannot exceed 150 characters" });
    }
    if (discountType === "percentage" && (discountValue < 1 || discountValue > 100)) {
      return res.status(400).json({ error: "Percentage discount must be between 1% and 100%" });
    }
    if (discountType === "fixed" && discountValue < 1) {
      return res.status(400).json({ error: "Fixed discount value must be at least ₹1" });
    }

    // Check if code already exists
    const existingCode = await PromoCode.findOne({ code: code.toUpperCase() });
    if (existingCode) {
      return res.status(400).json({ error: "Promo code already exists" });
    }

    const promoCode = await PromoCode.create({
      merchant: merchantId,
      code: code.toUpperCase(),
      description,
      appliesTo,
      applicableCategories: applicableCategories && applicableCategories.length > 0 ? applicableCategories : ["all"],
      discountType,
      discountValue,
      maxUses,
      expiryDate,
      applicableEvents,
      applicableServices,
      minBookingAmount,
      maxDiscount
    });

    res.json({ success: true, promoCode });
  } catch (error) {
    res.status(500).json({ error: "Failed to create promo code" });
  }
});

// Merchant: Get promo codes
router.get("/promo-codes", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const promoCodes = await PromoCode.find({ merchant: merchantId })
      .populate("applicableEvents", "title")
      .populate("applicableServices", "name")
      .sort({ createdAt: -1 });

    res.json({ promoCodes });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch promo codes" });
  }
});

// Public: Get all active promo codes (for home page display)
router.get("/all-promo-codes", async (req, res) => {
  try {
    const promoCodes = await PromoCode.find({ isActive: true })
      .populate("merchant", "name")
      .populate("applicableEvents", "title")
      .populate("applicableServices", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ promoCodes });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch promo codes" });
  }
});

// Public: Validate promo code (guest-friendly)
router.post("/validate-promo", async (req, res) => {
  try {
    const { code, amount, eventId, serviceId } = req.body;
    
    // Check if token provided for user-specific validation
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = (await import("jsonwebtoken")).default.verify(token, process.env.JWT_SECRET);
        userId = decoded.sub || decoded._id; // Use .sub or ._id depending on how it was signed
      } catch (err) {
        // Token invalid, treat as guest
      }
    }

    if (!code) {
      return res.status(400).json({ error: "Promo code is required" });
    }

    const normalizedCode = code.toUpperCase();
    const promo = await PromoCode.findOne({ code: normalizedCode, isActive: true });
    
    if (!promo) {
      const settings = await getReferralSettings();
      const referrer = settings.isActive
        ? await User.findOne({ referralCode: normalizedCode, status: "active" }).select("_id name referralCode")
        : null;

      if (!referrer) {
        return res.status(404).json({ error: "Invalid promo code" });
      }

      if (userId && referrer._id.toString() === userId.toString()) {
        return res.status(400).json({ error: "You cannot use your own referral code" });
      }

      if (userId) {
        const reuseQuery = buildReferralReuseQuery({
          customer: userId,
          referralCode: normalizedCode,
          eventId,
          serviceId
        });

        if (!reuseQuery) {
          return res.status(400).json({ error: "Select an event or service before applying a referral code" });
        }

        const previouslyUsedReferral = await Booking.findOne(reuseQuery).select("_id");
        if (previouslyUsedReferral) {
          return res.status(400).json({
            error: "You have already used a referral code for this event or service"
          });
        }
      }

      const referralDiscount = Math.min(Number(settings.discountAmount) || 0, Number(amount) || 0);
      return res.json({
        success: true,
        promo: {
          code: normalizedCode,
          discountType: "fixed",
          discountValue: referralDiscount,
          maxDiscount: referralDiscount,
          _id: null,
          kind: "referral",
          referrerId: referrer._id,
          referrerName: referrer.name,
          bonusAmount: Number(settings.bonusAmount) || 0
        },
        discount: referralDiscount
      });
    }

    // Check if expired
    if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
      return res.status(400).json({ error: "Promo code has expired" });
    }

    // Check if max uses reached
    if (promo.maxUses && promo.currentUses >= promo.maxUses) {
      return res.status(400).json({ error: "Promo code usage limit reached" });
    }

    // MANDATORY: Check "one promo code per user" for ANY promo code
    // This ensures a user can only use ONE promo code across the entire platform (events/services)
    if (userId) {
      console.log(`🔍 Checking if user ${userId} has already used ANY promo code...`);
      
      const PromoCodeModel = (await import("../models/PromoCode.js")).default;
      const previouslyUsedPromo = await PromoCodeModel.findOne({
        "usedBy.customer": userId
      });
      
      if (previouslyUsedPromo) {
        console.log(`✅ User has already used promo code: ${previouslyUsedPromo.code}`);
        return res.status(400).json({ 
          error: `You have already used a promo code (${previouslyUsedPromo.code}). Each user can only use ONE promo code across all events and services.` 
        });
      }
    }

    // Check minimum booking amount
    if (promo.minBookingAmount && amount < promo.minBookingAmount) {
      return res.status(400).json({ 
        error: `Minimum booking amount of ${formatCurrency(promo.minBookingAmount)} required` 
      });
    }

    // Check appliesTo (separate promo codes for ticketed events, full-service events, and services)
    if (serviceId) {
      if (!["all", "services"].includes(promo.appliesTo || "all")) {
        return res.status(400).json({ error: "This promo code is not applicable to services" });
      }
    }

    if (eventId) {
      const Event = (await import("../models/Event.js")).default;
      const event = await Event.findById(eventId).select("eventType category");
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.eventType === "ticketed") {
        if (!["all", "ticketedEvents"].includes(promo.appliesTo || "all")) {
          return res.status(400).json({ error: "This promo code is not applicable to ticketed events" });
        }
      } else if (event.eventType === "fullService") {
        if (!["all", "fullServiceEvents"].includes(promo.appliesTo || "all")) {
          return res.status(400).json({ error: "This promo code is not applicable to full-service events" });
        }
      } else {
        if (!["all"].includes(promo.appliesTo || "all")) {
          return res.status(400).json({ error: "This promo code is not applicable to this event" });
        }
      }
    }

    // Check applicableCategories
    let itemCategory = "all";
    if (serviceId) {
      const Service = (await import("../models/Service.js")).default;
      const service = await Service.findById(serviceId).select("category");
      if (service && service.category) {
        itemCategory = service.category;
      }
    } else if (eventId) {
      const Event = (await import("../models/Event.js")).default;
      const event = await Event.findById(eventId).select("category");
      if (event && event.category) {
        itemCategory = event.category;
      }
    }

    if (promo.applicableCategories && promo.applicableCategories.length > 0 && !promo.applicableCategories.includes("all")) {
      // If promo category is restricted, check if item category matches
      if (!promo.applicableCategories.includes(itemCategory)) {
        return res.status(400).json({ error: `This promo code is only applicable to specific categories` });
      }
    }

    // Check if applicable to this event or service
    if (promo.applicableEvents && promo.applicableEvents.length > 0 && eventId) {
      const matches = promo.applicableEvents.some((e) => e && e.toString() === eventId.toString());
      if (!matches) {
        return res.status(400).json({ error: "This promo code is not applicable to this event" });
      }
    }
    
    if (promo.applicableServices && promo.applicableServices.length > 0 && serviceId) {
      const matches = promo.applicableServices.some((s) => s && s.toString() === serviceId.toString());
      if (!matches) {
        return res.status(400).json({ error: "This promo code is not applicable to this service" });
      }
    }

    // Calculate discount
    let discount = 0;
    if (promo.discountType === "percentage") {
      discount = (amount * promo.discountValue) / 100;
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else {
      discount = promo.discountValue;
    }

    res.json({
      success: true,
      promo: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        maxDiscount: promo.maxDiscount,
        _id: promo._id
      },
      discount: Math.min(discount, amount)
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to validate promo code" });
  }
});

// Track promo code usage when booking is created
router.post("/track-usage/:promoCodeId", async (req, res) => {
  try {
    const { promoCodeId } = req.params;
    const { customerId, bookingId } = req.body;

    const promo = await PromoCode.findByIdAndUpdate(
      promoCodeId,
      {
        $inc: { currentUses: 1 },
        $push: {
          usedBy: {
            customer: customerId,
            booking: bookingId,
            usedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!promo) {
      return res.status(404).json({ error: "Promo code not found" });
    }

    res.json({ success: true, promo });
  } catch (error) {
    res.status(500).json({ error: "Failed to track promo usage" });
  }
});

// Merchant: Update promo code
router.patch("/promo-codes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.user._id;
    const { description, maxUses, expiryDate, isActive, minBookingAmount, appliesTo, applicableCategories } = req.body;

    const promoCode = await PromoCode.findOne({ _id: id, merchant: merchantId });
    if (!promoCode) {
      return res.status(404).json({ error: "Promo code not found" });
    }

    Object.assign(promoCode, { 
      description, maxUses, expiryDate, isActive, minBookingAmount, appliesTo,
      applicableCategories: applicableCategories && applicableCategories.length > 0 ? applicableCategories : promoCode.applicableCategories 
    });
    await promoCode.save();

    res.json({ success: true, promoCode });
  } catch (error) {
    res.status(500).json({ error: "Failed to update promo code" });
  }
});

// Merchant: Delete promo code
router.delete("/promo-codes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const merchantId = req.user._id;

    const promoCode = await PromoCode.findOneAndDelete({ _id: id, merchant: merchantId });
    if (!promoCode) {
      return res.status(404).json({ error: "Promo code not found" });
    }

    res.json({ success: true, message: "Promo code deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete promo code" });
  }
});

// Merchant: Send notification to customers
router.post("/send-notification", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const { title, message, targetCustomers, eventId, serviceId } = req.body;


    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }
    if (title.length > 50) {
      return res.status(400).json({ error: "Title cannot exceed 50 characters" });
    }
    if (message.length > 250) {
      return res.status(400).json({ error: "Message cannot exceed 250 characters" });
    }

    let customers = [];
    
    // If specific customers are targeted, use them
    if (targetCustomers && targetCustomers.length > 0) {
      customers = targetCustomers;
    } else {
      // Try to send to all customers who booked from this merchant
      try {
        const Booking = (await import("../models/Booking.js")).default;
        const bookings = await Booking.find({ assignedTo: merchantId }).distinct("customer");
        customers = bookings;
      } catch (err) {
      }
    }

    if (customers.length === 0) {
      return res.status(400).json({ 
        error: "No customers to notify. You need to have customers who have booked from you, or specify target customers." 
      });
    }

    // Create notifications for each customer
    const notifications = await Promise.all(
      customers.map(customerId => {
        return Notification.create({
          userId: customerId,
          title,
          message,
          type: "marketing",
          status: "unread",
          relatedId: eventId || serviceId || merchantId,
          actionUrl: eventId ? `/events/${eventId}` : serviceId ? `/services/${serviceId}` : "/"
        }).catch(err => {
          return null;
        });
      })
    );

    const successfulNotifications = notifications.filter(n => n !== null);
    
    res.json({ 
      success: true, 
      notificationsSent: successfulNotifications.length,
      message: `Notification sent to ${successfulNotifications.length} customer(s)`
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to send notification: " + error.message });
  }
});

// Merchant: Get event share link
router.get("/share-link/:eventId", verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const merchantId = req.user._id;

    const Event = (await import("../models/Event.js")).default;
    const event = await Event.findOne({ _id: eventId, createdBy: merchantId });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const shareLink = `${process.env.FRONTEND_URL || "http://localhost:8080"}/events/${eventId}`;
    const shareText = `Check out this amazing event: ${event.title}`;

    res.json({
      shareLink,
      shareText,
      event: {
        title: event.title,
        description: event.description,
        image: event.image
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate share link" });
  }
});

// Merchant: Get marketing stats
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;

    const promoCodes = await PromoCode.find({ merchant: merchantId });
    const totalPromoCodes = promoCodes.length;
    const activePromoCodes = promoCodes.filter(p => p.isActive).length;
    const totalPromoUses = promoCodes.reduce((sum, p) => sum + p.currentUses, 0);

    res.json({
      totalPromoCodes,
      activePromoCodes,
      totalPromoUses,
      promoCodes: promoCodes.map(p => ({
        code: p.code,
        uses: p.currentUses,
        maxUses: p.maxUses,
        isActive: p.isActive
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch marketing stats" });
  }
});

export default router;
