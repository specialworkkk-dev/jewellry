import mongoose, { Schema } from 'mongoose';

// One record per issued upload key. "pending" holds a daily-quota unit until the
// client confirms (server verifies the stored object) or the reservation expires,
// at which point the unit is returned. Only "confirmed" keys may be attached to
// products and other content.
export interface IMediaReservation {
  shopId: mongoose.Types.ObjectId;
  key: string;
  kind: 'photos' | 'videos';
  day: string;
  contentType: string;
  contentLength: number;
  state: 'pending' | 'confirmed' | 'rejected' | 'expired';
  expiresAt: Date;
  purgeAt: Date;
}

const MediaReservationSchema = new Schema<IMediaReservation>({
  shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
  key: { type: String, required: true },
  kind: { type: String, enum: ['photos', 'videos'], required: true },
  day: { type: String, required: true },
  contentType: { type: String, required: true },
  contentLength: { type: Number, required: true },
  state: { type: String, enum: ['pending', 'confirmed', 'rejected', 'expired'], default: 'pending' },
  expiresAt: { type: Date, required: true },
  purgeAt: { type: Date, required: true },
});

MediaReservationSchema.index({ key: 1 }, { unique: true });
MediaReservationSchema.index({ shopId: 1, state: 1, expiresAt: 1 });
MediaReservationSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.MediaReservation as mongoose.Model<IMediaReservation>)
  || mongoose.model<IMediaReservation>('MediaReservation', MediaReservationSchema);
