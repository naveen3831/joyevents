import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { sendMerchantCredentials, sendPasswordResetEmail } from "../utils/sendEmail.js";
import {
  validateEmail,
  validatePassword,
  normalizeEmail,
  validateLoginForm,
  validateSignupForm,
  validateNewPasswordForm,
} from "../utils/validation.js";

const router = Router();

const badRequest = (res, message) => res.status(400).json({ error: message });

function toSafeUser(user) {
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return badRequest(res, "name, email, and password are required");
    }
    const signupErr = validateSignupForm(email, password, { name });
    if (signupErr) return badRequest(res, signupErr);
    const normalizedEmail = normalizeEmail(email);
    // Only allow standard users to register publicly
    const userRole = "user";
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role: userRole });
    const safeUser = toSafeUser(user);
    let token;
    const secret = process.env.JWT_SECRET;
    if (secret) {
      token = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, secret, { expiresIn: "7d" });
    }
    return res.status(201).json({ user: safeUser, token });
  } catch (err) {
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return badRequest(res, "email and password are required");
    }
    const loginErr = validateLoginForm(email, password);
    if (loginErr) return badRequest(res, loginErr);
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const safeUser = toSafeUser(user);
    let token;
    const secret = process.env.JWT_SECRET;
    if (secret) {
      token = jwt.sign({ sub: user._id.toString(), email: user.email, role: user.role }, secret, { expiresIn: "7d" });
    }
    return res.json({ user: safeUser, token });
  } catch (err) {
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  res.json({ user: req.user });
});

// Verify token endpoint - used by frontend to validate stored tokens
router.get("/verify", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const safeUser = toSafeUser(user);
    res.json({ user: safeUser });
  } catch (err) {
    res.status(401).json({ error: "Token verification failed" });
  }
});

router.post("/users", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return badRequest(res, "name, email, and password are required");
    }
    const signupErr = validateSignupForm(email, password, { name });
    if (signupErr) return badRequest(res, signupErr);
    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = ["user", "merchant", "admin"].includes(role) ? role : "user";
    const user = await User.create({ name, email: normalizedEmail, passwordHash, role: assignedRole });
    const safeUser = toSafeUser(user);

    if (assignedRole === "merchant") {
      // Send the random generation credential to the new email address
      await sendMerchantCredentials({ name, email, password });
    }

    return res.status(201).json({ user: safeUser, message: "User created successfully" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create user" });
  }
});

router.get("/only-user", verifyToken, requireRole("user", "merchant", "admin"), (_req, res) => {
  res.json({ ok: true, role: "user|merchant|admin" });
});

router.get("/only-merchant", verifyToken, requireRole("merchant", "admin"), (_req, res) => {
  res.json({ ok: true, role: "merchant|admin" });
});

router.get("/only-admin", verifyToken, requireRole("admin"), (_req, res) => {
  res.json({ ok: true, role: "admin" });
});

router.get("/users", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.patch("/users/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { name, email, role, status } = req.body || {};
    const updates = {};
    if (name) updates.name = name;
    if (email) {
      const emailErr = validateEmail(email);
      if (emailErr) return badRequest(res, emailErr);
      updates.email = normalizeEmail(email);
    }
    if (role) updates.role = role;
    if (status) updates.status = status;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// User: Update own profile (name only)
router.patch("/profile", verifyToken, async (req, res) => {
  try {
    const { name } = req.body || {};
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user._id, 
      { name: name.trim() }, 
      { new: true }
    ).select("-passwordHash");
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const safeUser = toSafeUser(user);
    
    res.json({ user: safeUser });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.delete("/users/:id", verifyToken, requireRole("admin"), async (req, res) => {
  try {
   const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Change password endpoint
router.post("/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return badRequest(res, "Current password and new password are required");
    }
    const pwdErr = validateNewPasswordForm(newPassword);
    if (pwdErr) return badRequest(res, pwdErr);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();
    
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// Admin: Reset password for any user
router.patch("/admin/reset-password/:userId", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.userId;
    
    if (!newPassword) {
      return badRequest(res, "New password is required");
    }
    const pwdErr = validateNewPasswordForm(newPassword);
    if (pwdErr) return badRequest(res, pwdErr);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();
    
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// Test endpoint for debugging
router.get("/test", (req, res) => {
 res.json({ 
   message: "Auth routes are working",
    timestamp: new Date().toISOString()
  });
});

// Test profile route accessibility
router.get("/profile-test", (req, res) => {
  res.json({ 
    message: "Profile route is accessible",
    timestamp: new Date().toISOString()
  });
});

// Forgot password — send reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email, redirect } = req.body || {};
    if (!email) return badRequest(res, "Email is required");
    const emailErr = validateEmail(email);
    if (emailErr) return badRequest(res, emailErr);
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    // Always respond OK to prevent email enumeration
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: resetExpires,
        },
      }
    );

    // Resolve frontend URL — prefer env var, but if it's still localhost
    // fall back to the Origin/Referer header so the reset link works on
    // any deployed domain without needing to update .env every time.
    let frontendUrl = process.env.FRONTEND_URL || "";
    const isLocalhost = !frontendUrl ||
      frontendUrl.includes("localhost") ||
      frontendUrl.includes("127.0.0.1");

    if (isLocalhost) {
      // Try to derive the real frontend URL from the request
      const origin = req.headers.origin || req.headers.referer || "";
      if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
        // Strip trailing path from referer to get just the origin
        try {
          const parsed = new URL(origin);
          frontendUrl = `${parsed.protocol}//${parsed.host}`;
        } catch {
          frontendUrl = origin.replace(/\/[^/]*$/, "");
        }
      } else {
        frontendUrl = "http://localhost:8080";
      }
    }

    const resetUrl = `${frontendUrl}/reset-password?token=${token}${redirect ? `&redirect=${encodeURIComponent(String(redirect))}` : ""}`;

    const mailResult = await sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetUrl,
    });

    if (mailResult.sent) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    console.error("[forgot-password] Email not sent:", mailResult.error);
    return res.status(503).json({
      error:
        mailResult.error ||
        "Unable to send reset email. Please try again later.",
    });
  } catch (err) {
    console.error("forgot-password error:", err.message);
    res.status(500).json({
      error: err.message || "Failed to process password reset request",
    });
  }
});

// Reset password — verify token and set new password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return badRequest(res, "Token and new password are required");
    const pwdErr = validateNewPasswordForm(newPassword);
    if (pwdErr) return badRequest(res, pwdErr);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Reset link is invalid or has expired" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
