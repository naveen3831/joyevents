import { Router } from "express";
import Event from "../models/Event.js";
import Booking from "../models/Booking.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const router = Router();

// Public: list all events
router.get("/", async (_req, res) => {
  try {
    const events = await Event.find().populate("createdBy", "name email").sort({ createdAt: -1 });
    
    // Fetch average ratings and rating counts for all events
    const ratings = await Booking.aggregate([
      { $match: { event: { $ne: null }, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$event",
          averageRating: { $avg: "$rating.score" },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    const ratingsMap = {};
    ratings.forEach((r) => {
      ratingsMap[r._id.toString()] = {
        averageRating: Number(r.averageRating.toFixed(1)),
        ratingCount: r.ratingCount
      };
    });

    // Normalize tickets for all events and merge ratings
    const normalizedEvents = events.map((event) => {
      const eventObj = event.toObject();
      const ratingInfo = ratingsMap[eventObj._id.toString()] || { averageRating: 0, ratingCount: 0 };
      eventObj.averageRating = ratingInfo.averageRating;
      eventObj.ratingCount = ratingInfo.ratingCount;

      if (eventObj.eventType === "ticketed" && eventObj.tickets) {
        eventObj.tickets = eventObj.tickets.map((t) => ({
          type: t.type,
          price: t.price,
          available: t.available || 100, // Default to 100 if not set
          sold: t.sold || 0
        }));
      }
      return eventObj;
    });
    
    res.json({ events: normalizedEvents });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: list only their own events (must come before /:id route)
router.get("/my-events", verifyToken, requireRole("merchant", "admin"), async (req, res) => {
  try {

    // First try to get events with createdBy field
    let events = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    // If no events found with createdBy, check if there are legacy events without createdBy
    if (events.length === 0) {
      const allEvents = await Event.find({}).sort({ createdAt: -1 });

      // For now, if there are events without createdBy, return all events for this merchant
      // This is a temporary fix - in production you'd want to properly assign ownership
      const eventsWithoutCreatedBy = allEvents.filter(event => !event.createdBy);

      if (req.user.role === "merchant" && eventsWithoutCreatedBy.length > 0) {
        // Temporarily return all events without createdBy
        events = eventsWithoutCreatedBy;
      }
    }

    // Fetch average ratings and rating counts for all events
    const ratings = await Booking.aggregate([
      { $match: { event: { $ne: null }, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$event",
          averageRating: { $avg: "$rating.score" },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    const ratingsMap = {};
    ratings.forEach((r) => {
      ratingsMap[r._id.toString()] = {
        averageRating: Number(r.averageRating.toFixed(1)),
        ratingCount: r.ratingCount
      };
    });

    // Normalize tickets for all events and merge ratings
    const normalizedEvents = events.map((event) => {
      const eventObj = event.toObject();
      const ratingInfo = ratingsMap[eventObj._id.toString()] || { averageRating: 0, ratingCount: 0 };
      eventObj.averageRating = ratingInfo.averageRating;
      eventObj.ratingCount = ratingInfo.ratingCount;

      if (eventObj.eventType === "ticketed" && eventObj.tickets) {
        eventObj.tickets = eventObj.tickets.map((t) => ({
          type: t.type,
          price: t.price,
          available: t.available || 100, // Default to 100 if not set
          sold: t.sold || 0
        }));
      }
      return eventObj;
    });

    res.json({ events: normalizedEvents });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Public: get events by merchant ID
router.get("/merchant/:merchantId", async (req, res) => {
  try {
    const events = await Event.find({ createdBy: req.params.merchantId }).sort({ createdAt: -1 });
    
    // Fetch average ratings and rating counts for all events
    const ratings = await Booking.aggregate([
      { $match: { event: { $ne: null }, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$event",
          averageRating: { $avg: "$rating.score" },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    const ratingsMap = {};
    ratings.forEach((r) => {
      ratingsMap[r._id.toString()] = {
        averageRating: Number(r.averageRating.toFixed(1)),
        ratingCount: r.ratingCount
      };
    });

    // Normalize tickets for all events and merge ratings
    const normalizedEvents = events.map((event) => {
      const eventObj = event.toObject();
      const ratingInfo = ratingsMap[eventObj._id.toString()] || { averageRating: 0, ratingCount: 0 };
      eventObj.averageRating = ratingInfo.averageRating;
      eventObj.ratingCount = ratingInfo.ratingCount;

      if (eventObj.eventType === "ticketed" && eventObj.tickets) {
        eventObj.tickets = eventObj.tickets.map((t) => ({
          type: t.type,
          price: t.price,
          available: t.available || 100,
          sold: t.sold || 0
        }));
      }
      return eventObj;
    });
    
    res.json(normalizedEvents);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Public: get single event by ID (must come after /my-events)
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate("createdBy", "name email");
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    const eventObj = event.toObject();

    // Fetch average ratings and rating counts for this single event
    const ratings = await Booking.aggregate([
      { $match: { event: event._id, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$event",
          averageRating: { $avg: "$rating.score" },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    if (ratings.length > 0) {
      eventObj.averageRating = Number(ratings[0].averageRating.toFixed(1));
      eventObj.ratingCount = ratings[0].ratingCount;
    } else {
      eventObj.averageRating = 0;
      eventObj.ratingCount = 0;
    }

    // Ensure tickets have proper structure
    if (eventObj.eventType === "ticketed" && eventObj.tickets) {
      eventObj.tickets = eventObj.tickets.map((t) => ({
        type: t.type,
        price: t.price,
        available: t.available || 100, // Default to 100 if not set
        sold: t.sold || 0
      }));
    }
    
    res.json({ event: eventObj });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Temporary migration endpoint to assign ownership of legacy events
router.post("/assign-legacy-events", verifyToken, requireRole("merchant"), async (req, res) => {
  try {

    // Find events without createdBy
    const legacyEvents = await Event.find({ createdBy: { $exists: false } });

    if (legacyEvents.length > 0) {
      // Assign all legacy events to this merchant
      const result = await Event.updateMany(
        { createdBy: { $exists: false } },
        { $set: { createdBy: req.user._id } }
      );


      res.json({
        message: `Assigned ${result.modifiedCount} legacy events to your account`,
        updatedCount: result.modifiedCount
      });
    } else {
      res.json({
        message: "No legacy events found to assign",
        updatedCount: 0
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});
router.get("/debug-events", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const allEvents = await Event.find({}).sort({ createdAt: -1 });
    const myEvents = await Event.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    res.json({
      totalEvents: allEvents.length,
      myEvents: myEvents.length,
      userId: req.user._id,
      sampleEvents: allEvents.slice(0, 3).map(e => ({
        _id: e._id,
        title: e.title,
        createdBy: e.createdBy,
        hasCreatedBy: !!e.createdBy
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin & Merchant: create event (with optional image and gallery images)
router.post("/", verifyToken, requireRole("merchant", "admin"), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), async (req, res) => {
  try {
    const { title, description, date, time, location, price, category, status, eventType, tickets, hasMultipleSessions, sessions, maxAttendees } = req.body || {};
    if (!title || !date || !time || !location) return res.status(400).json({ error: "Missing fields" });
    
    if (req.user.role === "merchant") {
      if (req.user.merchantStatus !== "active") {
        return res.status(403).json({ error: "Your account must be activated by the administrator to create events." });
      }
      const count = await Event.countDocuments({ createdBy: req.user._id });
      const max = req.user.maxEvents || 5;
      if (count >= max) {
        return res.status(400).json({ error: `Event limit reached. You can only add up to ${max} events. Please raise a ticket to request more.` });
      }
    }
    
    if (title.trim().length > 100) return res.status(400).json({ error: "Event title cannot exceed 100 characters" });
    if (description && description.trim().length > 1000) return res.status(400).json({ error: "Event description cannot exceed 1000 characters" });
    if (location.trim().length > 150) return res.status(400).json({ error: "Event location cannot exceed 150 characters" });
    if (category && category.trim().length > 50) return res.status(400).json({ error: "Category cannot exceed 50 characters" });

    const dt = new Date(`${date}T${time}`);
    if (isNaN(dt.getTime())) return res.status(400).json({ error: "Invalid date/time" });

    // Upload main image to Cloudinary
    let imageUrl = "";
    if (req.files && req.files.image && req.files.image[0]) {
      const cloudinaryResult = await uploadToCloudinary(req.files.image[0].buffer, 'events');
      imageUrl = cloudinaryResult.url;
    }

    // Upload gallery images to Cloudinary
    let galleryUrls = [];
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map(file => uploadToCloudinary(file.buffer, 'events/gallery'));
      const results = await Promise.all(uploadPromises);
      galleryUrls = results.map(r => r.url);
    }

    const eventData = {
      title,
      description: description || "",
      datetime: dt,
      location,
      price: price || 0,
      category: category || "General",
      status: status || "upcoming",
      image: imageUrl,
      gallery: galleryUrls,
      createdBy: req.user._id,
      eventType: eventType || "fullService",
      maxAttendees: eventType === "fullService" ? (parseInt(maxAttendees) || 0) : 0,
      attendeesCount: 0
    };

    // Add tickets if it's a ticketed event
    if (eventType === "ticketed") {
      if (hasMultipleSessions === 'true' && sessions) {
        // Day/Night sessions
        try {
          const parsedSessions = typeof sessions === 'string' ? JSON.parse(sessions) : sessions;
          eventData.hasMultipleSessions = true;
          eventData.sessions = {
            day: {
              enabled: true,
              time: parsedSessions.day.time,
              tickets: parsedSessions.day.tickets.map((t) => ({
                type: t.type,
                price: t.price,
                available: t.available || 100,
                sold: 0
              }))
            },
            night: {
              enabled: true,
              time: parsedSessions.night.time,
              tickets: parsedSessions.night.tickets.map((t) => ({
                type: t.type,
                price: t.price,
                available: t.available || 100,
                sold: 0
              }))
            }
          };
        } catch (e) {
        }
      } else if (tickets) {
        // Single session (legacy)
        try {
          const parsedTickets = typeof tickets === 'string' ? JSON.parse(tickets) : tickets;
          eventData.hasMultipleSessions = false;
          eventData.tickets = parsedTickets.map((t) => ({
            type: t.type,
            price: t.price,
            available: t.available || 100,
            sold: 0
          }));
        } catch (e) {
        }
      }
    }

    const event = await Event.create(eventData);
    res.status(201).json({ event });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin & Merchant: update event (with optional image and gallery images)
router.patch("/:id", verifyToken, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), async (req, res) => {
  try {

    const { title, description, date, time, location, price, category, status, live, isSuspended, isFeatured, qrCodeCustomUrl, qrCodeActive, eventType, tickets, hasMultipleSessions, sessions, maxAttendees } = req.body || {};
    const update = {};
    if (title !== undefined) {
      if (title.trim().length > 100) return res.status(400).json({ error: "Event title cannot exceed 100 characters" });
      update.title = title;
    }
    if (description !== undefined) {
      if (description.trim().length > 1000) return res.status(400).json({ error: "Event description cannot exceed 1000 characters" });
      update.description = description;
    }
    if (location !== undefined) {
      if (location.trim().length > 150) return res.status(400).json({ error: "Event location cannot exceed 150 characters" });
      update.location = location;
    }
    if (category !== undefined) {
      if (category.trim().length > 50) return res.status(400).json({ error: "Category cannot exceed 50 characters" });
      update.category = category;
    }
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ error: "Price must be a valid number" });
      }
      update.price = numPrice;
    }
    if (status !== undefined) update.status = status;
    if (live !== undefined) update.live = live;
    if (isSuspended !== undefined) update.isSuspended = isSuspended;
    if (isFeatured !== undefined) update.isFeatured = isFeatured;
    if (qrCodeCustomUrl !== undefined) {
      if (qrCodeCustomUrl !== "") {
        const trimmed = qrCodeCustomUrl.trim();
        if (trimmed.length > 2048) {
          return res.status(400).json({ error: "Destination URL cannot exceed 2048 characters" });
        }
        const isRelative = trimmed.startsWith("/");
        const isValid = isRelative || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .%-]*)*\/?$/i.test(trimmed);
        if (!isValid) {
          return res.status(400).json({ error: "Invalid QR Destination URL format" });
        }
        update.qrCodeCustomUrl = trimmed;
      } else {
        update.qrCodeCustomUrl = "";
      }
    }
    if (qrCodeActive !== undefined) update.qrCodeActive = qrCodeActive;
    if (eventType !== undefined) {
      update.eventType = eventType;
      if (eventType === "fullService") {
        update.hasMultipleSessions = false;
        update.sessions = { day: { enabled: false, tickets: [] }, night: { enabled: false, tickets: [] } };
        update.tickets = [];
      }
    }
    if (maxAttendees !== undefined && (eventType === "fullService" || eventType === undefined)) update.maxAttendees = parseInt(maxAttendees) || 0;


    // Upload new main image to Cloudinary if provided
    if (req.files && req.files.image && req.files.image[0]) {
      const cloudinaryResult = await uploadToCloudinary(req.files.image[0].buffer, 'events');
      update.image = cloudinaryResult.url;
    }

    // Upload new gallery images to Cloudinary if provided
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map(file => uploadToCloudinary(file.buffer, 'events/gallery'));
      const results = await Promise.all(uploadPromises);
      update.gallery = results.map(r => r.url);
    }

    if (date !== undefined || time !== undefined) {
      const d = date || new Date().toISOString().slice(0, 10);
      const t = time || "00:00";
      const dt = new Date(`${d}T${t}`);
      if (isNaN(dt.getTime())) return res.status(400).json({ error: "Invalid date/time" });
      update.datetime = dt;
    }

    // Handle tickets/sessions update for ticketed events
    if (eventType === "ticketed") {
      const currentEvent = await Event.findById(req.params.id);
      if (!currentEvent) return res.status(404).json({ error: "Event not found" });

      if (hasMultipleSessions === 'true' && sessions) {
        // Day/Night sessions
        try {
          const parsedSessions = typeof sessions === 'string' ? JSON.parse(sessions) : sessions;
          
          // Preserve sold counts from existing sessions
          const preserveSoldCounts = (newTickets, existingTickets) => {
            return newTickets.map((newTicket) => {
              const existingTicket = existingTickets?.find((t) => t.type === newTicket.type);
              return {
                type: newTicket.type,
                price: newTicket.price,
                available: newTicket.available || 100,
                sold: existingTicket ? (existingTicket.sold || 0) : 0
              };
            });
          };

          update.hasMultipleSessions = true;
          update.sessions = {
            day: {
              enabled: true,
              time: parsedSessions.day.time,
              tickets: preserveSoldCounts(parsedSessions.day.tickets, currentEvent.sessions?.day?.tickets)
            },
            night: {
              enabled: true,
              time: parsedSessions.night.time,
              tickets: preserveSoldCounts(parsedSessions.night.tickets, currentEvent.sessions?.night?.tickets)
            }
          };
        } catch (e) {
        }
      } else if (tickets) {
        // Single session (legacy)
        try {
          const parsedTickets = typeof tickets === 'string' ? JSON.parse(tickets) : tickets;
          
          // Preserve sold counts from existing tickets
          const updatedTickets = parsedTickets.map((newTicket) => {
            const existingTicket = currentEvent.tickets?.find((t) => t.type === newTicket.type);
            return {
              type: newTicket.type,
              price: newTicket.price,
              available: newTicket.available || 100,
              sold: existingTicket ? (existingTicket.sold || 0) : 0
            };
          });
          update.hasMultipleSessions = false;
          update.tickets = updatedTickets;
        } catch (e) {
        }
      }
    }

    // Check if user is admin or the creator of the event
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });


    // For live status updates, allow any merchant to toggle
    // For other updates, require admin or creator
    const isLiveUpdateOnly = Object.keys(update).length === 1 && 'live' in update;

    if (req.user.role !== "admin" && event.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to update this event" });
    }

    const updatedEvent = await Event.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ event: updatedEvent });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin & Merchant: delete event
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Allow admin or event creator to delete
    if (req.user.role !== "admin" && event.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this event" });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: update ticket availability
router.patch("/:id/tickets/:ticketType", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const { id, ticketType } = req.params;
    const { available } = req.body;


    // Validate input
    if (available === undefined || available === null) {
      return res.status(400).json({ error: "Available quantity is required" });
    }

    if (available < 0) {
      return res.status(400).json({ error: "Available quantity cannot be negative" });
    }

    // Find event
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Check authorization - only merchant who created the event can update
    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to update this event" });
    }

    // Check if event is ticketed
    if (event.eventType !== "ticketed") {
      return res.status(400).json({ error: "This event is not a ticketed event" });
    }

    // Find and update the ticket
    const ticketIndex = event.tickets.findIndex(t => t.type === ticketType);
    if (ticketIndex === -1) {
      return res.status(404).json({ error: "Ticket type not found" });
    }

    // Update available quantity
    event.tickets[ticketIndex].available = available;
    await event.save();

    res.json({ 
      message: "Ticket availability updated",
      event,
      updatedTicket: event.tickets[ticketIndex]
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Admin: delete all admin-created events
router.delete("/admin-events", verifyToken, requireRole("admin"), async (req, res) => {
  try {

    // Find all admin users
    const User = (await import("../models/User.js")).default;
    const adminUsers = await User.find({ role: "admin" });
    const adminIds = adminUsers.map(admin => admin._id);


    // Find events created by admins
    const adminEvents = await Event.find({ createdBy: { $in: adminIds } });

    if (adminEvents.length > 0) {
      // Delete all admin-created events
      const result = await Event.deleteMany({ createdBy: { $in: adminIds } });

      res.json({
        message: `Successfully deleted ${result.deletedCount} admin-created events`,
        deletedCount: result.deletedCount
      });
    } else {
      res.json({
        message: "No admin-created events found to delete",
        deletedCount: 0
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
