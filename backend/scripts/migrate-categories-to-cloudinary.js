import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../src/config/db.js";
import Category from "../src/models/Category.js";
import { uploadToCloudinary } from "../src/utils/cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Category images directory in mobile workspace
const categoriesAssetsDir = path.resolve(__dirname, "../../mobile/assets/images/categories");

// Mapping of asset filenames to category names and types
const categoryMappings = [
  { fileName: "music.jpg", name: "Music", type: "event" },
  { fileName: "wedding.jpg", name: "Wedding", type: "event" },
  { fileName: "corporate.jpg", name: "Corporate", type: "event" },
  { fileName: "catering.jpg", name: "Catering", type: "service" },
  { fileName: "photography.jpg", name: "Photography", type: "service" },
  { fileName: "birthday.jpg", name: "Birthday", type: "event" },
  { fileName: "all.jpg", name: "All", type: "event" },
  { fileName: "sports.jpg", name: "Sports", type: "event" },
  { fileName: "cricket.jpg", name: "Cricket", type: "event" },
  { fileName: "festival.jpg", name: "Festival", type: "event" },
  { fileName: "decoration.jpg", name: "Decoration", type: "service" },
  { fileName: "venue.jpg", name: "Venue", type: "service" },
  { fileName: "makeup.jpg", name: "Makeup", type: "service" },
  { fileName: "transport.jpg", name: "Transport", type: "service" }
];

async function runMigration() {
  try {
    console.log("🚀 Starting Cloudinary Category Migration Script...");
    await connectDB();

    for (const item of categoryMappings) {
      const filePath = path.join(categoriesAssetsDir, item.fileName);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Asset file not found: ${item.fileName}, skipping...`);
        continue;
      }

      // Check if Category already exists in DB
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${item.name.trim()}$`, "i") }
      });

      // Skip if already contains a valid Cloudinary URL
      if (category && category.imageUrl && category.imageUrl.includes("cloudinary.com")) {
        console.log(`✅ Category "${item.name}" already has Cloudinary URL (${category.imageUrl}), skipping duplicate upload.`);
        continue;
      }

      console.log(`📤 Uploading "${item.fileName}" for Category "${item.name}" to Cloudinary (folder: joyevents/categories)...`);
      const uploadResult = await uploadToCloudinary(filePath, 'joyevents/categories');

      if (!category) {
        category = await Category.create({
          name: item.name,
          type: item.type,
          imageUrl: uploadResult.url,
          imagePublicId: uploadResult.public_id
        });
        console.log(`✨ Created new Category "${item.name}" with Cloudinary URL: ${uploadResult.url}`);
      } else {
        category.imageUrl = uploadResult.url;
        category.imagePublicId = uploadResult.public_id;
        await category.save();
        console.log(`🔄 Updated existing Category "${item.name}" with Cloudinary URL: ${uploadResult.url}`);
      }
    }

    console.log("🎉 Category Migration to Cloudinary completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error.message || error);
    process.exit(1);
  }
}

runMigration();
