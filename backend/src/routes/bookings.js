                                                                                                      import { Router } from "express";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import Transaction from "../models/Transaction.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { formatCurrency } from "../utils/formatCurrency.js";

const router = Router();

function normalizeCommissionRate(value) {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return 5;
  return Math.min(100, Math.max(1, rate));
}

// Helper function to create notifications
async function createNotification(userId, title, message, type, relatedId, actionUrl) {
  try {
    if (!userId) return null;
    const notification = await Notification.create({
      userId, title, message, type, relatedId, actionUrl, status: "unread"
    });
    return notification;
  } catch {
    return null;
  }
}

// Helper to decrement ticket sold counts when booking is cancelled or rejected
async function decrementEventTickets(booking) {
  try {
    if (!booking.event || (!booking.ticketType && (!booking.selectedTickets || Object.keys(booking.selectedTickets).length === 0))) {
      return;
    }
    const Event = (await import("../models/Event.js")).default;
    const event = await Event.findById(booking.event);
    if (!event || event.eventType !== "ticketed") return;

    let ticketsToDecrement = [];
    
    // Determine which tickets to decrement
    if (booking.selectedTickets && typeof booking.selectedTickets === 'object' && Object.keys(booking.selectedTickets).length > 0) {
      for (const [type, qty] of Object.entries(booking.selectedTickets)) {
        const numQty = Number(qty);
        if (numQty > 0) {
          ticketsToDecrement.push({ type, qty: numQty });
        }
      }
    } else if (booking.ticketType) {
      const decrementAmount = booking.quantity || 1;
      ticketsToDecrement.push({ type: booking.ticketType, qty: decrementAmount });
    }

    if (ticketsToDecrement.length === 0) return;

    // Handle day/night sessions
    if (event.hasMultipleSessions && event.sessions && booking.selectedSession) {
      const session = booking.selectedSession; // "day" or "night"
      for (const { type, qty } of ticketsToDecrement) {
        const sessionData = event.sessions[session];
        if (sessionData && sessionData.tickets) {
          const ticketIndex = sessionData.tickets.findIndex(t => t.type === type);
          if (ticketIndex !== -1) {
            const updatePath = `sessions.${session}.tickets.${ticketIndex}.sold`;
            const currentSold = sessionData.tickets[ticketIndex].sold || 0;
            const decVal = Math.min(qty, currentSold);
            if (decVal > 0) {
              await Event.findByIdAndUpdate(
                booking.event,
                { $inc: { [updatePath]: -decVal } },
                { new: true }
              );
            }
          }
        }
      }
    } else if (event.tickets && event.tickets.length > 0) {
      // Handle normal tickets
      for (const { type, qty } of ticketsToDecrement) {
        const ticketIndex = event.tickets.findIndex(t => t.type === type);
        if (ticketIndex !== -1) {
          const updatePath = `tickets.${ticketIndex}.sold`;
          const currentSold = event.tickets[ticketIndex].sold || 0;
          const decVal = Math.min(qty, currentSold);
          if (decVal > 0) {
            await Event.findByIdAndUpdate(
              booking.event,
              { $inc: { [updatePath]: -decVal } },
              { new: true }
            );
          }
        }
      }
    }

    // Decrement attendeesCount as well
    const totalTicketsDecremented = ticketsToDecrement.reduce((sum, { qty }) => sum + qty, 0);
    const currentAttendees = event.attendeesCount || 0;
    const decAttendees = Math.min(totalTicketsDecremented, currentAttendees);
    if (decAttendees > 0) {
      await Event.findByIdAndUpdate(booking.event, { $inc: { attendeesCount: -decAttendees } });
    }
  } catch (err) {
    console.error("Failed to decrement event tickets:", err);
  }
}

