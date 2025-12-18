import mongoose, { Schema, ObjectId, HydratedDocument, Model } from 'mongoose';

export interface OrgInfo {
  customFields?: any;
  _id: Schema.Types.ObjectId | string;
  name: string;
  adminId: mongoose.Types.ObjectId | string;
  lanes: string[];
}

export interface Organization {
  _id: ObjectId | string;
  name?: string;
  defaultLanes?: string[];
}

export interface EmailNotificationSettings {
  global: {
    newApplications: boolean;
    interviewAssignments: boolean;
    statusUpdates: boolean;
    newRemarks: boolean;
    stepCompleted: boolean;
    mentions: boolean;
    detailsUpdated: boolean;
    meetingScheduled: boolean;
    meetingUpdated: boolean;
    meetingCancelled: boolean;
    meetingInviteAccepted: boolean;
    meetingInviteDeclined: boolean;
    meetingInviteTentative: boolean;
    followupAdded: boolean;
    followupUpdated: boolean;
    followupRemoved: boolean;
    jobCreated: boolean;
    jobUpdated: boolean;
    userAdded: boolean;
    bulkImportCompleted: boolean;
    candidateRejected: boolean;
    interviewCompleted: boolean;
    candidateMoved: boolean;
  };
  jobLevel: {
    [jobId: string]: {
      newApplications?: boolean;
      interviewAssignments?: boolean;
      statusUpdates?: boolean;
      newRemarks?: boolean;
      stepCompleted?: boolean;
      mentions?: boolean;
      detailsUpdated?: boolean;
      meetingScheduled?: boolean;
      meetingUpdated?: boolean;
      meetingCancelled?: boolean;
      meetingInviteAccepted?: boolean;
      meetingInviteDeclined?: boolean;
      meetingInviteTentative?: boolean;
      followupAdded?: boolean;
      followupUpdated?: boolean;
      followupRemoved?: boolean;
      jobCreated?: boolean;
      jobUpdated?: boolean;
      userAdded?: boolean;
      bulkImportCompleted?: boolean;
      candidateRejected?: boolean;
      interviewCompleted?: boolean;
      candidateMoved?: boolean;
    };
  };
}

export interface RefreshTokenEntry {
  token: string;        // Hashed token
  expiry: Date;
  createdAt: Date;
}

export interface IUser {
  _id: string;
  organizationId: Organization | string;
  organizationInfo?: OrgInfo;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'interviewer' | 'candidate' | 'system';
  password: string;
  createdAt: Date;
  updatedAt: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  refreshTokens?: RefreshTokenEntry[];
  isDeleted?: boolean;
  otpExpires?: Date;
  otp?: number;
  emailNotificationSettings?: EmailNotificationSettings;
  tokenVersion?: number;
}
export interface IUserMethods {
  incrementTokenVersion: () => Promise<number>;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

export const userSchema = new Schema<IUser, UserModel, IUserMethods>(
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
    role: {
      type: String,
      enum: ['hr', 'interviewer', 'admin'],
      required: true,
      default: 'hr',
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
    otp: {
      type: Number,
    },
    otpExpires: {
      type: Date,
    },
    emailNotificationSettings: {
      global: {
        newApplications: { type: Boolean, default: true },
        interviewAssignments: { type: Boolean, default: true },
        statusUpdates: { type: Boolean, default: true },
        newRemarks: { type: Boolean, default: true },
        stepCompleted: { type: Boolean, default: true },
        mentions: { type: Boolean, default: true },
        detailsUpdated: { type: Boolean, default: true },
        meetingScheduled: { type: Boolean, default: true },
        meetingUpdated: { type: Boolean, default: true },
        meetingCancelled: { type: Boolean, default: true },
        meetingInviteAccepted: { type: Boolean, default: true },
        meetingInviteDeclined: { type: Boolean, default: true },
        meetingInviteTentative: { type: Boolean, default: true },
        followupAdded: { type: Boolean, default: true },
        followupUpdated: { type: Boolean, default: true },
        followupRemoved: { type: Boolean, default: true },
        jobCreated: { type: Boolean, default: true },
        jobUpdated: { type: Boolean, default: true },
        userAdded: { type: Boolean, default: true },
        bulkImportCompleted: { type: Boolean, default: true },
        candidateRejected: { type: Boolean, default: true },
        interviewCompleted: { type: Boolean, default: true },
        candidateMoved: { type: Boolean, default: true },
      },
      jobLevel: {
        type: Map,
        of: {
          newApplications: { type: Boolean },
          interviewAssignments: { type: Boolean },
          statusUpdates: { type: Boolean },
          newRemarks: { type: Boolean },
          stepCompleted: { type: Boolean },
          mentions: { type: Boolean },
          detailsUpdated: { type: Boolean },
          meetingScheduled: { type: Boolean },
          meetingUpdated: { type: Boolean },
          meetingCancelled: { type: Boolean },
          meetingInviteAccepted: { type: Boolean },
          meetingInviteDeclined: { type: Boolean },
          meetingInviteTentative: { type: Boolean },
          followupAdded: { type: Boolean },
          followupUpdated: { type: Boolean },
          followupRemoved: { type: Boolean },
          jobCreated: { type: Boolean },
          jobUpdated: { type: Boolean },
          bulkImportCompleted: { type: Boolean },
          candidateRejected: { type: Boolean },
          interviewCompleted: { type: Boolean },
          candidateMoved: { type: Boolean },
        },
        default: new Map(),
      },
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

export default userSchema;

// export const User = mongoose.model<IUser>('User', userSchema)
userSchema.methods.incrementTokenVersion = async function () {
  this.tokenVersion = (this.tokenVersion || 0) + 1;
  await this.save();
  return this.tokenVersion;
};