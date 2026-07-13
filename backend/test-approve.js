import { connectDB } from "./src/config/db.js";
import Ticket from "./src/models/Ticket.js";
import User from "./src/models/User.js";
import mongoose from "mongoose";

async function run() {
  console.log("Starting diagnostics...");
  try {
    await connectDB();
    console.log("Connected to MongoDB!");

    // Query paid tickets
    const tickets = await Ticket.find({}).populate("merchant");
    console.log(`Total tickets: ${tickets.length}`);
    tickets.forEach(t => {
      console.log(`- ID: ${t._id}, Status: ${t.status}, Merchant: ${t.merchant?.name} (${t.merchant?._id}), ReqEvents: ${t.requestedEvents}, ReqServices: ${t.requestedServices}`);
    });

    const paidTicket = await Ticket.findOne({ status: "paid" });
    if (paidTicket) {
      console.log("Found paid ticket:", paidTicket._id);
      console.log("Merchant ID:", paidTicket.merchant._id || paidTicket.merchant);
      
      const merchant = await User.findById(paidTicket.merchant._id || paidTicket.merchant);
      if (!merchant) {
        console.log("ERROR: Merchant not found in User collection!");
      } else {
        console.log("Merchant found:", merchant.name, "Role:", merchant.role, "Events:", merchant.maxEvents, "Services:", merchant.maxServices);
      }
    } else {
      console.log("No paid ticket found.");
    }
  } catch (err) {
    console.error("Diagnosis failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

run();
