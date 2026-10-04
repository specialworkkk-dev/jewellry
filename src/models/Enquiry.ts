import mongoose, { Schema, Document } from 'mongoose';

export interface IEnquiry extends Document {
  shopId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId; // Optional: The product they are enquiring about
  customerName: string;
  customerPhone: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'CONVERTED' | 'CLOSED';
  source: 'WHATSAPP_CLICK' | 'WEBSITE_FORM';
  createdAt: Date;
  updatedAt: Date;
}

const EnquirySchema: Schema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    message: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'], 
      default: 'NEW' 
    },
    source: { 
      type: String, 
      enum: ['WHATSAPP_CLICK', 'WEBSITE_FORM'], 
      default: 'WEBSITE_FORM' 
    },
  },
  { timestamps: true }
);

// Indexes
EnquirySchema.index({ shopId: 1, createdAt: -1 });
EnquirySchema.index({ shopId: 1, status: 1 });

export default mongoose.models.Enquiry || mongoose.model<IEnquiry>('Enquiry', EnquirySchema);
