import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    datetime: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    category: { type: String, default: "General" },
    status: { type: String, enum: ["upcoming", "ongoing", "completed", "cancelled"], default: "upcoming" },
    live: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    qrCodeCustomUrl: { type: String, default: "" },
    qrCodeActive: { type: Boolean, default: true },
    image: { type: String, default: "" },
    gallery: [{ type: String }], // Array of image URLs from Cloudinary
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    eventType: { type: String, enum: ["ticketed", "fullService"], default: "fullService" },
    maxAttendees: { type: Number, default: 0 }, // 0 = unlimited, for fullService events
    attendeesCount: { type: Number, default: 0 }, // real-time booked count
    // Duration & Multi-day scheduling
    durationType: { type: String, enum: ["single", "multiple"], default: "single" },
    startDate: { type: String, default: "" }, // "YYYY-MM-DD"
    endDate: { type: String, default: "" },   // "YYYY-MM-DD"
    startTime: { type: String, default: "" }, // "HH:mm"
    endTime: { type: String, default: "" },   // "HH:mm"
    hasCustomSchedule: { type: Boolean, default: false },
    dailySchedule: [
      {
        date: { type: String }, // "YYYY-MM-DD"
        dayLabel: { type: String }, // e.g. "Sat, 05 Sep"
        startTime: { type: String },
        endTime: { type: String }
      }
    ],
    // Day/Night session support
    hasMultipleSessions: { type: Boolean, default: false },
    sessions: {
      day: {
        enabled: { type: Boolean, default: false },
        time: { type: String, default: "09:00 AM" },
        tickets: [
          {
            type: { type: String },
            price: { type: Number, required: true },
            available: { type: Number, default: 100 },
            sold: { type: Number, default: 0 }
          }
        ]
      },
      night: {
        enabled: { type: Boolean, default: false },
        time: { type: String, default: "06:00 PM" },
        tickets: [
          {
            type: { type: String },
            price: { type: Number, required: true },
            available: { type: Number, default: 100 },
            sold: { type: Number, default: 0 }
          }
        ]
      }
    },
    // Legacy tickets field (for backward compatibility)
    tickets: [
      {
        type: { type: String },
        price: { type: Number, required: true },
        available: { type: Number, default: 100 },
        sold: { type: Number, default: 0 }
      }
    ],
    // Seating - track which specific seats are booked
    bookedSeats: [{ type: String }] // e.g., ["G10", "G11", "H5"]
  },
  { timestamps: true }
);

export default mongoose.models.Event || mongoose.model("Event", eventSchema);
