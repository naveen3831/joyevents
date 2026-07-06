import { Router } from "express";
import Category from "../models/Category.js";
import { verifyToken, requireRole } from "../middleware/auth.js";

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
router.post("/", verifyToken, async (req, res) => {
    try {
        // Allow admin and merchant roles
        if (req.user.role !== "admin" && req.user.role !== "merchant") {
            return res.status(403).json({ error: "Only admin and merchants can create categories" });
        }

        const { name, type } = req.body;
        if (!name || !type) return res.status(400).json({ error: "Name and type are required" });
        
        const category = await Category.create({ name, type });
        res.status(201).json({ category });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ error: "Category already exists for this type" });
        res.status(500).json({ error: "Server error" });
    }
});

// Admin: delete category
router.delete("/:id", verifyToken, requireRole("admin"), async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ error: "Category not found" });
        res.json({ message: "Category deleted" });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
