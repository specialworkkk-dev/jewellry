import mongoose, { Schema } from "mongoose";
import { customerNotificationTriggers } from "@/lib/notification-templates";

const TriggerSettingSchema = new Schema(
  {
    trigger: { type: String, enum: customerNotificationTriggers, required: true },
    enabled: { type: Boolean, default: true },
    templateId: { type: String, required: true, maxlength: 80 },
    customTitle: { type: String, default: "", maxlength: 100 },
    customBody: { type: String, default: "", maxlength: 240 },
  },
  { _id: false },
);

const ShopNotificationSettingsSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, unique: true, index: true },
    enabled: { type: Boolean, default: true },
    triggers: { type: [TriggerSettingSchema], default: [] },
  },
  { timestamps: true },
);

export default mongoose.models.ShopNotificationSettings
  || mongoose.model("ShopNotificationSettings", ShopNotificationSettingsSchema);

