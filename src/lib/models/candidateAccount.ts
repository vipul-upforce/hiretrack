import { Schema } from 'mongoose';
import { OrgInfo, RefreshTokenEntry } from './user';

export interface IUCandidateAccount {
  _id: string;
  organizationId: Schema.Types.ObjectId | string;
  organizationInfo?: OrgInfo;
  role: 'candidate';
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  refreshTokens?: RefreshTokenEntry[];
  isDeleted?: boolean;
  appliedApplications: [string];
  otp?: number;
  otpExpires?: Date;
  tokenVersion?: number;
}

export const candidateAccountSchema = new Schema<IUCandidateAccount>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: false,
    },
    password: {
      type: String,
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false,
    },
    role: {
      type: String,
      // enum:["candidate"],
      default: 'candidate',
    },
    resetToken: {
      type: String,
      required: false,
    },
    resetTokenExpiry: {
      type: Date,
      required: false,
    },
    refreshTokens: [{
      token: { type: String, required: true },
      expiry: { type: Date, required: true },
      createdAt: { type: Date, default: Date.now }
    }],
    isDeleted: {
      type: Boolean,
      required: false,
    },
    appliedApplications: {
      type: [String],
      required: false,
    },
    otp: {
      type: Number,
      required: false,
    },
    otpExpires: {
      type: Date,
      required: false,
    },
    tokenVersion: {
      type: Number,
      default: 1,
      required: false,
    },
  },
  {
    timestamps: true,
  },
);

export default candidateAccountSchema;

// export const User = mongoose.model<IUser>('User', userSchema);
