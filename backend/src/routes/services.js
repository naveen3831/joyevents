import { Router } from "express";
import Service from "../models/Service.js";
import Booking from "../models/Booking.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";

const router = Router();

// Public: list all active services
router.get("/", async (_req, res) => {
  try {
    const services = await Service.find().populate("createdBy", "name email").sort({ createdAt: -1 });

    // Fetch average ratings and rating counts for all services
    const ratings = await Booking.aggregate([
      { $match: { service: { $ne: null }, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$service",
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

    const servicesWithRatings = services.map((service) => {
      const serviceObj = service.toObject();
      const ratingInfo = ratingsMap[serviceObj._id.toString()] || { averageRating: 0, ratingCount: 0 };
      serviceObj.averageRating = ratingInfo.averageRating;
      serviceObj.ratingCount = ratingInfo.ratingCount;
      return serviceObj;
    });

    res.json({ services: servicesWithRatings });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant: list only their own services
router.get("/my-services", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    const services = await Service.find({ createdBy: req.user._id }).sort({ createdAt: -1 });

    // Fetch average ratings and rating counts for all services
    const ratings = await Booking.aggregate([
      { $match: { service: { $ne: null }, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$service",
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

    const servicesWithRatings = services.map((service) => {
      const serviceObj = service.toObject();
      const ratingInfo = ratingsMap[serviceObj._id.toString()] || { averageRating: 0, ratingCount: 0 };
      serviceObj.averageRating = ratingInfo.averageRating;
      serviceObj.ratingCount = ratingInfo.ratingCount;
      return serviceObj;
    });

    res.json({ services: servicesWithRatings });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Public: get services by merchant ID
router.get("/merchant/:merchantId", async (req, res) => {
  try {
    const services = await Service.find({ createdBy: req.params.merchantId }).sort({ createdAt: -1 });

    // Fetch average ratings and rating counts for all services
    const ratings = await Booking.aggregate([
      { $match: { service: { $ne: null }, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$service",
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

    const servicesWithRatings = services.map((service) => {
      const serviceObj = service.toObject();
      const ratingInfo = ratingsMap[serviceObj._id.toString()] || { averageRating: 0, ratingCount: 0 };
      serviceObj.averageRating = ratingInfo.averageRating;
      serviceObj.ratingCount = ratingInfo.ratingCount;
      return serviceObj;
    });

    res.json(servicesWithRatings);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Temporary migration endpoint to assign ownership of legacy services
router.post("/assign-legacy-services", verifyToken, requireRole("merchant"), async (req, res) => {
  try {
    
    // Find services without createdBy
    const legacyServices = await Service.find({ createdBy: { $exists: false } });
    
    if (legacyServices.length > 0) {
      // Assign all legacy services to this merchant
      const result = await Service.updateMany(
        { createdBy: { $exists: false } },
        { $set: { createdBy: req.user._id } }
      );
      
      
      res.json({ 
        message: `Assigned ${result.modifiedCount} legacy services to your account`,
        updatedCount: result.modifiedCount
      });
    } else {
      res.json({ 
        message: "No legacy services found to assign",
        updatedCount: 0
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Public: get single service by ID
router.get("/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate("createdBy", "name email");
    if (!service) return res.status(404).json({ error: "Service not found" });

    const serviceObj = service.toObject();

    // Fetch average ratings and rating counts for this single service
    const ratings = await Booking.aggregate([
      { $match: { service: service._id, "rating.score": { $exists: true, $ne: null } } },
      {
        $group: {
          _id: "$service",
          averageRating: { $avg: "$rating.score" },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    if (ratings.length > 0) {
      serviceObj.averageRating = Number(ratings[0].averageRating.toFixed(1));
      serviceObj.ratingCount = ratings[0].ratingCount;
    } else {
      serviceObj.averageRating = 0;
      serviceObj.ratingCount = 0;
    }

    res.json({ service: serviceObj });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant/Admin: create service (with optional image and gallery images)
router.post("/", verifyToken, requireRole("merchant", "admin"), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), async (req, res) => {
  try {
    const { name, description, price, category, highlights, active } = req.body || {};
    if (!name || !price) return res.status(400).json({ error: "name and price are required" });

    if (req.user.role === "merchant") {
      if (req.user.merchantStatus !== "active") {
        return res.status(403).json({ error: "Your account must be activated by the administrator to create services." });
      }
      const count = await Service.countDocuments({ createdBy: req.user._id });
      const max = req.user.maxServices || 5;
      if (count >= max) {
        return res.status(400).json({ error: `Service limit reached. You can only add up to ${max} services. Please raise a ticket to request more.` });
      }
    }
    
    if (name.length > 100) return res.status(400).json({ error: "Name cannot exceed 100 characters" });
    if (description && description.length > 1000) return res.status(400).json({ error: "Description cannot exceed 1000 characters" });
    if (category && category.length > 50) return res.status(400).json({ error: "Category cannot exceed 50 characters" });
    if (highlights && highlights.length > 200) return res.status(400).json({ error: "Highlights cannot exceed 200 characters" });
    
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 1 || !Number.isInteger(numPrice)) {
      return res.status(400).json({ error: "Price must be a whole number of 1 or greater" });
    }

    // Upload main image to Cloudinary
    let imageUrl = "";
    if (req.files && req.files.image && req.files.image[0]) {
      const cloudinaryResult = await uploadToCloudinary(req.files.image[0].buffer, 'services');
      imageUrl = cloudinaryResult.url;
    }
    
    // Upload gallery images to Cloudinary
    let galleryUrls = [];
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map(file => uploadToCloudinary(file.buffer, 'services/gallery'));
      const results = await Promise.all(uploadPromises);
      galleryUrls = results.map(r => r.url);
    }
    
    let parsedHighlights = [];
    if (highlights) {
      try { parsedHighlights = JSON.parse(highlights); } catch { parsedHighlights = [highlights]; }
    }
    let parsedAddOns = [];
    if (req.body.addOns) {
      try { 
        parsedAddOns = JSON.parse(req.body.addOns); 
        for (const addon of parsedAddOns) {
          if (addon.name) {
            if (addon.name.length > 100) {
              return res.status(400).json({ error: "Add-on name cannot exceed 100 characters" });
            }
            const addonPrice = Number(addon.price);
            if (isNaN(addonPrice) || addonPrice < 1 || !Number.isInteger(addonPrice)) {
              return res.status(400).json({ error: `Price for add-on "${addon.name}" must be a whole number of 1 or greater` });
            }
          }
        }
      } catch { 
        parsedAddOns = []; 
      }
    }
    const service = await Service.create({
      name,
      description: description || "",
      price: numPrice,
      category: category || "General",
      highlights: parsedHighlights,
      image: imageUrl,
      gallery: galleryUrls,
      active: active !== "false",
      addOns: parsedAddOns,
      createdBy: req.user._id
    });
    res.status(201).json({ service });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant/Admin: update service (with optional image and gallery images)
router.patch("/:id", verifyToken, requireRole("merchant", "admin"), upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'gallery', maxCount: 4 }
]), async (req, res) => {
  try {
    const { name, description, price, category, highlights, active, qrCodeCustomUrl, qrCodeActive } = req.body || {};
    const update = {};
    if (name !== undefined) {
      if (name.length > 100) return res.status(400).json({ error: "Name cannot exceed 100 characters" });
      update.name = name;
    }
    if (description !== undefined) {
      if (description.length > 1000) return res.status(400).json({ error: "Description cannot exceed 1000 characters" });
      update.description = description;
    }
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice < 1 || !Number.isInteger(numPrice)) {
        return res.status(400).json({ error: "Price must be a whole number of 1 or greater" });
      }
      update.price = numPrice;
    }
    if (category !== undefined) {
      if (category.length > 50) return res.status(400).json({ error: "Category cannot exceed 50 characters" });
      update.category = category;
    }
    if (active !== undefined)      update.active = active !== "false";
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
    
    // Upload new main image to Cloudinary if provided
    if (req.files && req.files.image && req.files.image[0]) {
      const cloudinaryResult = await uploadToCloudinary(req.files.image[0].buffer, 'services');
      update.image = cloudinaryResult.url;
    }
    
    // Upload new gallery images to Cloudinary if provided
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const uploadPromises = req.files.gallery.map(file => uploadToCloudinary(file.buffer, 'services/gallery'));
      const results = await Promise.all(uploadPromises);
      update.gallery = results.map(r => r.url);
    }
    
    if (highlights !== undefined) {
      if (highlights.length > 200) return res.status(400).json({ error: "Highlights cannot exceed 200 characters" });
      try { update.highlights = JSON.parse(highlights); } catch { update.highlights = [highlights]; }
    }
    if (req.body.addOns !== undefined) {
      try { 
        const parsedAddOns = JSON.parse(req.body.addOns); 
        for (const addon of parsedAddOns) {
          if (addon.name) {
            if (addon.name.length > 100) {
              return res.status(400).json({ error: "Add-on name cannot exceed 100 characters" });
            }
            const addonPrice = Number(addon.price);
            if (isNaN(addonPrice) || addonPrice < 1 || !Number.isInteger(addonPrice)) {
              return res.status(400).json({ error: `Price for add-on "${addon.name}" must be a whole number of 1 or greater` });
            }
          }
        }
        update.addOns = parsedAddOns;
      } catch { 
        update.addOns = []; 
      }
    }
    
    // Find service and check ownership
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });
    
    // Check if user is admin or owner of the service
    if (req.user.role !== "admin" && service.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to update this service" });
    }
    
    const updatedService = await Service.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ service: updatedService });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Merchant/Admin: delete service
router.delete("/:id", verifyToken, requireRole("merchant", "admin"), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: "Service not found" });
    
    // Check if user is admin or owner of the service
    if (req.user.role !== "admin" && service.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this service" });
    }
    
    await Service.findByIdAndDelete(req.params.id);
    res.json({ message: "Service deleted" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
