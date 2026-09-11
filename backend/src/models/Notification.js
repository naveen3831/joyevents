import mongoose from "mongoose";
import { emitNotificationCreated } from "../realtime.js";
import { sendPushNotificationToUser } from "../services/firebaseAdminService.js";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["booking", "event", "service", "general"],
      default: "general"
    },
    status: { 
      type: String, 
      enum: ["unread", "read"],
      default: "unread"
    },
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // Reference to booking/event/service
    actionUrl: { type: String } // Optional URL for action
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

notificationSchema.post("save", function notifyRealtimeAndPush(notification) {
  if (notification.status === "unread") {
    emitNotificationCreated(notification.toObject());
    sendPushNotificationToUser(notification.userId, {
      title: notification.title,
      body: notification.message,
      data: {
        type: notification.type || "general",
        relatedId: notification.relatedId ? notification.relatedId.toString() : "",
        actionUrl: notification.actionUrl || "",
        notificationId: notification._id.toString(),
      },
    }).catch(err => {
      console.error("[FCM] Push dispatch error in Notification post-save hook:", err?.message || err);
    });
  }
});

export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
