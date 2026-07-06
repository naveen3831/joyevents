import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },
    bankDetails: {
      accountHolder: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      bankName: { type: String, default: "" }
    },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    transactionId: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.models.Withdrawal || mongoose.model("Withdrawal", withdrawalSchema);
