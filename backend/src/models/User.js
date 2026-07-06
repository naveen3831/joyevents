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
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
