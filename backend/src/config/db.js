import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "node:dns";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  dotenv.config();
  if (!process.env.MONGO_URI && !process.env.MONGO_URI_DIRECT) {
    const rootEnv = resolve(__dirname, "../../../.env");
    dotenv.config({ path: rootEnv });
  }
}

export async function connectDB() {
  loadEnv();
  try {
    dns.setDefaultResultOrder?.("ipv4first");
  } catch {}
  const customDns = (process.env.MONGO_DNS_SERVERS || "")
    .split(/[,\s]+/)
    .map(s => s.trim())
    .filter(Boolean);
  if (customDns.length > 0) {
    try {
      dns.setServers(customDns);
      console.log("Using custom DNS servers:", customDns.join(", "));
    } catch (e) {
      console.warn("Failed to set custom DNS servers:", e?.message || e);
    }
  }
  const useDbName = process.env.MONGO_DB_NAME || undefined;
  const directUri = process.env.MONGO_URI_DIRECT;
  const srvUri = process.env.MONGO_URI;
  mongoose.connection.on("connected", () => console.log("Mongoose event: connected"));
  mongoose.connection.on("disconnected", () => {
    console.log("Mongoose event: disconnected — attempting reconnect in 5s...");
    setTimeout(async () => {
      try {
        if (mongoose.connection.readyState === 0) {
          const uri = process.env.MONGO_URI_DIRECT || process.env.MONGO_URI;
          if (uri) await mongoose.connect(uri, { dbName: useDbName, serverSelectionTimeoutMS: 30000, family: 4 });
        }
      } catch (e) {
        console.error("Reconnect failed:", e?.message);
      }
    }, 5000);
  });
  mongoose.connection.on("reconnected", () => console.log("Mongoose event: reconnected"));
  mongoose.connection.on("error", (err) => console.error("Mongoose event: error", err?.message || err));
  try {
    if (directUri) {
      await mongoose.connect(directUri, { dbName: useDbName, directConnection: true, serverSelectionTimeoutMS: 10000 });
      console.log("MongoDB connected (direct)");
      return true;
    }
    if (srvUri) {
      await mongoose.connect(srvUri, {
        dbName: useDbName,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        heartbeatFrequencyMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 60000,
        retryWrites: true,
        retryReads: true,
        family: 4, // force IPv4
      });
      console.log("MongoDB connected");
      return true;
    }
    console.warn("No MongoDB URI provided");
    return false;
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    return false;
  }
}