// Customer: create booking (service or event)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      serviceName,
      eventName,
      eventId,
      price,
      date,
      time,
      ticketType,
      quantity,
      selectedTickets,
      isEvent,
      paymentMethod,
      paymentDetails,
      customerLocation,
      promoCode,
      originalPrice,
      discount
    } = req.body || {};


    // Validate required fields with clear error messages
    if (!eventName && !serviceName) {
      return res.status(400).json({ error: "Event name or service name is required" });
    }
    if (!price) {
      return res.status(400).json({ error: "Price is required" });
    }
    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }
    if (!time) {
      return res.status(400).json({ error: "Time is required" });
    }


    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt.getTime())) {
      return res.status(400).json({ error: "Invalid date/time format" });
    }

    // Validate ticket availability for ticketed events
    if (eventId && (ticketType || selectedTickets)) {
      const Event = (await import("../models/Event.js")).default;
      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const selectedSession = req.body.selectedSession;

      // Determine which tickets array to validate against
      const getTicketsArray = () => {
        if (event.hasMultipleSessions && selectedSession && event.sessions?.[selectedSession]?.tickets) {
          return event.sessions[selectedSession].tickets;
        }
        return event.tickets || [];
      };

      // Handle multiple tickets
      if (selectedTickets && Object.keys(selectedTickets).length > 0) {
        const ticketsArray = getTicketsArray();
        for (const [type, qty] of Object.entries(selectedTickets)) {
          if (qty > 0) {
            const ticket = ticketsArray.find(t => t.type === type);
            if (!ticket) {
              return res.status(400).json({ error: `Ticket type ${type} not found` });
            }

            const availableTickets = (ticket.available || 0) - (ticket.sold || 0);
            if (qty > availableTickets) {
              return res.status(400).json({ 
                error: `Not enough ${type} tickets available. Only ${availableTickets} remaining.` 
              });
            }
          }
        }
      } else if (ticketType) {
        // Handle single ticket type
        const ticketsArray = getTicketsArray();
        const ticket = ticketsArray.find(t => t.type === ticketType);
        if (!ticket) {
          return res.status(400).json({ error: "Ticket type not found" });
        }

        const availableTickets = (ticket.available || 0) - (ticket.sold || 0);
        const requestedQuantity = quantity || 1;

        if (requestedQuantity > availableTickets) {
          return res.status(400).json({ 
            error: `Not enough tickets available. Only ${availableTickets} ticket(s) remaining for ${ticketType} tier.` 
          });
        }
      }
    }

    // Validate fullService event capacity
    if (eventId && !ticketType && !selectedTickets) {
      const Event = (await import("../models/Event.js")).default;
      const event = await Event.findById(eventId);
      if (event?.eventType === "fullService" && event.maxAttendees > 0) {
        const remaining = event.maxAttendees - (event.attendeesCount || 0);
        const requestedQty = quantity || 1;
        if (requestedQty > remaining) {
          return res.status(400).json({ error: `Only ${remaining} spot(s) remaining for this event.` });
        }
      }
    }

    // Generate ticket ID only for events
    const ticketId = eventId ? `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}` : undefined;


    // Auto-assign to the merchant who created the event or service
    let merchantToNotify = null;
    if (eventId) {
      const Event = (await import("../models/Event.js")).default;
      const event = await Event.findById(eventId).populate("createdBy", "name email role");
      if (event && event.createdBy && event.createdBy.role === "merchant") {
        merchantToNotify = event.createdBy;
      }
    } else if (req.body.serviceId) {
      const Service = (await import("../models/Service.js")).default;
      const service = await Service.findById(req.body.serviceId).populate("createdBy", "name email role");
      if (service && service.createdBy && service.createdBy.role === "merchant") {
        merchantToNotify = service.createdBy;
      }
    }

    // Store the quantity for later use
    const bookingQuantity = quantity || 1;

    // Extract payment details based on method
    let upiId = "";
    let cardLast4 = "";
    let cardholderName = "";

    if (paymentDetails) {
      if (paymentMethod === "upi" && paymentDetails.upiId) {
        upiId = paymentDetails.upiId;
      } else if (paymentMethod === "card") {
        cardLast4 = paymentDetails.cardLast4 || "";
        cardholderName = paymentDetails.cardholderName || "";
      }
    }

    // Determine initial status based on whether it's an event or service
    const isService = !!req.body.serviceId;
    // Events are confirmed immediately after payment, Services need merchant approval
    const initialStatus = isService ? "pending_approval" : "confirmed";
    const initialPaymentStatus = isService ? "pending" : "paid";
    const payId = isService ? "" : `PAY-${Date.now()}`;

    // Wallet balance deductions handling
    const useWallet = !!req.body.useWallet;
    const walletAmountPaid = Number(req.body.walletAmountPaid || 0);

    let finalPaymentMethod = paymentMethod || "card";
    if (useWallet && walletAmountPaid > 0) {
      if (walletAmountPaid >= Number(price)) {
        finalPaymentMethod = "wallet";
      } else {
        finalPaymentMethod = "mixed";
      }
    }

    const booking = await Booking.create({
      customer: req.user._id,
      event: eventId || null,
      service: req.body.serviceId || null,
      serviceName: serviceName || eventName,
      eventName: eventName || "",
      eventId: eventId || "",
      price: Number(price),
      datetime: dt,
      status: initialStatus,
      assignedTo: merchantToNotify ? merchantToNotify._id : null,
      paymentStatus: initialPaymentStatus,
      paymentId: payId,
      ticketId,
      ticketType: ticketType || "",
      quantity: bookingQuantity,
      selectedTickets: selectedTickets || {},
      selectedSession: req.body.selectedSession || "",
      paymentMethod: finalPaymentMethod,
      upiId: upiId,
      cardLast4: cardLast4,
      cardholderName: cardholderName,
      walletAmountPaid: useWallet ? walletAmountPaid : 0,
      customerLocation: customerLocation || null,
      // Promo code data
      promoCode: promoCode ? {
        code: promoCode.code || "",
        promoCodeId: promoCode._id || null,
        discountType: promoCode.discountType || "",
        discountValue: promoCode.discountValue || 0,
        discountAmount: Number(discount) || 0,
        originalPrice: Number(originalPrice) || Number(price),
        finalPrice: Number(price),
        appliedAt: new Date()
      } : {},
      // Add-ons selected by customer
      addOns: Array.isArray(req.body.addOns) ? req.body.addOns : [],
      guestCount: Number(req.body.guestCount) || 0,
      // Seat numbers selected by customer
      selectedSeatNumbers: Array.isArray(req.body.seatNumbers) ? req.body.seatNumbers : []
    });

    // Deduct from wallet balance and record transaction if wallet was used
    if (useWallet && walletAmountPaid > 0) {
      const customerUser = await User.findById(req.user._id);
      if (customerUser) {
        customerUser.walletBalance = Math.max(0, (customerUser.walletBalance || 0) - walletAmountPaid);
        await customerUser.save();

        // Log transaction for customer spending
        await Transaction.create({
          merchant: req.user._id, // customer's wallet transaction
          booking: booking._id,
          type: "withdrawal",
          amount: walletAmountPaid,
          description: `Paid for booking using Wallet balance: ${booking.serviceName || booking.eventName}`,
          status: "completed",
          relatedId: booking._id.toString()
        });
      }
    }

    // Increment ticket sold count for ticketed events
    if (eventId) {
      const Event = (await import("../models/Event.js")).default;
      const event = await Event.findById(eventId);
      
      
      if (event?.eventType === "ticketed") {
        let ticketsToUpdate = [];
        
        // Determine which tickets to update
        if (selectedTickets && typeof selectedTickets === 'object' && Object.keys(selectedTickets).length > 0) {
          for (const [type, qty] of Object.entries(selectedTickets)) {
            const numQty = Number(qty);
            if (numQty > 0) {
              ticketsToUpdate.push({ type, qty: numQty });
            }
          }
        } else if (ticketType) {
          ticketsToUpdate.push({ type: ticketType, qty: bookingQuantity });
        } else {
          if (event.tickets && event.tickets.length > 0) {
            ticketsToUpdate.push({ type: event.tickets[0].type, qty: 1 });
          }
        }
        
        // Handle day/night sessions
        if (event.hasMultipleSessions && event.sessions && req.body.selectedSession) {
          const session = req.body.selectedSession; // "day" or "night"
          
          // Update each ticket type in the selected session
          for (const { type, qty } of ticketsToUpdate) {
            const sessionData = event.sessions[session];
            if (sessionData && sessionData.tickets) {
              const ticketIndex = sessionData.tickets.findIndex(t => t.type === type);
              
              if (ticketIndex !== -1) {
                const updatePath = `sessions.${session}.tickets.${ticketIndex}.sold`;
                await Event.findByIdAndUpdate(
                  eventId,
                  { $inc: { [updatePath]: qty } },
                  { new: true }
                );
              }
            }
          }
        } else if (event.tickets && event.tickets.length > 0) {
          // Handle normal tickets (non-session)
          for (const { type, qty } of ticketsToUpdate) {
            const ticketIndex = event.tickets.findIndex(t => t.type === type);
            
            if (ticketIndex !== -1) {
              const updatePath = `tickets.${ticketIndex}.sold`;
              await Event.findByIdAndUpdate(
                eventId,
                { $inc: { [updatePath]: qty } },
                { new: true }
              );
            }
          }
        }

        // Also increment attendeesCount for ticketed events (total tickets sold across all types)
        const totalTicketsSold = ticketsToUpdate.reduce((sum, { qty }) => sum + qty, 0);
        if (totalTicketsSold > 0) {
          await Event.findByIdAndUpdate(eventId, { $inc: { attendeesCount: totalTicketsSold } });
        }

        // Block specific seats if provided
        if (req.body.seatNumbers && Array.isArray(req.body.seatNumbers) && req.body.seatNumbers.length > 0) {
          // Extract just the seat number part (e.g., "J10" from "gold-J10")
          const cleanedSeats = req.body.seatNumbers.map(seat => {
            const parts = seat.split("-");
            return parts.length > 1 ? parts.slice(1).join("-") : seat;
          });
          await Event.findByIdAndUpdate(
            eventId,
            { $addToSet: { bookedSeats: { $each: cleanedSeats } } },
            { new: true }
          );
        }
      } else if (event?.eventType === "fullService") {
        // fullService event - increment attendeesCount
        await Event.findByIdAndUpdate(eventId, { $inc: { attendeesCount: bookingQuantity } });
        
        // Block specific seats if provided
        if (req.body.seatNumbers && Array.isArray(req.body.seatNumbers) && req.body.seatNumbers.length > 0) {
          // Extract just the seat number part (e.g., "J10" from "seat-J10")
          const cleanedSeats = req.body.seatNumbers.map(seat => {
            const parts = seat.split("-");
            return parts.length > 1 ? parts.slice(1).join("-") : seat;
          });
          await Event.findByIdAndUpdate(
            eventId,
            { $addToSet: { bookedSeats: { $each: cleanedSeats } } },
            { new: true }
          );
        }
      }
    }

    // Create Transaction record for event bookings (payment is immediate)
    if (!isService && merchantToNotify && Number(price) > 0) {
      try {
        const Transaction = (await import("../models/Transaction.js")).default;
        const Settings = (await import("../models/Settings.js")).default;

        // Get commission rate from settings (default 10%)
        const commissionSetting = await Settings.findOne({ key: "commissionRate" });
        const commissionRate = normalizeCommissionRate(commissionSetting?.value);
        const commissionAmount = Math.round((Number(price) * commissionRate) / 100);
        const merchantEarning = Number(price) - commissionAmount;

        booking.commissionSnapshot = {
          commissionRate,
          commissionAmount,
          merchantPayout: merchantEarning,
          grossAmount: Number(price),
          capturedAt: new Date()
        };
        await booking.save();

        // Merchant earning transaction
        await Transaction.create({
          merchant: merchantToNotify._id,
          booking: booking._id,
          type: "earning",
          amount: merchantEarning,
          description: `Event booking payment: ${eventName || serviceName} (after ${commissionRate}% commission)`,
          status: "completed",
          relatedId: payId,
          metadata: { bookingId: booking._id, eventName: eventName || serviceName, grossAmount: Number(price), commissionRate, commissionAmount }
        });

        // Commission deduction transaction
        await Transaction.create({
          merchant: merchantToNotify._id,
          booking: booking._id,
          type: "commission_deduction",
          amount: commissionAmount,
          description: `Platform commission (${commissionRate}%) for: ${eventName || serviceName}`,
          status: "completed",
          relatedId: payId,
          metadata: { bookingId: booking._id, commissionRate, grossAmount: Number(price) }
        });
      } catch (txErr) {
        console.error("Failed to create transaction records:", txErr.message);
      }
    }

    // Determine notification message based on whether it's an event or service
    const customerMessage = isService 
      ? `Your booking request for ${serviceName || eventName} has been submitted for merchant approval.`
      : `Your booking for ${serviceName || eventName} has been confirmed! Your tickets are now available in your dashboard.`;
    const merchantMessage = isService
      ? `You have received a new booking request for ${serviceName || eventName} that requires your approval.`
      : `A new booking has been confirmed for ${serviceName || eventName}. Payment has been received.`;

    // Create notification for customer about new booking
    await createNotification(
      req.user._id,
      isService ? "Booking Submitted" : "Booking Created",
      customerMessage,
      "booking",
      booking._id,
      "/my-requests"
    );

    // Create notification for merchant about new booking (if assigned)
    if (merchantToNotify) {
      await createNotification(
        merchantToNotify._id,
        isService ? "New Approval Request" : "New Paid Booking",
        merchantMessage,
        "booking",
        booking._id,
        "/merchant-bookings"
      );
    }

    // Create notification for admin about new booking
    try {
      const Admin = (await import("../models/User.js")).default;
      const admins = await Admin.find({ role: "admin" });
      
      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await createNotification(
            admin._id,
            "New Booking Submitted",
            `A new booking has been submitted for ${serviceName || eventName} by ${req.user.name || "a customer"}.`,
            "booking",
            booking._id,
            "/admin-dashboard/bookings"
          );
        }
      }
    } catch (err) {
    }

    // Track promo code usage if applied
    if (promoCode && (promoCode._id || promoCode.code)) {
      console.log(`🎟️ Tracking promo usage: ${promoCode.code} for user ${req.user._id} on booking ${booking._id}`);
      try {
        const PromoCode = (await import("../models/PromoCode.js")).default;
        
        // Find by ID or Code
        const query = promoCode._id ? { _id: promoCode._id } : { code: promoCode.code };
        
        const updatedPromo = await PromoCode.findOneAndUpdate(
          query,
          {
            $inc: { currentUses: 1 },
            $push: {
              usedBy: {
                customer: req.user._id,
                booking: booking._id,
                usedAt: new Date()
              }
            }
          },
          { new: true }
        );
        
        if (updatedPromo) {
          console.log(`✅ Promo tracked successfully! Current uses: ${updatedPromo.currentUses}, Used by count: ${updatedPromo.usedBy.length}`);
        } else {
          console.log(`⚠️ Promo code not found for tracking: ${promoCode.code}`);
        }
      } catch (err) {
        console.error('❌ Failed to track promo usage:', err.message);
        // Don't fail the booking if promo tracking fails
      }
    } else {
      console.log('ℹ️ No promo code applied to this booking');
    }

    res.status(201).json({ booking, ticketId });
  } catch (e) {
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// Admin: list bookings (optional status filter)
router.get("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    const q = status ? { status } : {};
    const bookings = await Booking.find(q)
      .populate("customer", "name email role")
      .populate("assignedTo", "name email role")
      .populate("event", "title datetime location price category")
      .populate("service", "name price category image")
      .sort({ createdAt: -1 })
      .lean();

    const bookingIds = bookings.map((booking) => booking._id);
    const transactions = await Transaction.find({
      booking: { $in: bookingIds },
      status: "completed",
      type: { $in: ["earning", "commission_deduction"] }
    }).lean();

    const summaries = new Map();
    for (const transaction of transactions) {
      if (!transaction.booking) continue;
      const bookingId = transaction.booking.toString();
      const summary = summaries.get(bookingId) || {
        commissionAmount: 0,
        merchantPayout: 0,
        grossAmount: 0,
        commissionRates: [],
        transactionCount: 0
      };

      if (transaction.type === "commission_deduction") {
        summary.commissionAmount += Number(transaction.amount) || 0;
      }
      if (transaction.type === "earning") {
        summary.merchantPayout += Number(transaction.amount) || 0;
      }

      const grossAmount = Number(transaction.metadata?.grossAmount);
      if (transaction.type === "earning" && !Number.isNaN(grossAmount)) {
        summary.grossAmount += grossAmount;
      }

      const commissionRate = Number(transaction.metadata?.commissionRate);
      if (!Number.isNaN(commissionRate) && !summary.commissionRates.includes(commissionRate)) {
        summary.commissionRates.push(commissionRate);
      }

      summary.transactionCount += 1;
      summaries.set(bookingId, summary);
    }

    const bookingsWithCommission = bookings.map((booking) => {
      const summary = summaries.get(booking._id.toString());
      if (!summary) {
        const snapshot = booking.commissionSnapshot;
        if (snapshot && Number(snapshot.grossAmount) > 0) {
          return {
            ...booking,
            commissionSummary: {
              commissionAmount: Math.round((Number(snapshot.commissionAmount) || 0) * 100) / 100,
              merchantPayout: Math.round((Number(snapshot.merchantPayout) || 0) * 100) / 100,
              grossAmount: Math.round((Number(snapshot.grossAmount) || 0) * 100) / 100,
              commissionRate: Number(snapshot.commissionRate) || null,
              commissionRates: Number(snapshot.commissionRate) ? [Number(snapshot.commissionRate)] : [],
              fromTransactions: false,
              fromSnapshot: true
            }
          };
        }

        return {
          ...booking,
          commissionSummary: null
        };
      }

      const grossAmount = summary.grossAmount || summary.commissionAmount + summary.merchantPayout || booking.price || 0;
      return {
        ...booking,
        commissionSummary: {
          commissionAmount: Math.round(summary.commissionAmount * 100) / 100,
          merchantPayout: Math.round(summary.merchantPayout * 100) / 100,
          grossAmount: Math.round(grossAmount * 100) / 100,
          commissionRate: summary.commissionRates.length === 1 ? summary.commissionRates[0] : null,
          commissionRates: summary.commissionRates,
          fromTransactions: true
        }
      };
    });

    res.json({ bookings: bookingsWithCommission });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: full booking history â€” all statuses with all populated fields
router.get("/history", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("customer", "name email role")
      .populate("assignedTo", "name email role")
      .populate("event", "title datetime location price category")
      .populate("service", "name price category image")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Customer: my bookings (all statuses, with assignedTo populated)
router.get("/my", verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate("assignedTo", "name email")
      .populate("service", "name price category image")
      .populate("event", "title datetime location price category tickets image eventType")
      .sort({ createdAt: -1 });

    const validBookings = bookings.filter((b) => {
      const isEventBooking = !!b.eventId;
      if (isEventBooking) return b.event != null;
      const isServiceBooking = !!b.service;
      if (isServiceBooking) return b.service != null;
      return false;
    });

    res.json({ bookings: validBookings });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: assigned bookings (all statuses assigned to this merchant)
router.get("/assigned", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const bookings = await Booking.find({ assignedTo: req.user._id })
      .populate("customer", "name email")
      .populate("event", "title datetime location image price category")
      .populate("service", "name price category image")
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin/Merchant: Fix orphaned service bookings (match by serviceName â†’ Service.name)
router.post("/fix-service-bookings", verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const isMerchant = req.user.role === "merchant";
    if (!isAdmin && !isMerchant) return res.status(403).json({ error: "Forbidden" });

    const Service = (await import("../models/Service.js")).default;

    // Find bookings with no service ref and no event ref (orphaned service bookings)
    const query = {
      service: null,
      $or: [{ event: null }, { eventId: "" }, { eventId: { $exists: false } }]
    };

    const orphaned = await Booking.find(query);

    let fixed = 0;
    for (const booking of orphaned) {
      const name = booking.serviceName || booking.eventName;
      if (!name) continue;

      // Build query: if merchant, only match their own services
      const serviceQuery = { name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } };
      if (isMerchant) serviceQuery.createdBy = req.user._id;

      const service = await Service.findOne(serviceQuery);
      if (!service) continue;

      await Booking.findByIdAndUpdate(booking._id, {
        service: service._id,
        assignedTo: service.createdBy || null
      });
      fixed++;
    }

    res.json({ success: true, fixed, total: orphaned.length });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: assign booking to a merchant
router.patch("/:id/assign", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { merchantId, merchantEmail } = req.body || {};
    let merchant = null;
    if (merchantId) merchant = await User.findById(merchantId);
    if (!merchant && merchantEmail) merchant = await User.findOne({ email: merchantEmail.toLowerCase() });
    if (!merchant || !["merchant"].includes(merchant.role)) return res.status(400).json({ error: "Merchant not found" });
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { assignedTo: merchant._id, status: "assigned", assignedAt: new Date() },
      { new: true }
    )
      .populate("customer", "name email")
      .populate("assignedTo", "name email");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Create notification for merchant about new assignment
    await createNotification(
      merchant._id,
      "New Booking Assigned",
      `You have been assigned a new booking: ${booking.serviceName || booking.event}`,
      "booking",
      booking._id,
      "/merchant-bookings"
    );

    // Create notification for customer about assignment
    await createNotification(
      booking.customer._id,
      "Booking Assigned",
      `Your booking has been assigned to ${merchant.name}`,
      "booking",
      booking._id,
      "/my-requests"
    );

    res.json({ booking });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: mark booking as completed
router.patch("/:id/complete", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const existing = await Booking.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!existing) return res.status(404).json({ error: "Booking not found or not assigned to you" });
    if (existing.status === "completed") {
      return res.status(400).json({ error: "Booking is already completed." });
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, assignedTo: req.user._id },
      { status: "completed", completedAt: new Date() },
      { new: true }
    ).populate("customer", "name email");

    // Create notification for customer about completion
    await createNotification(
      booking.customer._id,
      "Booking Completed",
      `Your booking for ${booking.serviceName || booking.event} has been completed successfully.`,
      "booking",
      booking._id,
      "/my-requests"
    );

    // Create notification for admin about completion
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "Booking Completed",
        `A booking has been completed: ${booking.serviceName || booking.event}`,
        "booking",
        booking._id,
        "/admin-dashboard/bookings"
      );
    }

    res.json({ booking });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: Update booking status
router.patch("/:id/status", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "pending_approval", "approved", "awaiting_payment", "paid", "confirmed", "assigned", "accepted", "processing", "completed", "cancelled", "awaiting_final_payment"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Get current booking to check for advance payment status
    const currentBooking = await Booking.findOne({ _id: req.params.id, assignedTo: req.user._id });
    if (!currentBooking) return res.status(404).json({ error: "Booking not found or not assigned to you" });

    // Prevent any status change once booking is completed
    if (currentBooking.status === "completed") {
      return res.status(400).json({ error: "Booking is already completed and cannot be updated." });
    }

    // Special logic for completing services with advance payment
    let finalStatus = status;
    if (status === "completed" && currentBooking.service && currentBooking.paymentType === "advance" && !currentBooking.isRemainingPaid) {
      finalStatus = "awaiting_final_payment";
    }

    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, assignedTo: req.user._id },
      {
        status: finalStatus,
        ...(finalStatus === "completed" ? { completedAt: new Date() } : {}),
        ...(finalStatus === "accepted" ? { acceptedAt: new Date() } : {}),
        ...(finalStatus === "cancelled" ? { cancelledAt: new Date() } : {})
      },
      { new: true }
    ).populate("customer", "name email");

    if (!booking) return res.status(404).json({ error: "Booking not found or not assigned to you" });

    if (finalStatus === "cancelled" && currentBooking.status !== "cancelled") {
      await decrementEventTickets(currentBooking);
    }

    // Determine notification message based on status
    let title, message;
    switch (finalStatus) {
      case "paid":
        title = "Payment Received";
        message = `Your payment for ${booking.serviceName || booking.event} has been received and confirmed.`;
        break;
      case "accepted":
        title = "Booking Accepted";
        message = `Your booking for ${booking.serviceName || booking.event} has been accepted by the merchant.`;
        break;
      case "pending":
        title = "Booking Status Updated";
        message = `Your booking for ${booking.serviceName || booking.event} is now pending.`;
        break;
      case "processing":
        title = "Booking In Progress";
        message = `Your booking for ${booking.serviceName || booking.event} is now being processed.`;
        break;
      case "completed":
        title = "Booking Completed";
        message = `Your booking for ${booking.serviceName || booking.event} has been completed successfully.`;
        break;
      case "cancelled":
        title = "Booking Cancelled";
        message = `Your booking for ${booking.serviceName || booking.event} has been cancelled by the merchant.`;
        break;
      default:
        title = "Booking Status Updated";
        message = `Your booking status has been updated to ${status}.`;
    }

    // Create notification for customer
    await createNotification(
      booking.customer._id,
      title,
      message,
      "booking",
      booking._id,
      "/my-requests"
    );

    // Create notification for admin
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        title,
        `A booking status has been updated to ${status}: ${booking.serviceName || booking.event}`,
        "booking",
        booking._id,
        "/admin-dashboard/bookings"
      );
    }

    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: "Failed to update booking status" });
  }
});

