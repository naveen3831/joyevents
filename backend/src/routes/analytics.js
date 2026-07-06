import { Router } from "express";
import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

// Merchant: Get event analytics
router.get("/events", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;

    if (!merchantId) {
      return res.status(401).json({ error: "Unauthorized - no merchant ID" });
    }

    // Get all events created by this merchant
    const events = await Event.find({ createdBy: merchantId }).lean();

    if (events.length === 0) {
      return res.json({
        totalEvents: 0,
        totalTicketsSold: 0,
        totalEventRevenue: 0,
        totalAttendees: 0,
        events: []
      });
    }

    const eventIds = events.map(e => e._id);

    // Get all bookings for these events
    const bookings = await Booking.find({
      event: { $in: eventIds },
      $or: [
        { status: "completed", paymentStatus: "paid" },
        { status: "confirmed", paymentStatus: "paid" },
        { status: "paid", paymentStatus: "paid" }
      ]
    }).lean();


    // Calculate analytics per event
    const eventAnalytics = events.map(event => {
      const eventIdStr = event._id.toString();
      const eventBookings = bookings.filter(b => {
        if (!b.event) return false;
        const bookingEventId = typeof b.event === 'string' ? b.event : b.event.toString();
        return bookingEventId === eventIdStr;
      });
      
      // Calculate tickets sold
      let ticketsSold = 0;
      let revenue = 0;

      eventBookings.forEach(booking => {
        // For ticketed events, count ticket quantity
        if (event.eventType === "ticketed") {
          // Use quantity field or selectedTickets count
          if (booking.quantity) {
            ticketsSold += booking.quantity;
          } else if (booking.selectedTickets && Object.keys(booking.selectedTickets).length > 0) {
            // Sum up all selected tickets
            let totalTickets = 0;
            Object.values(booking.selectedTickets).forEach((count) => {
              totalTickets += count;
            });
            ticketsSold += totalTickets;
          } else {
            ticketsSold += 1;
          }
        } else {
          // For full service events, count as 1 per booking
          ticketsSold += 1;
        }
        
        // Add to revenue
        revenue += booking.price;
      });

      return {
        _id: event._id,
        title: event.title,
        ticketsSold,
        revenue: Math.round(revenue * 100) / 100,
        attendees: eventBookings.length,
        eventType: event.eventType || "fullService",
        status: event.status || "upcoming"
      };
    });

    // Calculate totals
    const totalTicketsSold = eventAnalytics.reduce((sum, e) => sum + e.ticketsSold, 0);
    const totalEventRevenue = eventAnalytics.reduce((sum, e) => sum + e.revenue, 0);
    const totalAttendees = eventAnalytics.reduce((sum, e) => sum + e.attendees, 0);


    res.json({
      totalEvents: events.length,
      totalTicketsSold,
      totalEventRevenue: Math.round(totalEventRevenue * 100) / 100,
      totalAttendees,
      events: eventAnalytics.sort((a, b) => b.revenue - a.revenue)
    });
  } catch (error) {
    res.status(500).json({ 
      error: "Failed to fetch event analytics", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
