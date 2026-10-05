import mongoose, { Document, Schema } from "mongoose";

export interface IInfrastructureSnapshot extends Document {
  checkedAt: Date;
  source: "manual" | "cron";
  report: Record<string, unknown>;
  alerts: Array<Record<string, unknown>>;
}

const InfrastructureSnapshotSchema = new Schema(
  {
    checkedAt: { type: Date, required: true, index: true },
    source: { type: String, enum: ["manual", "cron"], required: true },
    report: { type: Schema.Types.Mixed, required: true },
    alerts: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

InfrastructureSnapshotSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 180 * 24 * 60 * 60 },
);

export default mongoose.models.InfrastructureSnapshot
  || mongoose.model<IInfrastructureSnapshot>("InfrastructureSnapshot", InfrastructureSnapshotSchema);
