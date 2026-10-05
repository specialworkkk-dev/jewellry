import mongoose, { Document, Schema } from "mongoose";

export interface IShopVisitor extends Document {
  shopId: mongoose.Types.ObjectId;
  ipHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

const ShopVisitorSchema = new Schema<IShopVisitor>({
  shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
  ipHash: { type: String, required: true },
  firstSeenAt: { type: Date, required: true, default: Date.now },
  lastSeenAt: { type: Date, required: true, default: Date.now },
});

ShopVisitorSchema.index({ shopId: 1, ipHash: 1 }, { unique: true });
ShopVisitorSchema.index({ shopId: 1, firstSeenAt: -1 });

export default mongoose.models.ShopVisitor
  || mongoose.model<IShopVisitor>("ShopVisitor", ShopVisitorSchema);
