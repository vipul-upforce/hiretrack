import { Schema, Document } from "mongoose";

const settingsSchema = new Schema({
  organizationId: { type: String, required: true },
  multipleOrg: { type: Boolean, default: false, requred: true },
  fileStorage: {
    storageType: { type: String, default: "" },

    cloudinaryCloudName: { type: String, default: "" },
    cloudinaryApiSecret: { type: String, default: "" },
    cloudinaryApiKey: { type: String, default: "" },

    awsRegion: { type: String, default: "" },
    awsAccessKeyId: { type: String, default: "" },
    awsSecretAccessKey: { type: String, default: "" },
    awsBucketName: { type: String, default: "" },
  },
  mailConfig: {
    mailProvider: { type: String, default: "" },

    smtp_host: { type: String, default: "" },
    smtp_port: { type: String, default: "" },
    smtp_user: { type: String, default: "" },
    smtp_password: { type: String, default: "" },
    smtp_from: { type: String, default: "" },

    resend_api_key: { type: String, default: "" },
    resend_from: { type: String, default: "" },
    resend_reply_to: { type: String, default: "" },
  },
  portalConfigs: {
    portalLogo: {
      id: String,
      name: String,
      url: String,
      type: { type: String, default: "image" },
      size: Number,
    },
    portalName: {
      type: String,
      default: "",
    },
  },
  gemini: {
    gemini_key: String,
  },
});

export interface ISettings {
  organizationId: string;
  multipleOrg: boolean;
  fileStorage: Ifs;
  mailConfig: Ismtp;
  gemini: IGemini;
  portalConfigs?: {
    portalLogo: string | null;
    portalName: string;
  };
}

export interface Ismtp {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  resend_api_key: string;
  resend_from: string;
  resend_reply_to: string;
  mailProvider: string;
}

export interface Ifs {
  storageType: string;
  cloudinaryCloudName?: string;
  cloudinaryApiSecret?: string;
  cloudinaryApiKey?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsBucketName?: string;
}

export interface IGemini {
  gemini_key: string;
}

export interface SettingsDocument extends Document, ISettings {}

export default settingsSchema;
