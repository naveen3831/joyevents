import mongoose from "mongoose";
import dotenv from "dotenv";
import Settings from "../src/models/Settings.js";

dotenv.config();

const updatePlatformName = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.MONGO_DB_NAME
    });
    
    console.log("Connected to MongoDB");

    // Update platform name
    await Settings.findOneAndUpdate(
      { key: "platformName" },
      { value: "JoyEvents" },
      { upsert: true, new: true }
    );
    
    console.log("✅ Platform name updated to: JoyEvents");

    // Update support email
    await Settings.findOneAndUpdate(
      { key: "supportEmail" },
      { value: "hello@joyevents.com" },
      { upsert: true, new: true }
    );
    
    console.log("✅ Support email updated to: hello@joyevents.com");

    // Verify the update
    const nameDoc = await Settings.findOne({ key: "platformName" });
    const emailDoc = await Settings.findOne({ key: "supportEmail" });
    
    console.log("\n📋 Current Settings:");
    console.log(`Platform Name: ${nameDoc.value}`);
    console.log(`Support Email: ${emailDoc.value}`);

    await mongoose.disconnect();
    console.log("\n✅ Database update complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating settings:", error);
    process.exit(1);
  }
};

updatePlatformName();
