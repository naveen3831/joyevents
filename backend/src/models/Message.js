import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderName:  { type: String, required: true },
  senderEmail: { type: String, required: true },
  message:     { type: String, required: true },
  merchant:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  eventId:     { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },
  serviceId:   { type: mongoose.Schema.Types.ObjectId, ref: "Service", default: null },
  itemTitle:   { type: String, default: "" },
  read:        { type: Boolean, default: false },
  replies:     [{
    from:      { type: String, enum: ["merchant", "customer"], required: true },
    text:      { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
  customerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