// Merchant: approve booking (requires payment from customer if it's a service)
router.patch("/:id/approve", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const { paymentType = "full", customAdvanceAmount } = req.body; // "full" or "advance"
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Check if assigned to this merchant
    if (booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to approve this booking" });
    }

    const isService = !!booking.service;
    
    // Determine new status based on whether it's an event or service
    // Services go to awaiting_payment, Events go to confirmed (since they already paid)
    const newStatus = isService ? "awaiting_payment" : "confirmed";

    // Calculate advance and remaining if applicable
    let advanceAmount = 0;
    let remainingAmount = 0;
    if (isService && paymentType === "advance") {
      if (customAdvanceAmount && Number(customAdvanceAmount) > 0 && Number(customAdvanceAmount) < booking.price) {
        advanceAmount = Math.round(Number(customAdvanceAmount));
      } else {
        advanceAmount = Math.round(booking.price * 0.3); // 30% advance
      }
      remainingAmount = booking.price - advanceAmount;
    }

    // Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: newStatus,
        approvedAt: new Date(),
        approvedBy: req.user._id,
        paymentType: isService ? paymentType : "full",
        advanceAmount,
        remainingAmount: isService && paymentType === "advance" ? remainingAmount : 0,
        ...(newStatus === "confirmed" ? { acceptedAt: new Date() } : {})
      },
      { new: true }
    )
      .populate("customer", "name email")
      .populate("event", "title datetime location image price category")
      .populate("assignedTo", "name email");

    // Create notification for customer
    const notificationTitle = isService ? "Booking Approved - Payment Required" : "Booking Confirmed";
    let notificationMessage = "";
    if (isService) {
      notificationMessage = paymentType === "advance" 
        ? `Your booking for ${updatedBooking.serviceName || updatedBooking.event?.title} has been approved with an advance payment requirement of ${formatCurrency(advanceAmount)}. Please pay to confirm.`
        : `Your booking for ${updatedBooking.serviceName || updatedBooking.event?.title} has been approved. Please pay the full amount (${formatCurrency(updatedBooking.price)}) to confirm.`;
    } else {
      notificationMessage = `Your booking for ${updatedBooking.serviceName || updatedBooking.event?.title} has been confirmed! Your tickets are now available.`;
    }

    await createNotification(
      updatedBooking.customer._id,
      notificationTitle,
      notificationMessage,
      "booking",
      updatedBooking._id,
      "/my-requests"
    );

    // Create notification for admin if confirmed
    if (newStatus === "confirmed") {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "Booking Confirmed",
          `A booking has been confirmed: ${updatedBooking.serviceName || updatedBooking.event?.title}`,
          "booking",
          updatedBooking._id,
          "/admin-dashboard/bookings"
        );
      }
    }

    res.json({ booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Customer: Pay for approved booking
router.patch("/:id/pay", verifyToken, async (req, res) => {
  try {
    const { paymentMethod, paymentDetails } = req.body;
    const booking = await Booking.findById(req.params.id).populate("customer assignedTo");

    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to pay for this booking" });
    }
    
    const { paymentType = "full" } = req.body; // "full", "advance", or "remaining"

    // Check if valid status for payment
    const allowedStatuses = ["awaiting_payment", "awaiting_final_payment", "processing", "accepted", "completed"];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({ error: "Booking is not in a payable status" });
    }

    // Extract payment details
    let upiId = "";
    let cardLast4 = "";
    let cardholderName = "";

    if (paymentDetails) {
      if (paymentMethod === "upi" && paymentDetails.upiId) {
        upiId = paymentDetails.upiId;
      } else if (paymentMethod === "card") {
        cardLast4 = paymentDetails.cardLast4 || "";
        cardholderName = paymentDetails.cardholderName || "";
      }
    }

    const payId = `PAY-${Date.now()}`;

    // Wallet balance deductions handling
    const useWallet = !!req.body.useWallet;
    const walletAmountPaid = Number(req.body.walletAmountPaid || 0);

    if (useWallet && walletAmountPaid > 0) {
      const customerUser = await User.findById(req.user._id);
      if (!customerUser || (customerUser.walletBalance || 0) < walletAmountPaid) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }
      customerUser.walletBalance = Math.max(0, (customerUser.walletBalance || 0) - walletAmountPaid);
      await customerUser.save();

      // Create transaction for wallet spending
      const Transaction = (await import("../models/Transaction.js")).default;
      await Transaction.create({
        merchant: req.user._id,
        booking: booking._id,
        type: "withdrawal",
        amount: walletAmountPaid,
        description: `Paid for booking using Wallet balance: ${booking.serviceName || booking.eventName}`,
        status: "completed",
        relatedId: booking._id.toString()
      });
    }

    let finalPaymentMethod = paymentMethod || "card";
    if (useWallet && walletAmountPaid > 0) {
      const amountToPay = paymentType === "advance" 
        ? (booking.advanceAmount || 0) 
        : paymentType === "remaining" 
        ? (booking.remainingAmount || 0) 
        : booking.price;
        
      if (walletAmountPaid >= amountToPay) {
        finalPaymentMethod = "wallet";
      } else {
        finalPaymentMethod = "mixed";
      }
    }

    let updateFields = {
      paymentMethod: finalPaymentMethod,
      upiId,
      cardLast4,
      cardholderName,
      walletAmountPaid: (booking.walletAmountPaid || 0) + (useWallet ? walletAmountPaid : 0)
    };

    if (paymentType === "advance") {
      updateFields.status = "paid"; 
      updateFields.paymentStatus = "partially_paid";
      updateFields.isAdvancePaid = true;
      updateFields.advancePaymentId = payId;
      updateFields.advancePaidAt = new Date();
    } else if (paymentType === "remaining") {
      updateFields.status = "paid";
      updateFields.paymentStatus = "paid";
      updateFields.isRemainingPaid = true;
      updateFields.remainingPaymentId = payId;
      updateFields.remainingPaidAt = new Date();
      updateFields.paymentId = payId; 
    } else {
      // Full payment
      updateFields.status = "paid";
      updateFields.paymentStatus = "paid";
      updateFields.paymentId = payId;
      updateFields.confirmedAt = new Date();
    }

    // Update booking status and payment status
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).populate("customer assignedTo event service");

    // Create Transaction records for service payments
    if (updatedBooking.assignedTo && updatedBooking.price > 0) {
      try {
        const Transaction = (await import("../models/Transaction.js")).default;
        const Settings = (await import("../models/Settings.js")).default;

        const commissionSetting = await Settings.findOne({ key: "commissionRate" });
        const commissionRate = normalizeCommissionRate(commissionSetting?.value);

        const amountForTransaction = paymentType === "advance"
          ? updatedBooking.advanceAmount
          : paymentType === "remaining"
          ? updatedBooking.remainingAmount
          : updatedBooking.price;

        const commissionAmount = Math.round((amountForTransaction * commissionRate) / 100);
        const merchantEarning = amountForTransaction - commissionAmount;
        const label = paymentType === "advance" ? "Advance payment" : paymentType === "remaining" ? "Final payment" : "Full payment";
        const bookingName = updatedBooking.serviceName || updatedBooking.event?.title || "Booking";
        const previousSnapshot = updatedBooking.commissionSnapshot || {};

        updatedBooking.commissionSnapshot = {
          commissionRate,
          commissionAmount: (Number(previousSnapshot.commissionAmount) || 0) + commissionAmount,
          merchantPayout: (Number(previousSnapshot.merchantPayout) || 0) + merchantEarning,
          grossAmount: (Number(previousSnapshot.grossAmount) || 0) + amountForTransaction,
          capturedAt: new Date()
        };
        await updatedBooking.save();

        await Transaction.create({
          merchant: updatedBooking.assignedTo._id,
          booking: updatedBooking._id,
          type: "earning",
          amount: merchantEarning,
          description: `${label}: ${bookingName} (after ${commissionRate}% commission)`,
          status: "completed",
          relatedId: payId,
          metadata: { bookingId: updatedBooking._id, bookingName, grossAmount: amountForTransaction, commissionRate, commissionAmount, paymentType }
        });

        await Transaction.create({
          merchant: updatedBooking.assignedTo._id,
          booking: updatedBooking._id,
          type: "commission_deduction",
          amount: commissionAmount,
          description: `Platform commission (${commissionRate}%) for: ${bookingName}`,
          status: "completed",
          relatedId: payId,
          metadata: { bookingId: updatedBooking._id, commissionRate, grossAmount: amountForTransaction, paymentType }
        });
      } catch (txErr) {
        console.error("Failed to create transaction records for service payment:", txErr.message);
      }
    }

    // Create notification for customer
    const amountPaid = paymentType === "advance" ? updatedBooking.advanceAmount : (paymentType === "remaining" ? updatedBooking.remainingAmount : updatedBooking.price);
    await createNotification(
      updatedBooking.customer._id,
      "Payment Successful",
      `Your ${paymentType} payment of â‚¹${amountPaid} for ${updatedBooking.serviceName || updatedBooking.event?.title} was successful.`,
      "booking",
      updatedBooking._id,
      "/my-requests"
    );

    // Create notification for merchant
    if (updatedBooking.assignedTo) {
      await createNotification(
        updatedBooking.assignedTo._id,
        "Payment Received",
        `${paymentType === "advance" ? "Advance" : "Full"} payment has been received for the booking: ${updatedBooking.serviceName || updatedBooking.event?.title}.`,
        "booking",
        updatedBooking._id,
        "/merchant-bookings"
      );
    }

    // Create notification for admin
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "New Payment Received",
        `A ${paymentType} payment of â‚¹${amountPaid} has been received for booking ${updatedBooking._id}.`,
        "booking",
        updatedBooking._id,
        "/admin-dashboard/bookings"
      );
    }

    res.json({ booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: "Failed to process payment" });
  }
});

