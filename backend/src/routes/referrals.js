import { Router } from "express";
import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  awardReferralBonusForBooking,
  ensureUserReferralCode,
  getReferralSettings,
  saveReferralSettings
} from "../utils/referrals.js";

const router = Router();

async function repairLegacyReferralBookings(settings, extraQuery = {}) {
  const users = await User.find({ referralCode: { $ne: "" } }).select("_id referralCode").lean();
  const codeToUser = new Map(users.map((user) => [String(user.referralCode).toUpperCase(), user._id]));
  if (codeToUser.size === 0) return;

  const legacyBookings = await Booking.find({
    ...extraQuery,
    $or: [
      { "referral.referrer": null },
      { "referral.referrer": { $exists: false } }
    ],
    "promoCode.code": { $exists: true, $ne: "" }
  });

  for (const booking of legacyBookings) {
    const referrerId = codeToUser.get(String(booking.promoCode?.code || "").toUpperCase());
    if (!referrerId || booking.customer?.toString() === referrerId.toString()) continue;

    booking.referral = {
      code: String(booking.promoCode?.code || "").toUpperCase(),
      referrer: referrerId,
      discountAmount: Number(booking.promoCode?.discountAmount) || 0,
      bonusAmount: Number(settings.bonusAmount) || 0,
      bonusCredited: false
    };
    await booking.save();
    await awardReferralBonusForBooking(booking);
  }
}

router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const referralCode = await ensureUserReferralCode(user);
    const settings = await getReferralSettings();
    await repairLegacyReferralBookings(settings, { "promoCode.code": referralCode });

    const referredBookings = await Booking.find({ "referral.referrer": user._id })
      .populate("customer", "name email")
      .select("serviceName eventName price status paymentStatus referral createdAt completedAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const usedReferralBookings = await Booking.find({
      customer: user._id,
      "referral.referrer": { $ne: null }
    })
      .populate("referral.referrer", "name email referralCode")
      .select("serviceName eventName price status paymentStatus referral createdAt completedAt")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const stats = referredBookings.reduce((acc, booking) => {
      acc.total += 1;
      if (booking.referral?.bonusCredited) {
        acc.completed += 1;
        acc.earned += Number(booking.referral?.bonusAmount) || 0;
      } else {
        acc.pending += 1;
      }
      return acc;
    }, { total: 0, completed: 0, pending: 0, earned: 0, used: usedReferralBookings.length });

    res.json({ referralCode, settings, stats, referredBookings, usedReferralBookings });
  } catch (error) {
    res.status(500).json({ error: "Failed to load referral details" });
  }
});

router.get("/admin", verifyToken, requireRole("admin"), async (_req, res) => {
  try {
    const settings = await getReferralSettings();
    await repairLegacyReferralBookings(settings);

    const referredBookings = await Booking.find({ "referral.referrer": { $ne: null } })
      .populate("customer", "name email")
      .populate("referral.referrer", "name email referralCode")
      .select("serviceName eventName price status paymentStatus referral createdAt completedAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const stats = referredBookings.reduce((acc, booking) => {
      acc.total += 1;
      acc.discountGiven += Number(booking.referral?.discountAmount) || 0;
      if (booking.referral?.bonusCredited) {
        acc.bonusPaid += Number(booking.referral?.bonusAmount) || 0;
      }
      return acc;
    }, { total: 0, discountGiven: 0, bonusPaid: 0 });

    res.json({ settings, stats, referredBookings });
  } catch (error) {
    res.status(500).json({ error: "Failed to load referral settings" });
  }
});

router.get("/merchant", verifyToken, requireRole("merchant", "admin"), async (req, res) => {
  try {
    const settings = await getReferralSettings();
    await repairLegacyReferralBookings(settings, { assignedTo: req.user._id });

    const referredBookings = await Booking.find({
      assignedTo: req.user._id,
      "referral.referrer": { $ne: null }
    })
      .populate("customer", "name email")
      .populate("referral.referrer", "name email referralCode")
      .select("serviceName eventName price status paymentStatus referral createdAt completedAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const stats = referredBookings.reduce((acc, booking) => {
      acc.total += 1;
      acc.discountGiven += Number(booking.referral?.discountAmount) || 0;
      if (booking.referral?.bonusCredited) {
        acc.bonusPaid += Number(booking.referral?.bonusAmount) || 0;
      }
      return acc;
    }, { total: 0, discountGiven: 0, bonusPaid: 0 });

    res.json({ settings, stats, referredBookings });
  } catch (error) {
    res.status(500).json({ error: "Failed to load merchant referral details" });
  }
});

router.post("/merchant", verifyToken, requireRole("merchant", "admin"), async (req, res) => {
  try {
    const discountAmount = Number(req.body.discountAmount);
    const bonusAmount = Number(req.body.bonusAmount);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      return res.status(400).json({ error: "Referral discount must be a valid amount" });
    }
    if (!Number.isFinite(bonusAmount) || bonusAmount < 0) {
      return res.status(400).json({ error: "Referral bonus must be a valid amount" });
    }

    const settings = await saveReferralSettings({
      discountAmount,
      bonusAmount,
      isActive: req.body.isActive !== false
    });

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: "Failed to save referral settings" });
  }
});

router.post("/admin", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const discountAmount = Number(req.body.discountAmount);
    const bonusAmount = Number(req.body.bonusAmount);
    if (!Number.isFinite(discountAmount) || discountAmount < 0) {
      return res.status(400).json({ error: "Referral discount must be a valid amount" });
    }
    if (!Number.isFinite(bonusAmount) || bonusAmount < 0) {
      return res.status(400).json({ error: "Referral bonus must be a valid amount" });
    }

    const settings = await saveReferralSettings({
      discountAmount,
      bonusAmount,
      isActive: req.body.isActive !== false
    });

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: "Failed to save referral settings" });
  }
});

export default router;
