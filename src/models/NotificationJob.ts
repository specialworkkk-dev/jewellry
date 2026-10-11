import mongoose, { Schema } from "mongoose";

const NotificationJobSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    trigger: { type: String, required: true, maxlength: 80 },
    context: {
      entityId: { type: String, maxlength: 100 },
      productName: { type: String, maxlength: 200 },
      // Numeric price shown in price-drop alerts (formatted as INR when the message is built).
      price: { type: Number, min: 0 },
    },
    // Targeted alerts (price drop / back in stock): ONLY these subscriptions are notified. When the
    // field exists (even as an empty list) the job must never broadcast to the whole shop.
    audienceSubscriptionIds: { type: [Schema.Types.ObjectId], default: undefined },
    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "DELIVERED", "FAILED"],
      default: "PENDING",
      required: true,
    },
    attempts: { type: Number, default: 0, min: 0, max: 5 },
    availableAt: { type: Date, default: Date.now, required: true },
    lockedAt: { type: Date },
    // Subscriptions that failed on the previous attempt; retries target only these.
    retrySubscriptionIds: { type: [Schema.Types.ObjectId], default: undefined },
    deliveredAt: { type: Date },
    lastError: { type: String, maxlength: 500 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

NotificationJobSchema.index({ status: 1, availableAt: 1 });
NotificationJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.NotificationJob
  || mongoose.model("NotificationJob", NotificationJobSchema);