// Merchant: reject booking
router.patch("/:id/reject", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Check if assigned to this merchant
    if (booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to reject this booking" });
    }

    // Update booking to rejected status with refund
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: "cancelled",
        paymentStatus: "refunded",
        rejectedAt: new Date(),
        rejectedBy: req.user._id,
        rejectionReason: req.body.reason || ""
      },
      { new: true }
    )
      .populate("customer", "name email")
      .populate("assignedTo", "name email");

    // Decrement ticket sold count if this was a ticketed event booking
    await decrementEventTickets(booking);


    // Create notification for customer about rejection
    await createNotification(
      updatedBooking.customer._id,
      "Booking Cancelled",
      `Your booking for ${updatedBooking.serviceName || updatedBooking.event?.title} has been cancelled. Reason: ${updatedBooking.rejectionReason || "Not specified"}`,
      "booking",
      updatedBooking._id,
      "/my-requests"
    );

    // Create notification for admin about rejection
    const admins = await User.find({ role: "admin" });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        "Booking Cancelled",
        `A booking has been cancelled: ${updatedBooking.serviceName || updatedBooking.event?.title}`,
        "booking",
        updatedBooking._id,
        "/admin-dashboard/bookings"
      );
    }

    res.json({ booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin/Merchant: approve booking (generate ticket)
router.patch("/:id/approve", verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Check authorization
    if (!isAdmin && booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to approve this booking" });
    }

    // Update booking to confirmed status
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: "confirmed",
        approvedAt: new Date(),
        approvedBy: req.user._id
      },
      { new: true }
    )
      .populate("customer", "name email")
      .populate("event", "title datetime location")
      .populate("assignedTo", "name email");

    res.json({ booking: updatedBooking });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin/Merchant: reject booking
router.patch("/:id/reject", verifyToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Check authorization
    if (!isAdmin && booking.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to reject this booking" });
    }

    // Update booking to rejected status with refund
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        status: "cancelled",
        paymentStatus: "refunded",
        rejectedAt: new Date(),
        rejectedBy: req.user._id,
        rejectionReason: req.body.reason || ""
      },
      { new: true }
    )
      .populate("customer", "name email")
      .populate("assignedTo", "name email");

    // Decrement ticket sold count if this was a ticketed event booking
    await decrementEventTickets(booking);

    res.json({ booking: updatedBooking });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: refund payment (simple status update)
