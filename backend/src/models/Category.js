import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ["event", "service"], required: true }
    },
    { timestamps: true }
);

categorySchema.index({ name: 1, type: 1 }, { unique: true });

export default mongoose.models.Category || mongoose.model("Category", categorySchema);
