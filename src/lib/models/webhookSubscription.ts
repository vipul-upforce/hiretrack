import mongoose, { Schema } from 'mongoose';

export interface IWebhookSubscription {
  organizationId: string;
  resourceId: string; // Google Calendar resource ID
  channelId: string; // Unique channel identifier
  eventId: string; // Google Calendar event ID
  candidateId: string; // Associated candidate
  jobId: string; // Associated job
  expirationTime: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const webhookSubscriptionSchema = new Schema<IWebhookSubscription>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    resourceId: {
      type: String,
      required: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    candidateId: {
      type: String,
      required: true,
      index: true,
    },
    jobId: {
      type: String,
      required: true,
      index: true,
    },
    expirationTime: {
      type: Date,
      required: true,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for efficient queries
webhookSubscriptionSchema.index({ organizationId: 1, eventId: 1 });
webhookSubscriptionSchema.index({ organizationId: 1, active: 1, expirationTime: 1 });
webhookSubscriptionSchema.index({ channelId: 1, active: 1 });

export default webhookSubscriptionSchema;
