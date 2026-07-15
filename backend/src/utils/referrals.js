import Booking from "../models/Booking.js";
import Settings from "../models/Settings.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { formatCurrency } from "./formatCurrency.js";

const DEFAULT_REFERRAL_SETTINGS = {
  discountAmount: 100,
  bonusAmount: 100,
  isActive: true
};

export function buildReferralCode(userId) {
  return `JOY-${userId.toString().slice(-6).toUpperCase()}`;
}

export async function ensureUserReferralCode(user) {
  if (!user) return "";
  if (user.referralCode) return user.referralCode;
  user.referralCode = buildReferralCode(user._id);
  await user.save();
  return user.referralCode;
}

export async function getReferralSettings() {
  const doc = await Settings.findOne({ key: "referralSettings" });
  if (!doc?.value) return DEFAULT_REFERRAL_SETTINGS;
  try {
    const parsed = JSON.parse(doc.value);
    return {
      discountAmount: Math.max(0, Number(parsed.discountAmount) || DEFAULT_REFERRAL_SETTINGS.discountAmount),
      bonusAmount: Math.max(0, Number(parsed.bonusAmount) || DEFAULT_REFERRAL_SETTINGS.bonusAmount),
      isActive: parsed.isActive !== false
    };
  } catch {
    return DEFAULT_REFERRAL_SETTINGS;
  }
}

export async function saveReferralSettings(settings) {
  const normalized = {
    discountAmount: Math.max(0, Number(settings.discountAmount) || 0),
    bonusAmount: Math.max(0, Number(settings.bonusAmount) || 0),
    isActive: settings.isActive !== false
  };
  await Settings.findOneAndUpdate(
    { key: "referralSettings" },
    { value: JSON.stringify(normalized) },
    { upsert: true, new: true }
  );
  return normalized;
}

export async function awardReferralBonusForBooking(bookingOrId) {
  const booking = typeof bookingOrId === "string"
    ? await Booking.findById(bookingOrId)
    : bookingOrId;

  if (!booking?.referral?.referrer) return null;
  if (booking.referral.bonusCredited) return null;
  if (booking.status !== "completed" || booking.paymentStatus !== "paid") return null;

  const bonusAmount = Number(booking.referral.bonusAmount) || 0;
  if (bonusAmount <= 0) return null;

  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      "referral.referrer": booking.referral.referrer,
      "referral.bonusCredited": { $ne: true },
      status: "completed",
      paymentStatus: "paid"
    },
    {
      $set: {
        "referral.bonusCredited": true,
        "referral.bonusCreditedAt": new Date()
      }
    },
    { new: true }
  );

  if (!updatedBooking) return null;

  await User.findByIdAndUpdate(booking.referral.referrer, {
    $inc: { walletBalance: bonusAmount }
  });

  const transaction = await Transaction.create({
    merchant: booking.referral.referrer,
    booking: booking._id,
    type: "referral_bonus",
    amount: bonusAmount,
    description: `Referral bonus for completed booking: ${booking.serviceName || booking.eventName}`,
    status: "completed",
    relatedId: `REF-BONUS-${booking._id}`,
    metadata: {
      bookingId: booking._id,
      referredCustomer: booking.customer,
      referralCode: booking.referral.code
    }
  });

  await Notification.create({
    userId: booking.referral.referrer,
    title: "Referral Bonus Credited",
    message: `${formatCurrency(bonusAmount)} has been added to your wallet after a referred booking was completed.`,
    type: "booking",
    relatedId: booking._id,
    actionUrl: "/customer-dashboard/wallet",
    status: "unread"
  }).catch(() => null);

  return transaction;
}
