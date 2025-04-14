import mongoose from "mongoose";

const FormFieldSchema = new mongoose.Schema({
  moduleType: {
    type: String,
    enum: ["jobs", "candidates"],
    required: true,
  },
  fieldType: {
    type: String,
    enum: [
      "text",
      "number",
      "select",
      "multiSelect",
      "radio",
      "checkbox",
      "date",
      "file",
      "textarea",
      "chip",
    ],
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  isRequired: {
    type: Boolean,
    default: false,
  },
  defaultValue: mongoose.Schema.Types.Mixed,
  options: [String], // For select, multiSelect, radio
  isPermanent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const FormField = mongoose.model("FormField", FormFieldSchema);

export interface FormField {
  _id: string;
  moduleType: string;
  fieldType: string;
  label: string;
  name: string;
  isRequired: boolean;
  defaultValue?: string | string[];
  options?: string[];
  isPermanent: boolean;
  createdAt: Date;
  maxSize?: number;
  maxFiles?: number;
}
