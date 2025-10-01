import mongoose, { Schema, ObjectId } from "mongoose";

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
  };
  jobLevel: {
    [jobId: string]: {
      newApplications?: boolean;
      interviewAssignments?: boolean;
      statusUpdates?: boolean;
      newRemarks?: boolean;
      stepCompleted?: boolean;
      mentions?: boolean;
    };
  };
}

export interface IUser {
  _id: string;
  organizationId: Organization | string;
  organizationInfo?: OrgInfo;
  name: string;
  email: string;
  role: "admin" | "hr" | "interviewer" | "candidate";
  password: string;
  createdAt: Date;
  updatedAt: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  isDeleted?: boolean;
  otpExpires?: Date;
  otp?: number;
  emailNotificationSettings?: EmailNotificationSettings;
}

export const userSchema = new Schema<IUser>(
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
      enum: ["hr", "interviewer", "admin"],
      required: true,
      default: "hr",
    },
    password: {
      type: String,
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
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
        newApplications: {
          type: Boolean,
          default: true,
        },
        interviewAssignments: {
          type: Boolean,
          default: true,
        },
        statusUpdates: {
          type: Boolean,
          default: true,
        },
        newRemarks: {
          type: Boolean,
          default: true,
        },
        stepCompleted: {
          type: Boolean,
          default: true,
        },
        mentions: {
          type: Boolean,
          default: true,
        },
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
        },
        default: new Map(),
      },
    },
  },
  {
    timestamps: true,
  }
);

export default userSchema;

// export const User = mongoose.model<IUser>('User', userSchema);
