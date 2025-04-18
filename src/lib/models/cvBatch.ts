import mongoose from "mongoose";

export interface ICVBatchItem {
  filename: string;
  candidateId?: mongoose.Types.ObjectId;
  status: "success" | "failed";
  message?: string;
  error?: string;
  processedAt: Date;
}

export interface ICVBatch {
  organizationId: mongoose.Types.ObjectId;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  items: ICVBatchItem[];
  status: "processing" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const cvBatchItemSchema = new mongoose.Schema<ICVBatchItem>({
  filename: { type: String, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate" },
  status: { type: String, required: true, enum: ["success", "failed"] },
  message: { type: String },
  error: { type: String },
  processedAt: { type: Date, default: Date.now },
});

const cvBatchSchema = new mongoose.Schema<ICVBatch>(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Organization",
    },
    totalFiles: { type: Number, required: true },
    successCount: { type: Number, required: true, default: 0 },
    failureCount: { type: Number, required: true, default: 0 },
    items: [cvBatchItemSchema],
    status: {
      type: String,
      required: true,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

export default cvBatchSchema;
