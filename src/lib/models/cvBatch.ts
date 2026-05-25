import mongoose from 'mongoose';

export interface ICVBatchItem {
  filename: string;
  candidateId?: mongoose.Types.ObjectId;
  status: 'success' | 'failed' | 'pending';
  message?: string;
  error?: string;
  processedAt: Date;
  /** `bulk` = Bulk CV AI; `premium` = Settings → AI Providers. */
  cvParseMode?: 'bulk' | 'premium';
  /** Provider id used for this file (bulk slot or premium active provider). */
  usedProvider?: string;
  /** Human-readable label, e.g. "Bulk parsing · Groq". */
  parseProviderLabel?: string;
}

export interface ICVBatchPendingItem {
  filename: string;
  status: 'pending' | 'processed' | 'failed';
  file: {
    id?: string;
    name: string;
    url: string;
    type: string;
    size: number;
  };
  selected: boolean;
  error?: string;
  processedAt?: Date;
}

export interface ICVBatch {
  organizationId: mongoose.Types.ObjectId;
  totalFiles: number;
  successCount: number;
  failureCount: number;
  items: ICVBatchItem[];
  pendingItems: ICVBatchPendingItem[];
  processingMode: 'immediate' | 'deferred';
  operationsSnapshot?: {
    assignJob?: boolean;
    jobId?: string;
    updateStatus?: boolean;
    status?: string;
    addRemark?: boolean;
    remark?: string;
    isRemarkPrivate?: boolean;
    remarkRating?: number | null;
  };
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  historyAt: Date;
  createdBy?: mongoose.Types.ObjectId;
}

const cvBatchItemSchema = new mongoose.Schema<ICVBatchItem>({
  filename: { type: String, required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  status: { type: String, required: true, enum: ['success', 'failed', 'pending'] },
  message: { type: String },
  error: { type: String },
  processedAt: { type: Date, default: Date.now },
  cvParseMode: { type: String, enum: ['bulk', 'premium'] },
  usedProvider: { type: String },
  parseProviderLabel: { type: String },
});

const cvBatchPendingItemSchema = new mongoose.Schema<ICVBatchPendingItem>({
  filename: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  },
  file: {
    id: { type: String },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    size: { type: Number, required: true },
  },
  selected: { type: Boolean, required: true, default: false },
  error: { type: String },
  processedAt: { type: Date },
});

const cvBatchSchema = new mongoose.Schema<ICVBatch>(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Organization',
    },
    totalFiles: { type: Number, required: true },
    successCount: { type: Number, required: true, default: 0 },
    failureCount: { type: Number, required: true, default: 0 },
    items: [cvBatchItemSchema],
    pendingItems: [cvBatchPendingItemSchema],
    processingMode: {
      type: String,
      required: true,
      enum: ['immediate', 'deferred'],
      default: 'immediate',
    },
    operationsSnapshot: {
      assignJob: { type: Boolean },
      jobId: { type: String },
      updateStatus: { type: Boolean },
      status: { type: String },
      addRemark: { type: Boolean },
      remark: { type: String },
      isRemarkPrivate: { type: Boolean },
      remarkRating: { type: Number },
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'processing',
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    historyAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
  },
);

// Index for checking duplicate pending filenames during CV uploads
cvBatchSchema.index(
  {
    organizationId: 1,
    status: 1,
    'pendingItems.filename': 1,
    'pendingItems.status': 1,
  },
  { name: 'idx_org_status_pendingItems_filename_pendingStatus', background: true },
);

cvBatchSchema.index(
  {
    organizationId: 1,
    historyAt: -1,
    _id: -1,
  },
  { name: 'idx_org_historyAt_id', background: true },
);

cvBatchSchema.index(
  {
    organizationId: 1,
    status: 1,
    processingMode: 1,
    createdAt: -1,
    _id: -1,
  },
  { name: 'idx_org_status_processingMode_createdAt_id', background: true },
);

export default cvBatchSchema;
