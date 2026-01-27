/* eslint-disable import/no-mutable-exports */
// Models must be mutable as they are reassigned during connection initialization
// This is a legitimate use case for mutable exports in a module registry pattern

import mongoose from 'mongoose';
import { candidateSchema, ICandidate } from './models/candidate';
import { IUser, userSchema } from './models/user';
import { ILane, laneSchema } from './models/Lane';
import { jobSchema, IJob } from './models/job';
import organizationSchema, { IOrganization } from './models/organization';
import settingsSchema, { ISettings } from './models/settings';
import { historySchema, IHistory } from './models/history';
import {
  candidateAccountSchema,
  IUCandidateAccount,
} from './models/candidateAccount';
import cvBatchSchema, { ICVBatch } from './models/cvBatch';
import { jobLaneConfigSchema, IJobLaneConfig } from './models/JobLaneConfig';
import {
  checklistTemplateSchema,
  IChecklistTemplate,
} from './models/ChecklistTemplate';
import fileShareSchema, { IFileShare } from './models/fileshare';
import emailHistorySchema, { IEmailHistory } from './models/emailhistory';
import { notificationSchema, INotification } from './models/notification';
import { FileUrlMappingSchema, IFileUrlMapping } from './models/fileUrlMapping';
import {
  webhookSubscriptionSchema,
  IWebhookSubscription,
} from './models/webhookSubscription';
import logger from './logger';
import {
  duplicateCandidateSchema,
  IDuplicateCandidate,
} from './models/duplicateCandidates';

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// TypeScript global augmentation requires 'var' and the name collision is intentional
declare global {
  // eslint-disable-next-line no-var, vars-on-top, no-shadow
  var mongoose: MongooseGlobal | null;
}

// Models are reassigned in registerModels during connection initialization
// Using 'let' is necessary for this module registry pattern
export let User: mongoose.Model<IUser> | null = null;
export let Organization: mongoose.Model<IOrganization> | null = null;
export let Lane: mongoose.Model<ILane> | null = null;
export let Job: mongoose.Model<IJob> | null = null;
export let Candidate: mongoose.Model<ICandidate> | null = null;
export let Settings: mongoose.Model<ISettings> | null = null;
export let History: mongoose.Model<IHistory> | null = null;
export let CandidateAccount: mongoose.Model<IUCandidateAccount> | null = null;
export let cvBatch: mongoose.Model<ICVBatch> | null = null;
export let JobLaneConfig: mongoose.Model<IJobLaneConfig> | null = null;
export let ChecklistTemplate: mongoose.Model<IChecklistTemplate> | null = null;
export let FileShare: mongoose.Model<IFileShare> | null = null;
export let EmailHistory: mongoose.Model<IEmailHistory> | null = null;
export let Notification: mongoose.Model<INotification> | null = null;
export let DuplicateCandidate: mongoose.Model<IDuplicateCandidate> | null =
  null;
export let WebhookSubscription: mongoose.Model<IWebhookSubscription> | null =
  null;
export let FileUrlMapping: mongoose.Model<IFileUrlMapping> | null = null;

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env',
  );
}

let cached = global.mongoose;

if (!cached) {
  global.mongoose = { conn: null, promise: null };
  cached = global.mongoose;
}

// Helper function to register/re-register all models
function registerModels(mongooseInstance: typeof mongoose) {
  try {
    // Use existing models if already registered, otherwise create new ones
    Organization =
      mongooseInstance.models.Organization ||
      mongooseInstance.model<IOrganization>('Organization', organizationSchema);
    User =
      mongooseInstance.models.User ||
      mongooseInstance.model<IUser>('User', userSchema);
    Lane =
      mongooseInstance.models.Lane ||
      mongooseInstance.model<ILane>('Lane', laneSchema);
    Job =
      mongooseInstance.models.Job ||
      mongooseInstance.model<IJob>('Job', jobSchema);
    Candidate =
      mongooseInstance.models.Candidate ||
      mongooseInstance.model<ICandidate>('Candidate', candidateSchema);
    Settings =
      mongooseInstance.models.Settings ||
      mongooseInstance.model<ISettings>('Settings', settingsSchema);
    History =
      mongooseInstance.models.History ||
      mongooseInstance.model<IHistory>('History', historySchema);
    CandidateAccount =
      mongooseInstance.models.CandidateAccount ||
      mongooseInstance.model<IUCandidateAccount>(
        'CandidateAccount',
        candidateAccountSchema,
      );
    cvBatch =
      mongooseInstance.models.CVBatch ||
      mongooseInstance.model<ICVBatch>('CVBatch', cvBatchSchema);
    JobLaneConfig =
      mongooseInstance.models.JobLaneConfig ||
      mongooseInstance.model<IJobLaneConfig>(
        'JobLaneConfig',
        jobLaneConfigSchema,
      );
    ChecklistTemplate =
      mongooseInstance.models.ChecklistTemplate ||
      mongooseInstance.model<IChecklistTemplate>(
        'ChecklistTemplate',
        checklistTemplateSchema,
      );
    FileShare =
      mongooseInstance.models.FileShare ||
      mongooseInstance.model<IFileShare>('FileShare', fileShareSchema);
    EmailHistory =
      mongooseInstance.models.EmailHistory ||
      mongooseInstance.model<IEmailHistory>('EmailHistory', emailHistorySchema);
    Notification =
      mongooseInstance.models.Notification ||
      mongooseInstance.model<INotification>('Notification', notificationSchema);
    WebhookSubscription =
      mongooseInstance.models.WebhookSubscription ||
      mongooseInstance.model<IWebhookSubscription>(
        'WebhookSubscription',
        webhookSubscriptionSchema,
      );
    DuplicateCandidate =
      mongooseInstance.models.DuplicateCandidate ||
      mongooseInstance.model<IDuplicateCandidate>(
        'DuplicateCandidate',
        duplicateCandidateSchema,
      );
    FileUrlMapping =
      mongooseInstance.models.FileUrlMapping ||
      mongooseInstance.model<IFileUrlMapping>(
        'FileUrlMapping',
        FileUrlMappingSchema,
      );
  } catch (error) {
    logger.error('Error during model registration:', error);
    throw error;
  }
}

export default async function connectToDatabase() {
  if (cached!.conn) {
    // Connection exists, but check if models need re-registration (hot reload scenario)
    if (!Settings || !Organization || !User) {
      registerModels(cached!.conn);
    }
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        registerModels(mongooseInstance);
        return mongooseInstance;
      });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}
