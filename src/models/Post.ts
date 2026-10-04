import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  shopId: mongoose.Types.ObjectId;
  caption?: string;
  mediaUrls: string[]; // images or videos
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  linkedProductId?: mongoose.Types.ObjectId; // Optional: Link to a specific product
  tags?: string[];
  
  // Interactions
  likesCount: number;
  viewsCount: number;
  
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    caption: { type: String, maxlength: 2200 },
    mediaUrls: [{ type: String, required: true }],
    mediaType: { 
      type: String, 
      enum: ['IMAGE', 'VIDEO', 'CAROUSEL'], 
      default: 'IMAGE' 
    },
    linkedProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    tags: [{ type: String }],
    
    likesCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Optimize for fetching feed chronologically for a specific shop
PostSchema.index({ shopId: 1, createdAt: -1 });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
