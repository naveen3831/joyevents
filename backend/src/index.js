import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync } from "fs";
import authRoutes from "./routes/auth.js";
import merchantRoutes from "./routes/merchant.js";
import bookingRoutes from "./routes/bookings.js";
import eventRoutes from "./routes/events.js";
import serviceRoutes from "./routes/services.js";
import categoryRoutes from "./routes/categories.js";
import notificationRoutes from "./routes/notifications.js";
import earningsRoutes from "./routes/earnings.js";
import marketingRoutes from "./routes/marketing.js";
import analyticsRoutes from "./routes/analytics.js";
import favoriteRoutes from "./routes/favorites.js";
import settingsRoutes from "./routes/settings.js";
import contactRoutes from "./routes/contact.js";
import recommendationRoutes from "./routes/recommendations.js";
import referralRoutes from "./routes/referrals.js";
import { connectDB } from "./config/db.js";
import { getSmtpConfig, isSmtpConfigured } from "./utils/sendEmail.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../.env") });
if (!process.env.MONGO_URI) {
  const rootEnv = resolve(__dirname, "../../.env");
  dotenv.config({ path: rootEnv });
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({  
  origin: (origin, callback) => {
    // In production, ALLOWED_ORIGINS env var can restrict to specific domains.
    // Falls back to allowing all origins (safe for APIs that use token auth).
    const allowed = process.env.ALLOWED_ORIGINS;
    if (!allowed) {
      // No restriction configured — allow all (default for dev and single-domain deploys)
      return callback(null, true);
    }
    const list = allowed.split(",").map(o => o.trim());
    if (!origin || list.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Serve uploaded images as static files
app.use("/uploads", express.static(resolve(__dirname, "../uploads")));

app.get("/health", async (_req, res) => {
  try {
    // Basic health check
    const health = {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        hasMongoUri: !!process.env.MONGO_URI,
        hasJwtSecret: !!process.env.JWT_SECRET,
        frontendUrl: process.env.FRONTEND_URL
      }
    };

    // Test database connection
    try {
      const mongoose = await import("mongoose");
      if (mongoose.default.connection.readyState === 1) {
        health.database = "connected";
        
        // Test basic database operations
        const User = (await import("./models/User.js")).default;
        const userCount = await User.countDocuments();
        health.userCount = userCount;
        
        const Booking = (await import("./models/Booking.js")).default;
        const bookingCount = await Booking.countDocuments();
        health.bookingCount = bookingCount;
        
        const Event = (await import("./models/Event.js")).default;
        const eventCount = await Event.countDocuments();
        health.eventCount = eventCount;
        
      } else {
        health.database = "disconnected";
        health.dbState = mongoose.default.connection.readyState;
      }
    } catch (dbError) {
      health.database = "error";
      health.dbError = dbError.message;
    }

    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: "error", 
      error: error.message,
      uptime: process.uptime()
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/earnings", earningsRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/merchant", merchantRoutes);
app.use("/api/referrals", referralRoutes);

// Serve frontend build only in non-Docker / single-process mode (PM2 / local)
// In Docker, Nginx serves the frontend and proxies /api → this backend.
if (process.env.SERVE_FRONTEND === "true") {
  const frontendDist = resolve(__dirname, "../../frontend/dist");
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("*", (_req, res) => {
      res.sendFile(resolve(frontendDist, "index.html"));
    });
    console.log("Serving frontend from:", frontendDist);
  }
}

async function logSmtpStatus() {
  if (!isSmtpConfigured()) {
    console.warn("[email] SMTP_USER / SMTP_PASS not set — password reset emails will fail");
    return;
  }
  const { user, host, port } = getSmtpConfig();
  try {
    const nodemailer = (await import("nodemailer")).default;
    const { pass, secure } = getSmtpConfig();
    const t = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      requireTLS: !secure && port === 587,
    });
    await t.verify();
    console.log(`[email] SMTP ready (${user} via ${host}:${port})`);
  } catch (err) {
    console.error(
      `[email] SMTP login failed for ${user} — regenerate a Gmail App Password and update SMTP_PASS in backend/.env`
    );
    console.error(`[email] ${err.message}`);
  }
}

async function start() {
  try {
    await connectDB();
    logSmtpStatus().catch(() => {});

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`API server running on http://0.0.0.0:${PORT}`);
    });
    
    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
        process.exit(1);
      } else {
        console.error("Server error:", err);
      }
    });

    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception (server kept alive):", err?.message || err);
    });
    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled Rejection (server kept alive):", reason?.message || reason);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

start();

// Global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
