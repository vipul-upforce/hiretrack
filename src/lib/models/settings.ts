import { IEmailTemplate } from '@/app/dashboard/settings/components/types';
import { Schema, Document } from 'mongoose';

/* eslint-disable max-lines */

const fileMetaSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, default: null },
    size: { type: Number, required: true },
  },
  { _id: false, strict: true },
);

const templateSchema = new Schema(
  {
    templateId: { type: String, required: true },
    templateName: { type: String, required: true },
    subject: { type: String, required: true },
    html: { type: String, required: true },
  },
  { _id: false },
);

const settingsSchema = new Schema({
  organizationId: { type: String, required: true },
  multipleOrg: { type: Boolean, default: false, required: true }, // Fixed typo: "requred" -> "required"
  fileStorage: {
    storageType: { type: String, default: '' },
    cloudinaryCloudName: { type: String, default: '' },
    cloudinaryApiSecret: { type: String, default: '' },
    cloudinaryApiKey: { type: String, default: '' },
    awsRegion: { type: String, default: '' },
    awsAccessKeyId: { type: String, default: '' },
    awsSecretAccessKey: { type: String, default: '' },
    awsBucketName: { type: String, default: '' },
  },
  mailConfig: {
    mailProvider: { type: String, default: '' },
    smtp_host: { type: String, default: '' },
    smtp_port: { type: String, default: '' },
    smtp_user: { type: String, default: '' },
    smtp_password: { type: String, default: '' },
    smtp_from: { type: String, default: '' },
    resend_api_key: { type: String, default: '' },
    resend_from: { type: String, default: '' },
    resend_reply_to: { type: String, default: '' },
    brevo_api_key: { type: String, default: '' },
    brevo_from: { type: String, default: '' },
    brevo_reply_to: { type: String, default: '' },
  },
  portalConfigs: {
    portalLogo: {
      type: fileMetaSchema,
      default: null,
    },
    portalLogoDark: {
      type: fileMetaSchema,
      default: null,
    },
    portalFavicon: {
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
      default: '',
    },
    primaryColor: {
      type: String,
      default: '#6366f1',
    },
    secondaryColor: {
      type: String,
      default: '#8b5cf6',
    },
  },
  aiProviders: {
    activeProvider: {
      type: String,
      enum: ['gemini', 'openai', 'anthropic', 'perplexity'],
      default: 'gemini',
    },
    gemini: {
      api_key: { type: String, default: '' },
      model: { type: String, default: 'gemini-1.5-flash' },
      customModel: { type: String, default: '' },
    },
    openai: {
      api_key: { type: String, default: '' },
      model: { type: String, default: 'gpt-4o-mini' },
      customModel: { type: String, default: '' },
    },
    anthropic: {
      api_key: { type: String, default: '' },
      model: { type: String, default: 'claude-3-5-sonnet-20241022' },
      customModel: { type: String, default: '' },
    },
    perplexity: {
      api_key: { type: String, default: '' },
      model: { type: String, default: 'sonar-pro' },
      customModel: { type: String, default: '' },
    },
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
  googleCalendar: {
    isConnected: {
      type: Boolean,
      default: false,
    },
    clientId: {
      type: String,
      default: '',
    },
    clientSecret: {
      type: String,
      default: '',
    },
    accessToken: {
      type: String,
      default: '',
    },
    refreshToken: {
      type: String,
      default: '',
    },
    expiryDate: {
      type: Number,
      default: null,
    },
    connectedEmail: {
      type: String,
      default: '',
    },
  },
  zoom: {
    isConnected: {
      type: Boolean,
      default: false,
    },
    accountId: {
      type: String,
      default: '',
    },
    clientId: {
      type: String,
      default: '',
    },
    clientSecret: {
      type: String,
      default: '',
    },
    accessToken: {
      type: String,
      default: '',
    },
    expiryDate: {
      type: Number,
      default: null,
    },
    connectedEmail: {
      type: String,
      default: '',
    },
  },
  microsoftTeams: {
    isConnected: {
      type: Boolean,
      default: false,
    },
    tenantId: {
      type: String,
      default: '',
    },
    clientId: {
      type: String,
      default: '',
    },
    clientSecret: {
      type: String,
      default: '',
    },
    accessToken: {
      type: String,
      default: '',
    },
    refreshToken: {
      type: String,
      default: '',
    },
    expiryDate: {
      type: Number,
      default: null,
    },
    connectedEmail: {
      type: String,
      default: '',
    },
  },
  onboardingStatus: {
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedSteps: {
      type: [String],
      default: [],
    },
    skippedSteps: {
      type: [String],
      default: [],
    },
    doNotShowAgain: {
      type: Boolean,
      default: false,
    },
    currentStep: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  captcha: {
    enableCaptcha: {
      type: Boolean,
      default: false,
    },
    siteKey: {
      type: String,
      default: '',
    },
    secretKey: {
      type: String,
      default: '',
    },
  },
  organizationEmailNotifications: {
    defaultSettings: {
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
      detailsUpdated: {
        type: Boolean,
        default: true,
      },
      meetingScheduled: {
        type: Boolean,
        default: true,
      },
      meetingUpdated: {
        type: Boolean,
        default: true,
      },
      meetingCancelled: {
        type: Boolean,
        default: true,
      },
      meetingInviteAccepted: {
        type: Boolean,
        default: true,
      },
      meetingInviteDeclined: {
        type: Boolean,
        default: true,
      },
      meetingInviteTentative: {
        type: Boolean,
        default: true,
      },
      followupAdded: {
        type: Boolean,
        default: true,
      },
      followupUpdated: {
        type: Boolean,
        default: true,
      },
      followupRemoved: {
        type: Boolean,
        default: true,
      },
      jobCreated: {
        type: Boolean,
        default: true,
      },
      jobUpdated: {
        type: Boolean,
        default: true,
      },
      userAdded: {
        type: Boolean,
        default: true,
      },
      bulkImportCompleted: {
        type: Boolean,
        default: true,
      },
      candidateRejected: {
        type: Boolean,
        default: true,
      },
      interviewCompleted: {
        type: Boolean,
        default: true,
      },
      candidateMoved: {
        type: Boolean,
        default: true,
      },
    },
    adminOverrides: {
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
        userAdded: { type: Boolean },
        bulkImportCompleted: { type: Boolean },
        candidateRejected: { type: Boolean },
        interviewCompleted: { type: Boolean },
        candidateMoved: { type: Boolean },
      },
      default: new Map(),
    },
  },
  evaluationConfig: {
    temperature: {
      type: Number,
      default: 0.1,
      min: 0,
      max: 1,
    },
    customPrompt: {
      type: String,
      default: null,
    },
    autoEvaluateAllCandidates: {
      type: Boolean,
      default: false,
    },
    maxPdfPages: {
      type: Number,
      default: 4,
      min: 0,
    },
    enableComparativeRanking: {
      type: Boolean,
      default: false,
    },
    enableConfidenceScores: {
      type: Boolean,
      default: true,
    },
    enableRedFlagsDetection: {
      type: Boolean,
      default: true,
    },
    enableSkillsMatrix: {
      type: Boolean,
      default: true,
    },
  },
});

// Performance index for organization-based queries
settingsSchema.index(
  { organizationId: 1 },
  { name: 'idx_settings_orgId', background: true, unique: true },
);

export interface OrganizationEmailNotifications {
  defaultSettings: {
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
  adminOverrides: {
    [userId: string]: {
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

export interface IAIProviders {
  activeProvider: 'gemini' | 'openai' | 'anthropic' | 'perplexity';
  gemini: {
    api_key: string;
    model: string;
    customModel: string;
  };
  openai: {
    api_key: string;
    model: string;
    customModel: string;
  };
  anthropic: {
    api_key: string;
    model: string;
    customModel: string;
  };
  perplexity: {
    api_key: string;
    model: string;
    customModel: string;
  };
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

export interface ITwoFA {
  enable2FA: boolean;
}

export interface IGoogleCalendar {
  isConnected: boolean;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
  connectedEmail: string;
}

export interface IZoomConfig {
  isConnected: boolean;
  accountId: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  expiryDate: number | null;
  connectedEmail?: string;
}

export interface IMicrosoftTeamsConfig {
  isConnected: boolean;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
  connectedEmail?: string;
}

export interface IOnboardingStatus {
  isCompleted: boolean;
  completedSteps: string[];
  skippedSteps: string[];
  doNotShowAgain: boolean;
  currentStep: number;
  lastUpdated: Date;
}
export interface ICaptcha {
  enableCaptcha: boolean;
  siteKey: string;
  secretKey: string;
  captchaProvider: string;
}

export interface IFileMeta {
  id: string;
  name: string;
  url: string;
  type: string | null;
  size: number;
}

export interface IGemini {
  gemini_key: string;
}

export interface IEvaluationConfig {
  temperature: number;
  customPrompt: string | null;
  autoEvaluateAllCandidates: boolean;
  maxPdfPages: number;
  enableComparativeRanking?: boolean;
  enableConfidenceScores?: boolean;
  enableRedFlagsDetection?: boolean;
  enableSkillsMatrix?: boolean;
}

export interface ISettings {
  organizationId: string;
  multipleOrg: boolean;
  fileStorage: Ifs;
  mailConfig: Ismtp;
  aiProviders?: IAIProviders;
  gemini?: IGemini; // Keep for backward compatibility
  portalConfigs?: {
    portalLogo: IFileMeta | null;
    portalLogoDark: IFileMeta | null;
    portalFavicon: IFileMeta | null;
    portalHeader: IFileMeta | null;
    portalFooter: IFileMeta | null;
    portalName: string;
    primaryColor: string;
    secondaryColor: string;
  };
  timeZone: {
    name: string;
    offset: string;
  };
  emailTemplates: { [key: string]: IEmailTemplate };
  twoFA?: ITwoFA;
  googleCalendar?: IGoogleCalendar;
  zoom?: IZoomConfig;
  microsoftTeams?: IMicrosoftTeamsConfig;
  onboardingStatus?: IOnboardingStatus;
  organizationEmailNotifications?: OrganizationEmailNotifications;
  captcha?: ICaptcha;
  evaluationConfig?: IEvaluationConfig;
}

export interface SettingsDocument extends Document, ISettings {}

export default settingsSchema;
