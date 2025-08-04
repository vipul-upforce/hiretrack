import mongoose, { Schema, Document } from "mongoose";
import { IChecklistField } from "./JobLaneConfig";

// Interface for checklist templates
export interface IChecklistTemplate extends Document {
  organizationId: Schema.Types.ObjectId;
  name: string;
  description?: string;
  type: 'incoming' | 'outgoing'; // Template type
  fields: IChecklistField[];
  isActive: boolean;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const checklistFieldSchema = new Schema<IChecklistField>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['text', 'number', 'email', 'date', 'checkbox', 'radio', 'select', 'multiSelect', 'textarea', 'file']
  },
  required: { type: Boolean, default: false },
  placeholder: String,
  options: [String],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    message: String
  },
  order: { type: Number, required: true }
});

export const checklistTemplateSchema = new Schema<IChecklistTemplate>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    required: true,
    enum: ['incoming', 'outgoing']
  },
  fields: [checklistFieldSchema],
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes
checklistTemplateSchema.index({ organizationId: 1, type: 1 });
checklistTemplateSchema.index({ organizationId: 1, isActive: 1 });

// Update timestamp on save
checklistTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});