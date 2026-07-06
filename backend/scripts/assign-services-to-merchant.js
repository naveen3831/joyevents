import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import User from "../src/models/User.js";
import Service from "../src/models/Service.js";

dotenv.config();

// Pass merchant email as CLI arg: node assign-services-to-merchant.js merchant@email.com
const merchantEmail = process.argv[2];

async function run() {
  if (!merchantEmail) {
    console.error("❌ Usage: node scripts/assign-services-to-merchant.js <merchant-email>");
    process.exit(1);
  }

  await connectDB();

  const merchant = await User.findOne({ email: merchantEmail, role: "merchant" });
  if (!merchant) {
    console.error(`❌ No merchant found with email: ${merchantEmail}`);
    await mongoose.connection.close();
    process.exit(1);
  }

  console.log(`✅ Found merchant: ${merchant.name} (${merchant._id})`);

  // Assign all services without createdBy to this merchant
  const result = await Service.updateMany(
    { createdBy: { $exists: false } },
    { $set: { createdBy: merchant._id } }
  );

  // Also assign services where createdBy is null
  const result2 = await Service.updateMany(
    { createdBy: null },
    { $set: { createdBy: merchant._id } }
  );

  const total = result.modifiedCount + result2.modifiedCount;
  console.log(`✅ Assigned ${total} service(s) to merchant: ${merchant.name}`);

  await mongoose.connection.close();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Migration error:", err?.message || err);
  try { await mongoose.connection.close(); } catch {}
  process.exit(1);
});
