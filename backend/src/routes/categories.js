import { Router } from "express";
import Category from "../models/Category.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { upload } from "../utils/upload.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const router = Router();

// Get all categories, optionally filtered by type
router.get("/", async (req, res) => {
    try {
        const { type } = req.query;
        const q = type ? { type } : {};
        const categories = await Category.find(q).sort({ name: 1 });
        res.json({ categories });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Admin & Merchant: create category
router.post("/", verifyToken, upload.single("image"), async (req, res) => {
    try {
        if (req.user.role !== "admin" && req.user.role !== "merchant") {
            return res.status(403).json({ error: "Only admin and merchants can create categories" });
        }

        const { name, type } = req.body;
        if (!name || !type) return res.status(400).json({ error: "Name and type are required" });
        
        let imageUrl = "";
        let imagePublicId = "";
        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'joyevents/categories');
            imageUrl = result.url;
            imagePublicId = result.public_id;
        }

        const category = await Category.create({
            name: name.trim(),
            type,
            imageUrl,
            imagePublicId
        });
        res.status(201).json({ category });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Category already exists for this type" });
        res.status(500).json({ error: "Server error" });
    }
});

// Admin & Merchant: update category
router.patch("/:id", verifyToken, upload.single("image"), async (req, res) => {
    try {
        if (req.user.role !== "admin" && req.user.role !== "merchant") {
            return res.status(403).json({ error: "Only admin and merchants can update categories" });
        }

        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ error: "Category not found" });

        const { name, type } = req.body || {};
        const updates = {};
        if (name) updates.name = name.trim();
        if (type) updates.type = type;

        if (req.file) {
            const result = await uploadToCloudinary(req.file.buffer, 'joyevents/categories');
            updates.imageUrl = result.url;
            updates.imagePublicId = result.public_id;
        }

        const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updates, { new: true });

        if (category.imagePublicId && updates.imagePublicId && category.imagePublicId !== updates.imagePublicId) {
            deleteFromCloudinary(category.imagePublicId).catch(() => {});
        }

        res.json({ category: updatedCategory });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

// Admin: delete category
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ error: "Category not found" });

        if (category.imagePublicId) {
            deleteFromCloudinary(category.imagePublicId).catch(() => {});
        }

        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

export default router;