router.patch("/:id/refund", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { reason = "Admin refund" } = req.body;

    const booking = await Booking.findById(req.params.id).populate("customer", "name email");
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.paymentStatus === "refunded") {
      return res.status(400).json({ error: "Booking already refunded" });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ error: "Can only refund paid bookings" });
    }

    // Update booking status
    booking.paymentStatus = "refunded";
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.rejectionReason = reason;
    booking.refundReason = reason;
    booking.refundedAt = new Date();
    booking.refundedBy = req.user._id;
    booking.refundAmount = Number(booking.price) || 0;
    booking.refundProcessedAt = new Date();
    await booking.save();

    // Decrement ticket sold count if this was a ticketed event booking
    await decrementEventTickets(booking);

    if (booking.assignedTo && booking.refundAmount > 0) {
      const existingRefundTransaction = await Transaction.findOne({
        merchant: booking.assignedTo,
        booking: booking._id,
        type: "refund",
        relatedId: `ADMIN-REFUND-${booking._id}`
      });

      if (!existingRefundTransaction) {
        await Transaction.create({
          merchant: booking.assignedTo,
          booking: booking._id,
          type: "refund",
          amount: -booking.refundAmount,
          description: `Admin refund deduction for booking: ${booking.serviceName || booking.eventName}`,
          status: "completed",
          relatedId: `ADMIN-REFUND-${booking._id}`
        });
      }
    }

    // Create notification for customer
    await createNotification(
      booking.customer._id,
      "Payment Refunded",
      `Your payment of â‚¹${booking.price} for ${booking.serviceName || booking.eventName} has been refunded. Reason: ${reason}`,
      "refund",
      booking._id,
      "/my-requests"
    );


    res.json({
      success: true,
      message: "Payment refunded successfully",
      booking: {
        _id: booking._id,
        id: booking._id,
        paymentStatus: booking.paymentStatus,
        status: booking.status,
        refundAmount: booking.refundAmount,
        refundReason: booking.refundReason,
        refundedAt: booking.refundedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to process refund" });
  }
});

