import mongoose, { Schema } from "mongoose";

const NotificationJobSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    trigger: { type: String, required: true, maxlength: 80 },
    context: {
      entityId: { type: String, maxlength: 100 },
      productName: { type: String, maxlength: 200 },
    },
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
