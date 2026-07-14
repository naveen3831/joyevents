import { Router } from "express";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import Transaction from "../models/Transaction.js";
import Settings from "../models/Settings.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { formatCurrency } from "../utils/formatCurrency.js";

const router = Router();

// Read commission rate from DB — falls back to 10% if not set
async function getCommissionRate() {
  try {
    const doc = await Settings.findOne({ key: "commissionRate" });
    return doc ? Number(doc.value) / 100 : 0.10;
  } catch {
    return 0.10;
  }
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function getPaidAmount(booking) {
  if (booking.paymentStatus === "partially_paid") {
    if (booking.isAdvancePaid && Number(booking.advanceAmount) > 0) {
      return Number(booking.advanceAmount);
    }
    const snapshotGross = Number(booking.commissionSnapshot?.grossAmount);
    if (snapshotGross > 0) return snapshotGross;
  }

  return Number(booking.price) || 0;
}

async function calculateMerchantEarnings(merchantId) {
  const paidBookings = await Booking.find({
    assignedTo: merchantId,
    status: { $in: ["paid", "confirmed", "accepted", "processing", "completed", "awaiting_final_payment", "refunded"] },
    paymentStatus: { $in: ["paid", "partially_paid", "refunded"] }
  }).lean();

  const bookingIds = paidBookings.map((booking) => booking._id);
  const transactions = await Transaction.find({
    merchant: merchantId,
    status: "completed",
    type: { $in: ["earning", "commission_deduction", "refund"] },
    booking: { $in: bookingIds }
  }).lean();

  const transactionSummaries = new Map();
  for (const transaction of transactions) {
    if (!transaction.booking) continue;
    const bookingId = transaction.booking.toString();
    const summary = transactionSummaries.get(bookingId) || { earning: 0, commission: 0 };
    if (transaction.type === "earning") summary.earning += Number(transaction.amount) || 0;
    if (transaction.type === "commission_deduction") summary.commission += Number(transaction.amount) || 0;
    if (transaction.type === "refund") summary.earning += Number(transaction.amount) || 0;
    transactionSummaries.set(bookingId, summary);
  }

  const commissionRate = await getCommissionRate();
  let totalEarnings = 0;
  let totalCommission = 0;
  let grossRevenue = 0;

  for (const booking of paidBookings) {
    const bookingId = booking._id.toString();
    const transactionSummary = transactionSummaries.get(bookingId);
    const paidAmount = getPaidAmount(booking);
    grossRevenue += paidAmount;

    if (transactionSummary) {
      totalEarnings += transactionSummary.earning;
      totalCommission += transactionSummary.commission;
      continue;
    }

    const snapshot = booking.commissionSnapshot;
    if (snapshot && Number(snapshot.grossAmount) > 0) {
      totalEarnings += Number(snapshot.merchantPayout) || 0;
      totalCommission += Number(snapshot.commissionAmount) || 0;
      continue;
    }

    totalEarnings += paidAmount * (1 - commissionRate);
    totalCommission += paidAmount * commissionRate;
  }

  const pendingWithdrawals = await Withdrawal.find({
    merchant: merchantId,
    status: "pending"
  }).lean();
  const pendingWithdrawalAmount = pendingWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

  const completedWithdrawals = await Withdrawal.find({
    merchant: merchantId,
    status: { $in: ["completed", "approved"] }
  }).lean();
  const totalWithdrawn = completedWithdrawals.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
  const availableBalance = totalEarnings - totalWithdrawn - pendingWithdrawalAmount;

  // Calculate total refunded amount for merchant
  const refundTxs = await Transaction.find({
    merchant: merchantId,
    status: "completed",
    type: "refund"
  }).lean();
  const totalRefunded = refundTxs.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

  return {
    totalEarnings: roundMoney(totalEarnings),
    totalCommission: roundMoney(totalCommission),
    grossRevenue: roundMoney(grossRevenue),
    totalWithdrawn: roundMoney(totalWithdrawn),
    pendingWithdrawalAmount: roundMoney(pendingWithdrawalAmount),
    availableBalance: roundMoney(availableBalance),
    completedBookings: paidBookings.length,
    pendingWithdrawals: pendingWithdrawals.length,
    totalRefunded: roundMoney(totalRefunded)
  };
}

// Merchant: Get earnings dashboard data
router.get("/dashboard", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const summary = await calculateMerchantEarnings(merchantId);

    // Get recent transactions
    const recentTransactions = await Transaction.find({
      merchant: merchantId
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("booking", "serviceName event price");

    res.json({
      ...summary,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch earnings data" });
  }
});

// Merchant: Request withdrawal
router.post("/withdrawal-request", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const { amount, bankDetails } = req.body;


    // Validate amount
    if (String(amount).length > 10) {
      return res.status(400).json({ error: "Withdrawal amount cannot exceed 10 digits" });
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 1) {
      return res.status(400).json({ error: "Please enter a valid amount (minimum ₹1)" });
    }

    const { availableBalance } = await calculateMerchantEarnings(merchantId);

    if (numAmount > availableBalance) {
      return res.status(400).json({ error: "Insufficient balance for withdrawal" });
    }

    // Validate bank details
    if (!bankDetails) {
      return res.status(400).json({ error: "Bank details are required" });
    }

    const holder = (bankDetails.accountHolder || "").trim();
    if (!holder) {
      return res.status(400).json({ error: "Account holder name is required" });
    }
    if (holder.length < 2 || holder.length > 50) {
      return res.status(400).json({ error: "Account holder name must be between 2 and 50 characters" });
    }
    if (!/^[a-zA-Z\s.]+$/.test(holder)) {
      return res.status(400).json({ error: "Account holder name can only contain letters, spaces, and dots" });
    }

    const accNum = (bankDetails.accountNumber || "").trim();
    if (!accNum) {
      return res.status(400).json({ error: "Account number is required" });
    }
    if (!/^\d+$/.test(accNum)) {
      return res.status(400).json({ error: "Account number must contain only numbers" });
    }
    if (accNum.length < 9 || accNum.length > 18) {
      return res.status(400).json({ error: "Account number must be between 9 and 18 digits" });
    }

    const ifsc = (bankDetails.ifscCode || "").trim().toUpperCase();
    if (!ifsc) {
      return res.status(400).json({ error: "IFSC Code is required" });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return res.status(400).json({ error: "Invalid IFSC Code format" });
    }

    const bankName = (bankDetails.bankName || "").trim();
    if (!bankName) {
      return res.status(400).json({ error: "Bank name is required" });
    }
    if (bankName.length < 2 || bankName.length > 50) {
      return res.status(400).json({ error: "Bank name must be between 2 and 50 characters" });
    }
    if (!/^[a-zA-Z\s&().-]+$/.test(bankName)) {
      return res.status(400).json({ error: "Bank name contains invalid characters" });
    }

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      merchant: merchantId,
      amount: numAmount,
      bankDetails: {
        accountHolder: holder,
        accountNumber: accNum,
        ifscCode: ifsc,
        bankName
      },
      status: "pending"
    });

    // Create transaction record
    await Transaction.create({
      merchant: merchantId,
      type: "withdrawal",
      amount,
      description: `Withdrawal request for ${formatCurrency(amount)}`,
      status: "pending",
      relatedId: withdrawal._id.toString()
    });


    res.json({
      success: true,
      withdrawal,
      message: "Withdrawal request submitted successfully"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create withdrawal request" });
  }
});

// Merchant: Get withdrawal history
router.get("/withdrawals", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const withdrawals = await Withdrawal.find({ merchant: merchantId })
      .sort({ createdAt: -1 });

    res.json({ withdrawals });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

// Merchant: Get transaction history
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const merchantId = req.user._id;
    const transactions = await Transaction.find({ merchant: merchantId })
      .sort({ createdAt: -1 })
      .populate("booking", "serviceName event price");

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Admin: Approve withdrawal
router.patch("/withdrawal/:id/approve", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      { status: "approved", approvedAt: new Date() },
      { new: true }
    ).populate("merchant", "name email");

    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    // Create notification for merchant
    const Notification = (await import("../models/Notification.js")).default;
    await Notification.create({
      userId: withdrawal.merchant._id,
      title: "Withdrawal Approved",
      message: `Your withdrawal request of ${formatCurrency(withdrawal.amount)} has been approved by admin.`,
      type: "booking",
      status: "unread",
      relatedId: withdrawal._id,
      actionUrl: "/merchant-earnings"
    });

    res.json({ success: true, withdrawal });
  } catch (error) {
    res.status(500).json({ error: "Failed to approve withdrawal" });
  }
});

