import { Router } from"express";
import Notification from "../models/Notification.js";
import { verifyToken } from "../middleware/auth.js";

const router= Router();

// Get user notifications
router.get("/", verifyToken, async (req, res) => {
  try {
    const { limit = 20, status } = req.query;
    const query = { userId: req.user._id };
    
    if (status) {
      query.status = status;
    }
    
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    const unreadCount = await Notification.countDocuments({ 
      userId: req.user._id, 
      status: "unread" 
    });
    
    
    res.json({ notifications, unreadCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.patch("/:id/read", verifyToken, async (req, res) => {
  try {
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: "read" },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.patch("/read-all", verifyToken, async (req, res) => {
  try {
    
    const result = await Notification.updateMany(
      { userId: req.user._id, status: "unread" },
      { status: "read" }
    );
    
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

// Delete a notification
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    res.json({ message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

// Register FCM Device Token for authenticated user
router.post("/device-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ error: "FCM token is required" });
    }

    const User = (await import("../models/User.js")).default;
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { fcmTokens: token.trim() },
    });

    console.log(`[FCM] Registered token for user ${req.user._id}: ${token.slice(0, 15)}...`);
    res.json({ message: "FCM device token registered successfully" });
  } catch (err) {
    console.error("[FCM] Error registering device token:", err);
    res.status(500).json({ error: "Failed to register FCM device token" });
  }
});

// Remove FCM Device Token for authenticated user
router.delete("/device-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "FCM token is required" });
    }

    const User = (await import("../models/User.js")).default;
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { fcmTokens: token.trim() },
    });

    console.log(`[FCM] Unregistered token for user ${req.user._id}`);
    res.json({ message: "FCM device token removed successfully" });
  } catch (err) {
    console.error("[FCM] Error removing device token:", err);
    res.status(500).json({ error: "Failed to remove FCM device token" });
  }
});

// DEVELOPMENT-ONLY Test Push Notification Endpoint
router.post("/test-push", verifyToken, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ message: "Not found" });
  }

  try {
    const { sendPushNotificationToUser } = await import("../services/firebaseAdminService.js");

    const result = await sendPushNotificationToUser(req.user._id, {
      title: "JoyEvents Test Notification",
      body: "Firebase push notifications are working successfully.",
      data: {
        type: "general",
        source: "test"
      }
    });

    if (!result.success) {
      if (result.reason?.includes("no registered FCM tokens") || result.reason?.includes("no valid FCM tokens")) {
        return res.status(400).json({
          success: false,
          message: "No FCM token registered for this user"
        });
      }
      return res.status(500).json({
        success: false,
        message: result.reason || result.error || "Failed to send test push notification"
      });
    }

    console.log(`[FCM TEST] Push sent to current user (${req.user._id})`);
    res.json({
      success: true,
      message: "Test push notification sent"
    });
  } catch (err) {
    console.error("[FCM TEST ERROR]", err?.message || err);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred while sending test push notification"
    });
  }
});

export default router;