// Customer: submit rating for a booking
router.patch("/:id/rate", verifyToken, async (req, res) => {
  try {
    const { score, comment } = req.body;
    
    
    // Validate rating score
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: "Rating score must be between 1 and 5" });
    }
    
    if (comment && comment.length > 500) {
      return res.status(400).json({ error: "Rating comment cannot exceed 500 characters" });
    }
    
    // Find booking
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    // Check if customer is the one who made the booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to rate this booking" });
    }
    
    // Check if booking is confirmed, paid, or completed
    if (!["confirmed", "paid", "completed"].includes(booking.status)) {
      return res.status(400).json({ error: "Can only rate confirmed or completed bookings" });
    }
    
    // Update booking with rating
    booking.rating = {
      score: Number(score),
      comment: comment || "",
      ratedAt: new Date(),
      ratedBy: req.user._id
    };
    
    await booking.save();
    
    
    res.json({ 
      success: true, 
      message: "Rating submitted successfully",
      booking: booking
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit rating" });
  }
});

// Public: get all reviews (rated bookings) for events and services
router.get("/reviews/public", async (req, res) => {
  try {
    const bookings = await Booking.find({
      "rating.score": { $gte: 1 }
    })
      .populate("customer", "name")
      .populate("event", "title category image")
      .populate("service", "name category image")
      .sort({ "rating.ratedAt": -1 })
      .limit(100);

    const reviews = bookings
      .filter(b => b.rating && b.rating.score >= 1)
      .map(b => ({
        _id: b._id,
        score: b.rating?.score,
        comment: b.rating?.comment,
        ratedAt: b.rating?.ratedAt,
        customerName: b.customer?.name || "Customer",
        type: b.event ? "event" : "service",
        eventId: b.event?._id || null,
        serviceId: b.service?._id || null,
        title: b.event?.title || b.serviceName || b.service?.name || "—",
        category: b.event?.category || b.service?.category || "",
        image: b.event?.image || b.service?.image || "",
      }));

    res.json({ reviews });
  } catch (e) {
    res.status(500).json({ error: e.message || "Failed to fetch reviews" });
  }
});

