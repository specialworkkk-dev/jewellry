import mongoose, { Schema } from "mongoose";

const PushSubscriptionSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    endpoint: { type: String, required: true, maxlength: 2048 },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true, maxlength: 512 },
      auth: { type: String, required: true, maxlength: 512 },
    },
    userAgent: { type: String, default: "", maxlength: 500 },
    failureCount: { type: Number, default: 0, min: 0 },
    lastDeliveredAt: { type: Date },
  },
  { timestamps: true },
);

PushSubscriptionSchema.index({ shopId: 1, endpoint: 1 }, { unique: true });

export default mongoose.models.PushSubscription
  || mongoose.model("PushSubscription", PushSubscriptionSchema);

