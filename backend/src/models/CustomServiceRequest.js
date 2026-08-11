import mongoose from "mongoose";

const customServiceRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    serviceTitle: { type: String, required: true, trim: true },
    category: { type: String, default: "General", trim: true },
    eventDate: { type: Date, required: true },
    location: { type: String, required: true, trim: true },
    budget: { type: Number, default: 0 },
    quantity: { type: Number, default: 1 },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "quoted", "rejected", "paid"],
      default: "pending"
    },
    quotationAmount: { type: Number, default: 0 },
    quotationNote: { type: String, default: "" },
    quotedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    rejectedAt: { type: Date, default: null },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid"
    },
    paymentId: { type: String, default: "" },
    paidAt: { type: Date, default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null }
  },
  { timestamps: true }
);

export default mongoose.model("CustomServiceRequest", customServiceRequestSchema);
