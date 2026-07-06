import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price:       { type: Number, required: true },
    category:    { type: String, default: "General" },
    highlights:  { type: [String], default: [] },
    qrCodeCustomUrl: { type: String, default: "" },
    qrCodeActive: { type: Boolean, default: true },
    image:       { type: String, default: "" },
    gallery:     [{ type: String }], // Array of image URLs from Cloudinary
    active:      { type: Boolean, default: true },
    addOns:      [{
      name:           { type: String, required: true },
      price:          { type: Number, required: true },
      maxQuantity:    { type: Number, default: 1 },
      minQuantity:    { type: Number, default: 1 },
      guestLabel:     { type: String, default: "guests" },
      showGuestCount: { type: Boolean, default: false }
    }],
    allowGuests:  { type: Boolean, default: false },  // show guest count option
    maxGuests:    { type: Number, default: 100 },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

export default mongoose.models.Service || mongoose.model("Service", serviceSchema);
