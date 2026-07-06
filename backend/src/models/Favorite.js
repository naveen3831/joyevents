import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
    service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
    type: { type: String, enum: ["event", "service"], required: true }
  },
  { timestamps: true }
);

// Ensure a user can only favorite an item once
favoriteSchema.index({ user: 1, event: 1, service: 1 }, { unique: true, sparse: true });

export default mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);
