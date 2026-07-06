/**
 * One-time script: uploads all frontend static assets to Cloudinary
 * and prints the URLs to use in the frontend.
 *
 * Run from project root:
 *   node backend/scripts/upload-static-assets.js
 */

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../backend/.env") });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ASSETS_DIR = resolve(__dirname, "../../frontend/src/assets");

const FILES = [
  { file: "about-hero.jpg",        public_id: "joyevents/static/about-hero" },
  { file: "contact-hero.jpg",      public_id: "joyevents/static/contact-hero" },
  { file: "services-hero.jpg",     public_id: "joyevents/static/services-hero" },
  { file: "portfolio-hero.jpg",    public_id: "joyevents/static/portfolio-hero" },
  { file: "hero-event.jpg",        public_id: "joyevents/static/hero-event" },
  { file: "event-conference.jpg",  public_id: "joyevents/static/event-conference" },
  { file: "event-wedding.jpg",     public_id: "joyevents/static/event-wedding" },
  { file: "event-party.jpg",       public_id: "joyevents/static/event-party" },
  { file: "event-food.jpg",        public_id: "joyevents/static/event-food" },
  { file: "event-workshop.jpg",    public_id: "joyevents/static/event-workshop" },
];

async function uploadAll() {
  console.log("☁️  Uploading static assets to Cloudinary...\n");

  const results = {};

  for (const { file, public_id } of FILES) {
    const filePath = resolve(ASSETS_DIR, file);
    if (!existsSync(filePath)) {
      console.warn(`⚠️  Skipping ${file} — not found at ${filePath}`);
      continue;
    }

    try {
      // Use overwrite: false so re-running doesn't re-upload existing files
      const result = await cloudinary.uploader.upload(filePath, {
        public_id,
        overwrite: false,
        resource_type: "image",
        transformation: [{ quality: "auto:good" }, { fetch_format: "auto" }],
      });
      console.log(`✅  ${file} → ${result.secure_url}`);
      results[file] = result.secure_url;
    } catch (err) {
      // If already exists, fetch the URL
      if (err.http_code === 400 && err.message?.includes("already exists")) {
        const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${public_id}`;
        console.log(`ℹ️  ${file} already exists → ${url}`);
        results[file] = url;
      } else {
        console.error(`❌  ${file} failed: ${err.message}`);
      }
    }
  }

  console.log("\n📋 Copy these URLs into frontend/src/lib/staticImages.ts:\n");
  console.log("export const STATIC_IMAGES = {");
  console.log(`  aboutHero:       "${results["about-hero.jpg"] || ""}",`);
  console.log(`  contactHero:     "${results["contact-hero.jpg"] || ""}",`);
  console.log(`  servicesHero:    "${results["services-hero.jpg"] || ""}",`);
  console.log(`  portfolioHero:   "${results["portfolio-hero.jpg"] || ""}",`);
  console.log(`  heroEvent:       "${results["hero-event.jpg"] || ""}",`);
  console.log(`  eventConference: "${results["event-conference.jpg"] || ""}",`);
  console.log(`  eventWedding:    "${results["event-wedding.jpg"] || ""}",`);
  console.log(`  eventParty:      "${results["event-party.jpg"] || ""}",`);
  console.log(`  eventFood:       "${results["event-food.jpg"] || ""}",`);
  console.log(`  eventWorkshop:   "${results["event-workshop.jpg"] || ""}",`);
  console.log("};");
}

uploadAll();
