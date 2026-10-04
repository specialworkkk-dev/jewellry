import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  isSystemDefault: boolean;
  shopId?: mongoose.Types.ObjectId; // If null/undefined, it's a platform-wide system default
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    isSystemDefault: { type: Boolean, default: false },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

// Indexes
CategorySchema.index({ slug: 1, shopId: 1 }, { unique: true }); // A shop can only have one category per slug
CategorySchema.index({ shopId: 1 });

export default mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
