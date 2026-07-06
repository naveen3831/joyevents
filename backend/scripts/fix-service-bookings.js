/**
 * Migration: Fix orphaned service bookings
 * Matches bookings by serviceName to Service.name and sets:
 *   - booking.service = service._id
 *   - booking.assignedTo = service.createdBy
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

await mongoose.connect(MONGO_URI);
console.log("✅ Connected to MongoDB");

const Booking = mongoose.model("Booking", new mongoose.Schema({}, { strict: false }));
const Service = mongoose.model("Service", new mongoose.Schema({}, { strict: false }));

// Find all bookings where service is null and event is null (service bookings without ref)
const orphaned = await Booking.find({
  service: null,
  $or: [{ event: null }, { event: { $exists: false } }, { eventId: "" }, { eventId: { $exists: false } }]
});

console.log(`🔍 Found ${orphaned.length} potentially orphaned service bookings`);

let fixed = 0;
let skipped = 0;

for (const booking of orphaned) {
  const name = booking.serviceName || booking.eventName;
  if (!name) { skipped++; continue; }

  const service = await Service.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
  if (!service) {
    console.log(`⚠️  No service found for booking "${name}" (${booking._id})`);
    skipped++;
    continue;
  }

  await Booking.findByIdAndUpdate(booking._id, {
    service: service._id,
    assignedTo: service.createdBy || null
  });

  console.log(`✅ Fixed booking ${booking._id}: "${name}" → service ${service._id}, assignedTo ${service.createdBy}`);
  fixed++;
}

console.log(`\n📊 Done: ${fixed} fixed, ${skipped} skipped`);
await mongoose.disconnect();
