import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformSettings extends Document {
  key: string;
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  defaultMaxProducts: number;
  defaultMaxLinkOpens: number;
  allowPublicRegistration: boolean;
  allowAutoApproval: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformSettingsSchema: Schema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    platformName: { type: String, default: 'LuxeStore SaaS' },
    supportEmail: { type: String, default: 'support@luxestore.com' },
    supportPhone: { type: String, default: '+91 98765 43210' },
    defaultMaxProducts: { type: Number, default: 50 },
    defaultMaxLinkOpens: { type: Number, default: 500 },
    allowPublicRegistration: { type: Boolean, default: true },
    allowAutoApproval: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.PlatformSettings || mongoose.model<IPlatformSettings>('PlatformSettings', PlatformSettingsSchema);
