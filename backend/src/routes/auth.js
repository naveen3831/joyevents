import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import * as authController from "../controllers/authController.js";
import User from "../models/User.js";
import Withdrawal from "../models/Withdrawal.js";
import Transaction from "../models/Transaction.js";
import { emitWalletUpdated } from "../realtime.js";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", verifyToken, authController.getMe);
router.get("/verify", verifyToken, authController.verify);
router.post("/users", verifyToken, requireRole("admin"), authController.createUser);
router.get("/only-user", verifyToken, requireRole("user", "merchant", "admin"), authController.onlyUser);
router.get("/only-merchant", verifyToken, requireRole("merchant", "admin"), authController.onlyMerchant);
router.get("/only-admin", verifyToken, requireRole("admin"), authController.onlyAdmin);
router.get("/users", verifyToken, requireRole("admin"), authController.listUsers);
router.patch("/users/:id", verifyToken, requireRole("admin"), authController.updateUser);
router.patch("/profile", verifyToken, authController.updateProfile);
router.delete("/users/:id", verifyToken, requireRole("admin"), authController.deleteUser);
router.post("/change-password", verifyToken, authController.changePassword);
router.patch("/admin/reset-password/:userId", verifyToken, requireRole("admin"), authController.adminResetPassword);
router.get("/test", authController.test);
router.get("/profile-test", authController.profileTest);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.post("/withdraw", verifyToken, async (req, res) => {
  try {
    const { amount, paymentMethod, details } = req.body;
    const withdrawAmount = Number(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal amount" });
    }
    
    const userObj = await User.findById(req.user._id);
    
    if (!userObj || (userObj.walletBalance || 0) < withdrawAmount) {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }
    
    // Deduct amount
    userObj.walletBalance = (userObj.walletBalance || 0) - withdrawAmount;
    await userObj.save();
    
    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      merchant: req.user._id,
      amount: withdrawAmount,
      status: "completed",
      bankDetails: {
        accountHolder: userObj.name,
        bankName: paymentMethod === "upi" ? "UPI Withdrawal" : (details?.bankName || "Bank Transfer"),
        accountNumber: paymentMethod === "upi" ? details?.upiId : (details?.accountNumber || "N/A"),
        ifscCode: paymentMethod === "upi" ? "N/A" : (details?.ifscCode || "N/A")
      },
      requestedAt: new Date(),
      completedAt: new Date(),
      transactionId: `WD-${Date.now()}`
    });
    
    // Create transaction record
    await Transaction.create({
      merchant: req.user._id,
      type: "withdrawal",
      amount: withdrawAmount,
      description: `Wallet withdrawal of ₹${withdrawAmount} via ${paymentMethod.toUpperCase()}`,
      status: "completed",
      relatedId: withdrawal._id.toString()
    });
    
    emitWalletUpdated(req.user._id, userObj.walletBalance);
    
    res.json({ success: true, walletBalance: userObj.walletBalance, withdrawal });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

router.post("/add-wallet-funds", verifyToken, async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const depositAmount = Number(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      return res.status(400).json({ error: "Invalid deposit amount" });
    }
    
    // Simulate payment authorization
    if (paymentMethod === "card") {
      if (!paymentDetails?.cardNumber || !paymentDetails?.cvv) {
        return res.status(400).json({ error: "Missing card payment details" });
      }
    } else if (paymentMethod === "upi") {
      if (!paymentDetails?.upiId) {
        return res.status(400).json({ error: "Missing UPI payment details" });
      }
    } else {
      return res.status(400).json({ error: "Invalid payment method" });
    }

    const userObj = await User.findById(req.user._id);
    if (!userObj) {
      return res.status(404).json({ error: "User not found" });
    }

    userObj.walletBalance = (userObj.walletBalance || 0) + depositAmount;
    await userObj.save();

    // Record wallet credit transaction
    await Transaction.create({
      merchant: req.user._id,
      type: "refund", // Using refund type for positive wallet credit transactions
      amount: depositAmount,
      description: `Wallet deposit of ₹${depositAmount} via ${paymentMethod.toUpperCase()}`,
      status: "completed",
      relatedId: `DEP-${Date.now()}`
    });

    emitWalletUpdated(req.user._id, userObj.walletBalance);

    res.json({ success: true, walletBalance: userObj.walletBalance });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

export default router;
