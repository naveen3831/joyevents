import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    serviceName: { type: String, trim: true },
    eventName: { type: String, trim: true },
    eventId: { type: String, trim: true },
    price: { type: Number, required: true },
    datetime: { type: Date, required: true },
    status: { type: String, enum: ["pending", "pending_approval", "approved", "awaiting_payment", "paid", "confirmed", "assigned", "accepted", "processing", "completed", "cancelled", "awaiting_final_payment", "cancellation_requested", "cancellation_fee_proposed", "refund_pending", "refunded"], default: "pending" },
    paymentStatus: { type: String, enum: ["pending", "paid", "failed", "refunded", "partially_paid"], default: "pending" },
    paymentId: { type: String, default: "" },
    // Advance payment tracking
    paymentType: { type: String, enum: ["full", "advance"], default: "full" },
    advanceAmount: { type: Number, default: 0 },
    isAdvancePaid: { type: Boolean, default: false },
    advancePaymentId: { type: String, default: "" },
    advancePaidAt: { type: Date, default: null },
    remainingAmount: { type: Number, default: 0 },
    isRemainingPaid: { type: Boolean, default: false },
    remainingPaymentId: { type: String, default: "" },
    remainingPaidAt: { type: Date, default: null },
    ticketId: { type: String, default: "" },
    ticketType: { type: String, enum: ["", "silver", "gold", "diamond"], default: "" },
    quantity: { type: Number, default: 1 },
    selectedTickets: { type: Map, of: Number, default: {} },
    selectedSession: { type: String, enum: ["", "day", "night"], default: "" },
    paymentMethod: { type: String, enum: ["upi", "card", "wallet", "mixed"], default: "card" },
    upiId: { type: String, default: "" },
    cardLast4: { type: String, default: "" },
    cardholderName: { type: String, default: "" },
    walletAmountPaid: { type: Number, default: 0 },
    commissionSnapshot: {
      commissionRate: { type: Number, default: null },
      commissionAmount: { type: Number, default: 0 },
      merchantPayout: { type: Number, default: 0 },
      grossAmount: { type: Number, default: 0 },
      capturedAt: { type: Date, default: null }
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    refundReason: { type: String, default: "" },
    refundedAt: { type: Date, default: null },
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: "" },
    // Customer location for service bookings
    customerLocation: {
      address: { type: String, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null }
    },
    // Rating system
    rating: {
      score: { type: Number, min: 1, max: 5, default: null }, // 1-5 stars
      comment: { type: String, default: "" },
      ratedAt: { type: Date, default: null },
      ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
    },
    // Payout tracking
    payoutProcessed: { type: Boolean, default: false },
    payoutProcessedAt: { type: Date, default: null },
    // Ticket validation tracking
    ticketValidated: { type: Boolean, default: false },
    ticketValidatedAt: { type: Date, default: null },
    ticketValidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Promo code tracking
    promoCode: {
      code: { type: String, default: "" },
      promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: "PromoCode", default: null },
      discountType: { type: String, enum: ["", "percentage", "fixed"], default: "" },
      discountValue: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      originalPrice: { type: Number, default: 0 },
      finalPrice: { type: Number, default: 0 },
      appliedAt: { type: Date, default: null }
    },
    // Add-ons selected by customer
    addOns: [{
      name:     { type: String },
      price:    { type: Number },
      quantity: { type: Number, default: 1 }
    }],
    guestCount: { type: Number, default: 0 },
    // Seat numbers selected by customer (e.g. ["diamond-A1", "gold-B3", "seat-C2"])
    selectedSeatNumbers: [{ type: String }],
    cancellationFee: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    cancellationRequestedAt: { type: Date, default: null },
    cancellationFeeProposedAt: { type: Date, default: null },
    cancellationAcceptedAt: { type: Date, default: null },
    refundProcessedAt: { type: Date, default: null },
    previousStatus: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
