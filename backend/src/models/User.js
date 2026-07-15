import mongoose from "mongoose";
import { validateEmail } from "../utils/validation.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator(value) {
          return validateEmail(value) === null;
        },
        message: (props) =>
          validateEmail(props.value) ||
          "Enter a valid email like user@gmail.com (letters and numbers only)",
      },
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "merchant", "admin"],
      default: "user",
      required: true
    },
    status: {
      type: String,
      enum: ["active", "deactivated"],
      default: "active",
      required: true
    },
    mobile: { type: String, trim: true },
    merchantStatus: {
      type: String,
      enum: ["details_pending", "details_submitted", "quotation_sent", "paid", "active"],
      default: "details_pending"
    },
    merchantDetails: {
      businessName: { type: String, trim: true },
      businessDescription: { type: String, trim: true },
      eventTypes: [String],
      serviceTypes: [String],
      experienceYears: { type: Number },
      address: { type: String, trim: true }
    },
    quotationAmount: { type: Number, default: 0 },
    maxEvents: { type: Number, default: 5 },
    maxServices: { type: Number, default: 5 },
    walletBalance: { type: Number, default: 0 },
    referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", function setReferralCode(next) {
  if (!this.referralCode && this._id) {
    this.referralCode = `JOY-${this._id.toString().slice(-6).toUpperCase()}`;
  }
  next();
});

export default mongoose.models.User || mongoose.model("User", userSchema);
