import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  shopId: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  categoryId: mongoose.Types.ObjectId;
  description: string;
  images: string[];
  videos: string[];
  
  // Pricing
  priceType: 'FIXED_PRICE' | 'STARTING_FROM' | 'PRICE_ON_REQUEST' | 'CONTACT_FOR_PRICE';
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  
  // Jewellery Specific Details
  goldPurity?: '14K' | '18K' | '22K' | '24K';
  goldWeight?: number; // in grams
  diamondWeight?: number; // in carats
  stoneType?: string;
  stoneWeight?: number;
  makingCharges?: number;
  makingChargesDiscountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  makingChargesDiscountValue?: number;
  
  // Tagging & Status
  isPublished: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestseller: boolean;
  isBridalCollection: boolean;
  
  // Stats
  likesCount: number;
  viewsCount: number;
  sharesCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    description: { type: String },
    images: [{ type: String }],
    videos: [{ type: String }],
    
    priceType: {
      type: String,
      enum: ['FIXED_PRICE', 'STARTING_FROM', 'PRICE_ON_REQUEST', 'CONTACT_FOR_PRICE'],
      default: 'PRICE_ON_REQUEST',
    },
    price: { type: Number },
    originalPrice: { type: Number },
    discountPercentage: { type: Number, min: 0, max: 100 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
    discountValue: { type: Number, min: 0 },
    
    goldPurity: {
      type: String,
      enum: ['14K', '18K', '22K', '24K'],
    },
    goldWeight: { type: Number },
    diamondWeight: { type: Number },
    stoneType: { type: String },
    stoneWeight: { type: Number },
    makingCharges: { type: Number, min: 0 },
    makingChargesDiscountType: { type: String, enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
    makingChargesDiscountValue: { type: Number, min: 0 },
    
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isBestseller: { type: Boolean, default: false },
    isBridalCollection: { type: Boolean, default: false },
    
    likesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes for fast querying on the public storefront
ProductSchema.index({ shopId: 1, isPublished: 1 });
ProductSchema.index({ shopId: 1, categoryId: 1 });
ProductSchema.index({ shopId: 1, createdAt: -1 });
ProductSchema.index({ shopId: 1, viewsCount: -1, likesCount: -1 });
ProductSchema.index({ sku: 1, shopId: 1 }, { unique: true }); // SKU must be unique per shop

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
