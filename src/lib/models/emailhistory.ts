import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailHistory extends Document {
  organizationId: mongoose.Types.ObjectId;
  sentBy: mongoose.Types.ObjectId;
  sentByEmail: string;
  sentByName: string;
  recipientType: string;
  recipientId: mongoose.Types.ObjectId;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  cc: string[];
  bcc: string[];
  replyTo?: string;
  attachments: Array<{
    fileName: string;
    fileSize: number;
    shareId: string;
    shareUrl: string;
  }>;
  status: 'sent' | 'failed' | 'pending';
  provider: string;
  providerMessageId?: string;
  error?: string;
  metadata?: {
    jobId?: mongoose.Types.ObjectId;
    candidateId?: mongoose.Types.ObjectId;
    templateUsed?: string;
  };
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EmailHistorySchema = new Schema<IEmailHistory>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    sentBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sentByEmail: {
      type: String,
      required: true,
    },
    sentByName: {
      type: String,
      required: true,
    },
    recipientType: {
      type: String,
      required: true,
      default: 'candidate',
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      refPath: 'recipientType',
      required: true,
      index: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      index: true,
    },
    recipientName: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    cc: [{
      type: String,
    }],
    bcc: [{
      type: String,
    }],
    replyTo: {
      type: String,
    },
    attachments: [{
      fileName: {
        type: String,
        required: true,
      },
      fileSize: {
        type: Number,
        required: true,
      },
      shareId: {
        type: String,
        required: true,
      },
      shareUrl: {
        type: String,
        required: true,
      },
    }],
    status: {
      type: String,
      enum: ['sent', 'failed', 'pending'],
      default: 'pending',
      index: true,
    },
    provider: {
      type: String,
      required: true,
    },
    providerMessageId: String,
    error: String,
    metadata: {
      jobId: {
        type: Schema.Types.ObjectId,
        ref: 'Job',
      },
      candidateId: {
        type: Schema.Types.ObjectId,
        ref: 'Candidate',
      },
      templateUsed: String,
    },
    sentAt: Date,
  },
  { timestamps: true },
);

// Compound indexes for common queries
EmailHistorySchema.index({ organizationId: 1, sentAt: -1 });
EmailHistorySchema.index({ organizationId: 1, recipientEmail: 1, sentAt: -1 });
EmailHistorySchema.index({ organizationId: 1, sentBy: 1, sentAt: -1 });

// Text index for searching email content
EmailHistorySchema.index({ subject: 'text', body: 'text', recipientEmail: 'text' });

export default EmailHistorySchema;
