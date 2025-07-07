import { IEmailTemplate } from "@/app/dashboard/settings/components/types";
import { Schema, Document } from "mongoose";

const fileMetaSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: null },
    size: { type: Number, required: true },
  },
  { _id: false, strict: true }
);

const templateSchema = new Schema(
  {
    templateId: { type: String, required: true },
    templateName: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
  },
  { _id: false }
);

const settingsSchema = new Schema({
  organizationId: { type: String, required: true },
  multipleOrg: { type: Boolean, default: false, required: true }, // Fixed typo: "requred" -> "required"
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
    brevo_api_key: { type: String, default: "" },
    brevo_from: { type: String, default: "" },
    brevo_reply_to: { type: String, default: "" },
  },
  portalConfigs: {
    portalLogo: {
      type: fileMetaSchema,
      default: null,
    },
    portalHeader: {
      type: fileMetaSchema,
      default: null,
    },
    portalFooter: {
      type: fileMetaSchema,
      default: null,
    },
    portalName: {
      type: String,
      default: "",
    },
  },
  gemini: {
    gemini_key: String,
  },
  timeZone: {
    name: {
      type: String,
    },
    offset: {
      type: String,
    },
  },
  emailTemplates: {
    type: Map,
    of: templateSchema,
    default: new Map(),
  },
  twoFA: {
    enable2FA: {
      type: Boolean,
      default: false,
    },
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
    portalHeader: string | null;
    portalFooter: string | null;
    portalName: string;
  };
  timeZone: {
    name: string;
    offset: string;
  };
  emailTemplates: { [key: string]: IEmailTemplate };
  twoFA?: ITwoFA;
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
  brevo_api_key: string;
  brevo_from: string;
  brevo_reply_to: string;
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
export interface ITwoFA {
  enable2FA: boolean;
}

export interface SettingsDocument extends Document, ISettings {}

export default settingsSchema;
