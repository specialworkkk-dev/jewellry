import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignVote extends Document {
  pollId: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  actorId: mongoose.Types.ObjectId; // visitor cookie id, or the signed-in user id
  productId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const DesignVoteSchema: Schema = new Schema(
  {
    pollId: { type: Schema.Types.ObjectId, ref: 'DesignPoll', required: true },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  },
  { timestamps: { updatedAt: false } },
);

// One vote per visitor per poll. This index, not application code, is what stops double counting.
DesignVoteSchema.index({ pollId: 1, actorId: 1 }, { unique: true });

export default mongoose.models.DesignVote || mongoose.model<IDesignVote>('DesignVote', DesignVoteSchema);
