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

export default router;
