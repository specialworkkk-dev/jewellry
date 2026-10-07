import mongoose, { Schema } from "mongoose";

// Owner-device subscriptions are deliberately separate from customer shop
// subscriptions: they are created only by the authenticated owner of the shop.
const OwnerPushSubscriptionSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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

OwnerPushSubscriptionSchema.index({ shopId: 1, endpoint: 1 }, { unique: true });

export default mongoose.models.OwnerPushSubscription
  || mongoose.model("OwnerPushSubscription", OwnerPushSubscriptionSchema);
