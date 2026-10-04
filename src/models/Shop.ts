import mongoose, { Schema, Document } from 'mongoose';

export interface IShop extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  whatsappNumber: string;
  businessPhone: string;
  
  // Customization
  logoUrl?: string;
  coverUrl?: string;
  shortDescription?: string;
  
  // Socials
  instagramUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
  // Plan Limits
  maxProducts: number;
  maxPhotosPerDay: number;
  maxVideosPerDay: number;
  
  // Daily Gold Rates
  goldRate22K?: number;
  goldRate24K?: number;
  
  // Link Limits
  maxLinkOpens: number;
  currentLinkOpens: number;
  
  isApproved: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema: Schema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    whatsappNumber: { type: String, required: true },
    businessPhone: { type: String, default: "" },
    
    logoUrl: { type: String },
    coverUrl: { type: String },
    shortDescription: { type: String },
    
    instagramUrl: { type: String },
    facebookUrl: { type: String },
    websiteUrl: { type: String },
    
    maxProducts: { type: Number, default: 50 },
    maxPhotosPerDay: { type: Number, default: 30 },
    maxVideosPerDay: { type: Number, default: 2 },
    
    goldRate22K: { type: Number },
    goldRate24K: { type: Number },
    
    maxLinkOpens: { type: Number, default: 500 },
    currentLinkOpens: { type: Number, default: 0 },
    
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes
ShopSchema.index({ slug: 1 });
ShopSchema.index({ ownerId: 1 });

export default mongoose.models.Shop || mongoose.model<IShop>('Shop', ShopSchema);
