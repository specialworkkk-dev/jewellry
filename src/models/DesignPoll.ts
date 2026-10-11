import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignPollCandidate {
  productId: mongoose.Types.ObjectId;
  votes: number;
}

export interface IDesignPoll extends Document {
  shopId: mongoose.Types.ObjectId;
  title: string;
  /** In the order the owner chose; that order breaks ties. */
  candidates: IDesignPollCandidate[];
  totalVotes: number;
  status: 'ACTIVE' | 'CLOSED';
  startsAt: Date;
  endsAt: Date; // exact end instant (set to the early-end moment when the owner ends it)
  closedAt?: Date;
  winnerProductId?: mongoose.Types.ObjectId;
  endedEarly: boolean;
  flagsAppliedAt?: Date; // Product.isDesignOfTheWeek written for this close
  flagsClearedAt?: Date; // featuring window over and the flag cleared
  createdAt: Date;
  updatedAt: Date;
}

const CandidateSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    votes: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const DesignPollSchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    title: { type: String, required: true, maxlength: 80 },
    candidates: { type: [CandidateSchema], required: true },
    totalVotes: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'CLOSED'], default: 'ACTIVE' },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    closedAt: { type: Date },
    winnerProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    endedEarly: { type: Boolean, default: false },
    flagsAppliedAt: { type: Date },
    flagsClearedAt: { type: Date },
  },
  { timestamps: true },
);

// Only ONE active poll per shop, enforced by the database (no check-then-insert race).
DesignPollSchema.index(
  { shopId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' }, name: 'one_active_poll_per_shop' },
);
// Latest poll for a shop / history list.
DesignPollSchema.index({ shopId: 1, createdAt: -1 });

export default mongoose.models.DesignPoll || mongoose.model<IDesignPoll>('DesignPoll', DesignPollSchema);
