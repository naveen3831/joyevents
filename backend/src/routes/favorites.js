import { Router } from "express";
import Favorite from "../models/Favorite.js";
import Event from "../models/Event.js";
import Service from "../models/Service.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

// Get user's favorites
router.get("/", verifyToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate("event")
      .populate("service")
      .sort({ createdAt: -1 });
    
    res.json({ favorites });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Add to favorites
router.post("/", verifyToken, async (req, res) => {
  try {
    const { eventId, serviceId, type } = req.body;

    if (!eventId && !serviceId) {
      return res.status(400).json({ error: "Event ID or Service ID is required" });
    }

    if (!type || !["event", "service"].includes(type)) {
      return res.status(400).json({ error: "Type must be 'event' or 'service'" });
    }

    // Check if item exists
    if (type === "event") {
      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ error: "Event not found" });
    } else {
      const service = await Service.findById(serviceId);
      if (!service) return res.status(404).json({ error: "Service not found" });
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: req.user._id,
      [type]: type === "event" ? eventId : serviceId
    });

    if (existing) {
      return res.status(400).json({ error: "Already in favorites" });
    }

    const favorite = await Favorite.create({
      user: req.user._id,
      event: type === "event" ? eventId : null,
      service: type === "service" ? serviceId : null,
      type
    });

    res.status(201).json({ favorite });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Remove from favorites
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const favorite = await Favorite.findById(req.params.id);
    
    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    if (favorite.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await Favorite.findByIdAndDelete(req.params.id);
    res.json({ message: "Removed from favorites" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Check if item is favorited
router.get("/check/:type/:id", verifyToken, async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!["event", "service"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const favorite = await Favorite.findOne({
      user: req.user._id,
      [type]: id
    });

    res.json({ isFavorited: !!favorite, favoriteId: favorite?._id });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
