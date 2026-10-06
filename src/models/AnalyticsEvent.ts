import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsEvent extends Document {
  shopId: mongoose.Types.ObjectId;
  eventType: 'SHOP_VIEW' | 'PRODUCT_VIEW' | 'STORY_VIEW' | 'WHATSAPP_CLICK';
  targetId?: mongoose.Types.ObjectId; // Product ID or Story ID
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}

const AnalyticsEventSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    eventType: { 
      type: String, 
      enum: ['SHOP_VIEW', 'PRODUCT_VIEW', 'STORY_VIEW', 'WHATSAPP_CLICK'], 
      required: true 
    },
    targetId: { type: Schema.Types.ObjectId },
    userAgent: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: { updatedAt: false } }
);

// Indexes for fast dashboard aggregations
AnalyticsEventSchema.index({ shopId: 1, eventType: 1, createdAt: -1 });
// Keep the free/shared database from growing forever. Dashboard analytics are a
// rolling 90-day view; business records such as enquiries are never affected.
AnalyticsEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, name: "analytics_90_day_retention" },
);

export default mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);
