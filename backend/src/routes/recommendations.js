import { Router } from "express";
import Booking from "../models/Booking.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreEvents(events, bookingHistory) {
  const bookedEventIds = new Set(bookingHistory.map(b => b.event?._id?.toString()).filter(Boolean));
  const categoryCounts = {};
  bookingHistory.forEach(b => {
    const cat = b.event?.category || b.service?.category;
    if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const hasHistory = topCategories.length > 0;

  return events
    .filter(e => !bookedEventIds.has(e._id?.toString()))
    .map(e => {
      let score = 0;
      const catIdx = topCategories.indexOf(e.category);
      if (catIdx === 0) score += 40;
      else if (catIdx === 1) score += 25;
      else if (catIdx >= 2) score += 10;
      if (e.isFeatured) score += 15;
      if (e.live) score += 20;
      const attendeeRatio = e.maxAttendees > 0 ? (e.attendeesCount || 0) / e.maxAttendees : 0;
      if (attendeeRatio > 0.7) score += 10;
      score += Math.random() * 5;

      let reason = "Trending event";
      if (hasHistory && catIdx >= 0) reason = `Based on your interest in ${e.category}`;
      else if (e.live) reason = "Happening live now";
      else if (e.isFeatured) reason = "Featured event";
      else if (attendeeRatio > 0.5) reason = "Popular with others";

      return { ...e, _score: score, _reason: reason };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 8);
}

// ── Customer: get AI recommendations ─────────────────────────────────────────
router.get("/customer", verifyToken, async (req, res) => {
  try {
    const bookingHistory = await Booking.find({ customer: req.user._id })
      .populate("event", "category title")
      .populate("service", "category name")
      .sort({ createdAt: -1 })
      .limit(20);

    const upcomingEvents = await Event.find({
      status: { $nin: ["cancelled", "completed"] },
      isSuspended: { $ne: true }
    })
      .populate("createdBy", "name")
      .sort({ isFeatured: -1, live: -1, datetime: 1 })
      .limit(60);

    const recommendations = scoreEvents(upcomingEvents.map(e => e.toObject()), bookingHistory);

    res.json({ recommendations, totalHistory: bookingHistory.length });
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// ── Merchant: get recommendations stats for their events ──────────────────────
router.get("/merchant", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const myEvents = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    const stats = myEvents.map(e => ({
      _id: e._id,
      title: e.title,
      category: e.category,
      datetime: e.datetime,
      attendeesCount: e.attendeesCount || 0,
      maxAttendees: e.maxAttendees || 0,
      isFeatured: e.isFeatured,
      live: e.live,
      status: e.status,
      estimatedReach: Math.floor((e.attendeesCount || 0) * 3.5 + Math.random() * 20),
    }));

    res.json({ stats, totalEvents: myEvents.length });
  } catch (err) {
    console.error("Merchant recommendations error:", err);
    res.status(500).json({ error: "Failed to fetch recommendation stats" });
  }
});

// ── Admin: view all recommendation activity ───────────────────────────────────
router.get("/admin", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const [events, totalCustomers, totalBookings] = await Promise.all([
      Event.find({ status: { $nin: ["cancelled"] } })
        .populate("createdBy", "name email")
        .sort({ attendeesCount: -1 })
        .limit(20),
      User.countDocuments({ role: "user" }),
      Booking.countDocuments({ status: { $in: ["confirmed", "paid", "completed"] } }),
    ]);

    const topRecommended = events.map(e => ({
      _id: e._id,
      title: e.title,
      category: e.category,
      merchant: e.createdBy?.name || "Unknown",
      merchantEmail: e.createdBy?.email,
      attendeesCount: e.attendeesCount || 0,
      maxAttendees: e.maxAttendees || 0,
      isFeatured: e.isFeatured,
      live: e.live,
      status: e.status,
      datetime: e.datetime,
      estimatedReach: Math.floor((e.attendeesCount || 0) * 3.5 + 10),
    }));

    res.json({ topRecommended, totalCustomers, totalBookings, totalEvents: events.length });
  } catch (err) {
    console.error("Admin recommendations error:", err);
    res.status(500).json({ error: "Failed to fetch admin recommendation data" });
  }
});

export default router;
