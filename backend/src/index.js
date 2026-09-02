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
import customServiceRoutes from "./routes/customServiceRequests.js";
import { connectDB } from "./config/db.js";
import { getSmtpConfig, isSmtpConfigured } from "./utils/sendEmail.js";
import { emitResourceChanged, setupRealtime } from "./realtime.js";

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
    const allowed = process.env.ALLOWED_ORIGINS;
    if (!allowed) {
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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use((req, res, next) => {
  res.on("finish", () => {
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) return;
    if (res.statusCode < 200 || res.statusCode >= 400) return;
    if (!req.originalUrl.startsWith("/api/")) return;

    const [resource = "unknown"] = req.originalUrl.replace(/^\/api\//, "").split("/");
    emitResourceChanged({
      resource,
      action: req.method.toLowerCase(),
      actorId: req.user?._id,
    });
  });
  next();
});

// Serve uploaded images as static files
app.use("/uploads", express.static(resolve(__dirname, "../uploads")));

app.get("/health", async (_req, res) => {
  try {
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

    try {
      const mongoose = await import("mongoose");
      if (mongoose.default.connection.readyState === 1) {
        health.database = "connected";
        const User = (await import("./models/User.js")).default;
        health.userCount = await User.countDocuments();
        const Booking = (await import("./models/Booking.js")).default;
        health.bookingCount = await Booking.countDocuments();
        const Event = (await import("./models/Event.js")).default;
        health.eventCount = await Event.countDocuments();
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
app.use("/api/custom-service-requests", customServiceRoutes);

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
    setupRealtime(server);
    
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

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
