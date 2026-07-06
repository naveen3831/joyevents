import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    type: { type: String, enum: ["earning", "commission_deduction", "withdrawal", "refund"], required: true },
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["completed", "pending", "failed"], default: "completed" },
    relatedId: { type: String, default: "" }, // For linking to bookings, withdrawals, etc.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export default mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);
