import mongoose, { Schema, Document } from 'mongoose';

export interface IDuplicate extends Document {
  candidateId: mongoose.Schema.Types.ObjectId;
  jobId: mongoose.Schema.Types.ObjectId | null;
}

export interface IDuplicateCandidate extends Document {
  email: string;
  orgId: mongoose.Schema.Types.ObjectId;
  duplicates: IDuplicate[];
}

const duplicateSchema = new Schema<IDuplicate>({
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  jobId: {
    type: Schema.Types.ObjectId,
    ref: 'Job',
    default: null,
  },
});

export const duplicateCandidateSchema = new Schema<IDuplicateCandidate>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    orgId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    duplicates: [duplicateSchema],
  },
  {
    timestamps: true,
  }
);

duplicateCandidateSchema.index({ orgId: 1, email: 1 }, { unique: true });
duplicateCandidateSchema.index({ 'duplicates.candidateId': 1 });

const DuplicateCandidate =
  mongoose.models.DuplicateCandidate ||
  mongoose.model<IDuplicateCandidate>(
    'DuplicateCandidate',
    duplicateCandidateSchema
  );

export default DuplicateCandidate;