// Merchant: Get recent validations from the database
router.get("/validate/recent", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const Event = (await import("../models/Event.js")).default;
    const merchantEvents = await Event.find({ createdBy: req.user._id }).select("_id");
    const eventIds = merchantEvents.map(e => e._id);

    const bookings = await Booking.find({
      ticketValidated: true,
      $or: [
        { assignedTo: req.user._id },
        { event: { $in: eventIds } }
      ]
    })
    .populate("customer", "name email")
    .populate("event", "title datetime location price category createdBy")
    .sort({ ticketValidatedAt: -1 })
    .limit(10);

    const recentValidations = bookings.map(b => ({
      ticketId: b.ticketId,
      timestamp: b.ticketValidatedAt || new Date(),
      customerName: b.customer?.name || "Guest",
      eventTitle: b.event?.title || "Event",
      status: "used"
    }));

    res.json({ recentValidations });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch recent validations" });
  }
});

// Merchant: validate ticket by ticket ID
router.get("/validate/:ticketId", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId || ticketId.length > 30 || !/^TKT-\d+-[A-Z0-9]+$/i.test(ticketId)) {
      return res.status(400).json({ error: "Invalid Ticket ID format. Expected format: TKT-XXXXXXXXXXXXX-YYYYYYYY" });
    }
    
    // Find booking by ticket ID
    const booking = await Booking.findOne({ ticketId })
      .populate("customer", "name email")
      .populate("event", "title datetime location price category createdBy")
      .populate("assignedTo", "name email")
      .populate("ticketValidatedBy", "name email");
    
    if (!booking) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    // Only allow if:
    // 1. Booking is assigned to this merchant, OR
    // 2. The event was created by this merchant
    const isAssignedToMerchant = booking.assignedTo?._id?.toString() === req.user._id.toString()
      || booking.assignedTo?.toString() === req.user._id.toString();

    let isEventCreator = false;
    if (booking.event?.createdBy) {
      isEventCreator = booking.event.createdBy.toString() === req.user._id.toString();
    }
    
    if (!isAssignedToMerchant && !isEventCreator) {
      return res.status(403).json({ error: "Not authorized to validate this ticket. This ticket does not belong to your events." });
    }

    // Check if ticket has already been validated
    if (booking.ticketValidated) {
      return res.status(400).json({ 
        error: "Ticket already used",
        alreadyValidated: true,
        booking,
        validatedAt: booking.ticketValidatedAt,
        validatedBy: booking.ticketValidatedBy
      });
    }
    
    res.json({ 
      booking,
      alreadyValidated: false,
      validatedAt: null,
      validatedBy: null
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: Mark ticket as used/validated
router.post("/validate/:ticketId/mark-used", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const { ticketId } = req.params;
    if (!ticketId || ticketId.length > 30 || !/^TKT-\d+-[A-Z0-9]+$/i.test(ticketId)) {
      return res.status(400).json({ error: "Invalid Ticket ID format. Expected format: TKT-XXXXXXXXXXXXX-YYYYYYYY" });
    }
    
    // Find booking first to check ownership
    const existingBooking = await Booking.findOne({ ticketId })
      .populate("event", "title createdBy")
      .populate("assignedTo", "name email");

    if (!existingBooking) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Only allow if assigned to this merchant OR event created by this merchant
    const isAssignedToMerchant = existingBooking.assignedTo?._id?.toString() === req.user._id.toString()
      || existingBooking.assignedTo?.toString() === req.user._id.toString();

    let isEventCreator = false;
    if (existingBooking.event?.createdBy) {
      isEventCreator = existingBooking.event.createdBy.toString() === req.user._id.toString();
    }

    if (!isAssignedToMerchant && !isEventCreator) {
      return res.status(403).json({ error: "Not authorized to validate this ticket. This ticket does not belong to your events." });
    }

    if (existingBooking.ticketValidated) {
      return res.status(400).json({ error: "Ticket already used" });
    }

    // Mark as validated
    const booking = await Booking.findOneAndUpdate(
      { ticketId },
      {
        ticketValidated: true,
        ticketValidatedAt: new Date(),
        ticketValidatedBy: req.user._id
      },
      { new: true }
    )
      .populate("customer", "name email")
      .populate("event", "title datetime location price category createdBy")
      .populate("assignedTo", "name email")
      .populate("ticketValidatedBy", "name email");
    
    res.json({ 
      success: true,
      booking,
      message: "Ticket marked as used successfully"
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Admin: Process merchant payout
router.post("/:merchantId/process-payout", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { totalAmount, bookingIds, note } = req.body;

    // Validate merchant exists
    const merchant = await User.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({ error: "Merchant not found" });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ error: "Invalid payout amount" });
    }

    // Mark bookings as payout processed
    if (bookingIds && bookingIds.length > 0) {
      await Booking.updateMany(
        { _id: { $in: bookingIds } },
        { payoutProcessed: true, payoutProcessedAt: new Date() }
      );
    }

    // Generate a transaction reference
    const transactionId = `PAY-ADMIN-${Date.now()}`;

    // Create a Withdrawal record (status: completed) so merchant's availableBalance is credited
    const Withdrawal = (await import("../models/Withdrawal.js")).default;
    const withdrawal = await Withdrawal.create({
      merchant: merchantId,
      amount: totalAmount,
      status: "completed",
      bankDetails: { accountHolder: merchant.name, bankName: "Admin Processed", accountNumber: "N/A", ifscCode: "N/A" },
      requestedAt: new Date(),
      approvedAt: new Date(),
      completedAt: new Date(),
      transactionId
    });

    // Create a Transaction record for the merchant's history
    const Transaction = (await import("../models/Transaction.js")).default;
    await Transaction.create({
      merchant: merchantId,
      type: "withdrawal",
      amount: totalAmount,
      description: `Admin payout of ${formatCurrency(totalAmount)}${note ? ` — ${note}` : ""}`,
      status: "completed",
      relatedId: withdrawal._id.toString()
    });

    // Notify merchant
    await createNotification(
      merchantId,
      "Payout Credited ✅",
      `${formatCurrency(totalAmount)} has been credited to your account by admin. Transaction ID: ${transactionId}`,
      "booking",
      merchantId,
      "/merchant-dashboard/earnings"
    );

    res.json({ 
      success: true, 
      message: "Payout processed and credited to merchant successfully",
      merchant: merchant.name,
      amount: totalAmount,
      transactionId
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to process payout" });
  }
});


// Customer: Request cancellation of a booking
router.post("/:id/request-cancel", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    
    const terminalStatuses = ["completed", "cancelled", "rejected", "refunded"];
    if (terminalStatuses.includes(booking.status)) {
      return res.status(400).json({ error: "Cannot cancel a completed, cancelled or refunded booking" });
    }

    booking.previousStatus = booking.status;
    booking.status = "cancellation_requested";
    booking.cancellationRequestedAt = new Date();
    await booking.save();

    // Create notifications for assigned merchant or event creator
    const merchantId = booking.assignedTo;
    if (merchantId) {
      await createNotification(
        merchantId,
        "Cancellation Request received ⚠️",
        `A customer requested cancellation for booking ${booking.serviceName || booking.eventName}.`,
        "booking",
        booking._id,
        "/merchant-bookings"
      );
    }

    // Create notification for Admin
    try {
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await createNotification(
          admin._id,
          "User Cancellation Request",
          `User requested cancellation for booking ${booking.serviceName || booking.eventName}.`,
          "booking",
          booking._id,
          "/admin-dashboard/bookings"
        );
      }
    } catch (e) {}

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Merchant/Admin: Approve cancellation request and propose cancellation fee
router.post("/:id/approve-cancel", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Authorization: Must be admin, or the assigned merchant
    const isAdmin = req.user.role === "admin";
    const isMerchant = req.user.role === "merchant" && booking.assignedTo?.toString() === req.user._id.toString();
    if (!isAdmin && !isMerchant) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { cancellationFee } = req.body;
    const fee = Number(cancellationFee);
    if (isNaN(fee) || fee < 0 || fee > booking.price) {
      return res.status(400).json({ error: "Invalid cancellation fee" });
    }

    booking.status = "cancellation_fee_proposed";
    booking.cancellationFee = fee;
    booking.cancellationFeeProposedAt = new Date();
    await booking.save();

    // Notify customer
    await createNotification(
      booking.customer,
      "Cancellation Approved (Action Needed) 🎟️",
      `Your cancellation request for ${booking.serviceName || booking.eventName} was approved with a fee of ${formatCurrency(fee)}. Please accept the fee to process your refund.`,
      "booking",
      booking._id,
      "/my-requests"
    );

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Merchant/Admin: Reject cancellation request
router.post("/:id/reject-cancel", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isMerchant = req.user.role === "merchant" && booking.assignedTo?.toString() === req.user._id.toString();
    if (!isAdmin && !isMerchant) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Restore previous status
    booking.status = booking.previousStatus || "confirmed";
    booking.previousStatus = "";
    booking.cancellationFee = 0;
    await booking.save();

    // Notify customer
    await createNotification(
      booking.customer,
      "Cancellation Request Rejected ❌",
      `Your cancellation request for ${booking.serviceName || booking.eventName} was rejected. Your booking remains active.`,
      "booking",
      booking._id,
      "/my-requests"
    );

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Customer: Accept proposed cancellation fee
router.post("/:id/accept-cancellation-fee", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, customer: req.user._id });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.status !== "cancellation_fee_proposed") {
      return res.status(400).json({ error: "No cancellation fee is currently proposed for this booking" });
    }

    booking.status = "refund_pending";
    booking.cancellationAcceptedAt = new Date();
    await booking.save();

    // Notify merchant
    const merchantId = booking.assignedTo;
    if (merchantId) {
      await createNotification(
        merchantId,
        "Cancellation Fee Accepted ✅",
        `Customer accepted the cancellation fee for ${booking.serviceName || booking.eventName}. Please process the refund.`,
        "booking",
        booking._id,
        "/merchant-bookings"
      );
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Merchant/Admin: Process refund and deposit to user's wallet
router.post("/:id/process-refund", verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isMerchant = req.user.role === "merchant" && booking.assignedTo?.toString() === req.user._id.toString();
    if (!isAdmin && !isMerchant) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (booking.status !== "refund_pending") {
      return res.status(400).json({ error: "Refund is not pending for this booking" });
    }

    const refundAmount = Math.max(0, booking.price - (booking.cancellationFee || 0));

    booking.status = "refunded";
    booking.paymentStatus = "refunded";
    booking.refundAmount = refundAmount;
    booking.refundProcessedAt = new Date();
    await booking.save();

    // Add refund to customer's wallet balance
    const customer = await User.findById(booking.customer);
    if (customer) {
      customer.walletBalance = (customer.walletBalance || 0) + refundAmount;
      await customer.save();
    }

    // Create a Transaction record for customer's refund earning
    const Transaction = (await import("../models/Transaction.js")).default;
    await Transaction.create({
      merchant: booking.customer, // Using merchant field as userId or general transactions target
      booking: booking._id,
      type: "refund", // Refund type transaction
      amount: refundAmount,
      description: `Refund for cancelled booking: ${booking.serviceName || booking.eventName} (less cancellation fee)`,
      status: "completed",
      relatedId: `REFUND-${Date.now()}`
    });

    // Create Transaction records for merchant refund deduction to update merchant payout/earnings statistics in real time!
    if (booking.assignedTo && refundAmount > 0) {
      // Create a negative earning or deduction transaction for the merchant
      await Transaction.create({
        merchant: booking.assignedTo,
        booking: booking._id,
        type: "refund",
        amount: -refundAmount,
        description: `Refund deduction for cancelled booking: ${booking.serviceName || booking.eventName}`,
        status: "completed",
        relatedId: `REF-DED-${Date.now()}`
      });
    }

    // Notify customer
    await createNotification(
      booking.customer,
      "Refund Processed 💰",
      `A refund of ${formatCurrency(refundAmount)} has been credited to your wallet balance for ${booking.serviceName || booking.eventName}.`,
      "booking",
      booking._id,
      "/customer-dashboard"
    );

    res.json({ success: true, booking, refundAmount });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

export default router;
