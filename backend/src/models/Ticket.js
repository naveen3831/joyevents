import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    merchant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    requestedEvents: {
      type: Number,
      default: 0
    },
    requestedServices: {
      type: Number,
      default: 0
    },
    message: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["pending", "quotation_sent", "paid", "approved", "rejected"],
      default: "pending",
      required: true
    },
    quotationAmount: {
      type: Number,
      default: 0
    },
    paymentDetails: {
      cardLast4: { type: String },
      paidAt: { type: Date }
    }
  },
  { timestamps: true }
);

export default mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);
