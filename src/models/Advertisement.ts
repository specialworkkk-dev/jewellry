import mongoose, { Schema, Document } from 'mongoose';

export interface IAdvertisement extends Document {
  shopId: mongoose.Types.ObjectId;
  title: string;
  type: 'HERO_BANNER' | 'PROMO_STRIP' | 'GOLD_RATE';
  message: string;
  imageUrl?: string;
  linkUrl?: string; // Where it leads when clicked
  isActive: boolean;
  validUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdvertisementSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    title: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['HERO_BANNER', 'PROMO_STRIP', 'GOLD_RATE'], 
      default: 'PROMO_STRIP' 
    },
    message: { type: String, required: true },
    imageUrl: { type: String },
    linkUrl: { type: String },
    isActive: { type: Boolean, default: true },
    validUntil: { type: Date },
  },
  { timestamps: true }
);

// Indexes
AdvertisementSchema.index({ shopId: 1, isActive: 1 });

export default mongoose.models.Advertisement || mongoose.model<IAdvertisement>('Advertisement', AdvertisementSchema);
