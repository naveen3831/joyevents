import mongoose from "mongoose";

const promoCodeSchema = new mongoose.Schema(
  {
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String, default: "" },
    appliesTo: { type: String, enum: ["all", "ticketedEvents", "fullServiceEvents", "services"], default: "all" },
    applicableCategories: { type: [String], default: ["all"] }, // e.g. ["all"], ["wedding"], etc.
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    maxUses: { type: Number, default: null }, // null = unlimited
    currentUses: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    applicableEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Event" }],
    applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: "Service" }],
    minBookingAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number, default: null }, // For percentage discounts
    usedBy: [
      {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        usedAt: { type: Date, default: Date.now },
        booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.PromoCode || mongoose.model("PromoCode", promoCodeSchema);
