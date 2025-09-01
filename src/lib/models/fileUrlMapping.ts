
import { Schema, Document } from "mongoose";

export interface IFileUrlMapping extends Document {
  fileId: string;
  realUrl: string;
}

export const FileUrlMappingSchema = new Schema<IFileUrlMapping>(
  {
    fileId: { type: String, required: true, unique: true, index: true },
    realUrl: { type: String, required: true },
  },
  { timestamps: true }
);
