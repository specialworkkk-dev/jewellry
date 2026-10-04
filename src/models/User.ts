import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email?: string;
  mobile: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'PLATFORM_ADMIN' | 'SHOP_OWNER' | 'CUSTOMER';
  shopId?: mongoose.Types.ObjectId; // For SHOP_OWNER
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    mobile: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SHOP_OWNER', 'CUSTOMER'],
      default: 'CUSTOMER',
    },
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop' },
  },
  { timestamps: true }
);

// Indexes
UserSchema.index({ shopId: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
