import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
  shopId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  linkUrl?: string; // Optional swipe up / click link
  viewsCount: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['IMAGE', 'VIDEO'], default: 'IMAGE' },
    linkUrl: { type: String },
    viewsCount: { type: Number, default: 0 },
    
    // Automatically set expiration to 24 hours from creation
    expiresAt: { 
      type: Date, 
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) 
    },
  },
  { timestamps: true }
);

// TTL Index: MongoDB will automatically delete documents where expiresAt is older than current time
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ shopId: 1, createdAt: -1 });

export default mongoose.models.Story || mongoose.model<IStory>('Story', StorySchema);