// Admin: Complete withdrawal
router.patch("/withdrawal/:id/complete", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    const withdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      { status: "completed", completedAt: new Date(), transactionId },
      { new: true }
    ).populate("merchant", "name email");

    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { relatedId: id },
      { status: "completed" }
    );

    // Create notification for merchant
    const Notification = (await import("../models/Notification.js")).default;
    await Notification.create({
      userId: withdrawal.merchant._id,
      title: "Withdrawal Completed",
      message: `Your withdrawal of ${formatCurrency(withdrawal.amount)} has been successfully completed. Transaction ID: ${transactionId}`,
      type: "booking",
      status: "unread",
      relatedId: withdrawal._id,
      actionUrl: "/merchant-earnings"
    });

    res.json({ success: true, withdrawal });
  } catch (error) {
    res.status(500).json({ error: "Failed to complete withdrawal" });
  }
});

// Admin: Reject withdrawal
router.patch("/withdrawal/:id/reject", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const withdrawal = await Withdrawal.findByIdAndUpdate(
      id,
      { status: "rejected", rejectionReason: reason },
      { new: true }
    ).populate("merchant", "name email");

    if (!withdrawal) {
      return res.status(404).json({ error: "Withdrawal not found" });
    }

    // Update transaction status
    await Transaction.findOneAndUpdate(
      { relatedId: id },
      { status: "failed" }
    );

    // Create notification for merchant
    const Notification = (await import("../models/Notification.js")).default;
    await Notification.create({
      userId: withdrawal.merchant._id,
      title: "Withdrawal Rejected",
      message: `Your withdrawal request of ${formatCurrency(withdrawal.amount)} has been rejected. Reason: ${reason}`,
      type: "booking",
      status: "unread",
      relatedId: withdrawal._id,
      actionUrl: "/merchant-earnings"
    });

    res.json({ success: true, withdrawal });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject withdrawal" });
  }
});

// Admin: Get all pending withdrawals
router.get("/admin/pending-withdrawals", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    
    const pendingWithdrawals = await Withdrawal.find({ status: "pending" })
      .populate("merchant", "name email")
      .sort({ requestedAt: -1 });

    res.json({ withdrawals: pendingWithdrawals });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pending withdrawals" });
  }
});

// Admin: Get all withdrawals (with filters)
router.get("/admin/withdrawals", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }

    
    const withdrawals = await Withdrawal.find(query)
      .populate("merchant", "name email")
      .sort({ requestedAt: -1 });

    res.json({ withdrawals });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

export default router;
