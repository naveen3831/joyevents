import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import { sendMerchantCredentials, sendPasswordResetEmail } from "../utils/sendEmail.js";
import {
  validateEmail,
  validatePassword,
  normalizeEmail,
  validateLoginForm,
  validateSignupForm,
  validateNewPasswordForm,
} from "../utils/validation.js";

const badRequest = (res, message) => res.status(400).json({ error: message });

function toSafeUser(user) {
  let mStatus = user.merchantStatus;
  if (user.role === "merchant" && !mStatus) {
    if (user.merchantDetails && user.merchantDetails.businessName) {
      mStatus = user.quotationAmount > 0 ? "quotation_sent" : "details_submitted";
    } else {
      mStatus = "details_pending";
    }
  }
  return {
    _id: user._id,
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mobile: user.mobile,
    merchantStatus: mStatus,
    merchantDetails: user.merchantDetails,
    quotationAmount: user.quotationAmount,
    maxEvents: user.maxEvents,
    maxServices: user.maxServices,
    walletBalance: user.walletBalance || 0,
    referralCode: user.referralCode || (user._id ? `JOY-${user._id.toString().slice(-6).toUpperCase()}` : ""),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const register = async (req, res) => {
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
};

export const login = async (req, res) => {
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
    if (user.status === "deactivated") {
      return res.status(403).json({ error: "Your account has been deactivated. Please contact the administrator." });
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
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const verify = async (req, res) => {
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
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile } = req.body || {};
    if (!name || !email || !password) {
      return badRequest(res, "name, email, and password are required");
    }
    if (role === "merchant" && (!mobile || mobile.replace(/[^0-9]/g, "").length !== 12)) {
      return badRequest(res, "Mobile number must be exactly 12 digits");
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
    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: assignedRole,
      mobile,
      merchantStatus: assignedRole === "merchant" ? "details_pending" : undefined
    });
    const safeUser = toSafeUser(user);

    let emailSent = false;
    if (assignedRole === "merchant") {
      try {
        emailSent = await sendMerchantCredentials({ name, email, password });
      } catch (emailErr) {
        console.error("SMTP error sending merchant credentials:", emailErr);
      }
    }

    return res.status(201).json({ 
      user: safeUser, 
      message: assignedRole === "merchant"
        ? (emailSent 
            ? "Merchant created successfully and welcome credentials emailed!" 
            : "Merchant created successfully, but welcome email failed. Check SMTP configuration in .env.")
        : "User created successfully",
      emailSent
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create user" });
  }
};

export const onlyUser = (_req, res) => {
  res.json({ ok: true, role: "user|merchant|admin" });
};

export const onlyMerchant = (_req, res) => {
  res.json({ ok: true, role: "merchant|admin" });
};

export const onlyAdmin = (_req, res) => {
  res.json({ ok: true, role: "admin" });
};

export const listUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-passwordHash").sort({ createdAt: -1 });
    res.json({ users: users.map(toSafeUser) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (targetUser.role === "admin") {
      return res.status(403).json({ error: "System Admin account cannot be modified here." });
    }

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
    res.json({ user: toSafeUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
};

export const updateProfile = async (req, res) => {
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
};

export const deleteUser = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (targetUser.role === "admin") {
      return res.status(403).json({ error: "System Admin account cannot be deleted." });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

export const changePassword = async (req, res) => {
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
};

export const adminResetPassword = async (req, res) => {
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
    if (user.role === "admin") {
      return res.status(403).json({ error: "System Admin password cannot be reset from user management." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;
    await user.save();
    
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password" });
  }
};

export const test = (req, res) => {
  res.json({ 
    message: "Auth routes are working",
    timestamp: new Date().toISOString()
  });
};

export const profileTest = (req, res) => {
  res.json({ 
    message: "Profile route is accessible",
    timestamp: new Date().toISOString()
  });
};

export const forgotPassword = async (req, res) => {
  try {
    const { email, redirect } = req.body || {};
    if (!email) return badRequest(res, "Email is required");
    const emailErr = validateEmail(email);
    if (emailErr) return badRequest(res, emailErr);
    const normalizedEmail = normalizeEmail(email);

    const user = await User.findOne({
      email: { $regex: new RegExp(`^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
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

    let frontendUrl = process.env.FRONTEND_URL || "";
    const isLocalhost = !frontendUrl ||
      frontendUrl.includes("localhost") ||
      frontendUrl.includes("127.0.0.1");

    if (isLocalhost) {
      const origin = req.headers.origin || req.headers.referer || "";
      if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
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
};

export const resetPassword = async (req, res) => {
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
};
