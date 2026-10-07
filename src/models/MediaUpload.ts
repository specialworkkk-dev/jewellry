import mongoose, { Schema } from 'mongoose';

// Per-shop, per-IST-day upload counters. Incremented atomically at upload time
// so deleting/recreating products cannot bypass daily photo/video limits.
export interface IMediaUpload {
  shopId: mongoose.Types.ObjectId;
  day: string;
  photos: number;
  videos: number;
  expiresAt: Date;
}

const MediaUploadSchema = new Schema<IMediaUpload>({
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  day: { type: String, required: true },
  photos: { type: Number, default: 0 },
  videos: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

MediaUploadSchema.index({ shopId: 1, day: 1 }, { unique: true });
MediaUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.MediaUpload as mongoose.Model<IMediaUpload>)
  || mongoose.model<IMediaUpload>('MediaUpload', MediaUploadSchema);
