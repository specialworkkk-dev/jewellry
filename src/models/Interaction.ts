import mongoose, { Schema, Document } from 'mongoose';

export interface IInteraction extends Document {
  userId: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId; // ID of the Product or Post
  targetType: 'PRODUCT' | 'POST';
  interactionType: 'LIKE' | 'FAVORITE' | 'FOLLOW';
  createdAt: Date;
}

const InteractionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    targetId: { type: Schema.Types.ObjectId, required: true }, // The ID of the product/post/shop itself
    targetType: { type: String, enum: ['PRODUCT', 'POST', 'SHOP'], required: true },
    interactionType: { type: String, enum: ['LIKE', 'FAVORITE', 'FOLLOW'], required: true },
  },
  { timestamps: { updatedAt: false } } // Only need createdAt for chronological sorting
);

// Crucial: Prevent a user from liking the exact same product twice
InteractionSchema.index({ userId: 1, targetId: 1, interactionType: 1 }, { unique: true });

// Optimize counting likes for a specific product/post
InteractionSchema.index({ targetId: 1, interactionType: 1 });

// Optimize owner dashboard totals without scanning interactions from other shops.
InteractionSchema.index({ shopId: 1, interactionType: 1 });

// Optimize finding all favorites for a specific user
InteractionSchema.index({ userId: 1, interactionType: 1 });

export default mongoose.models.Interaction || mongoose.model<IInteraction>('Interaction', InteractionSchema);
