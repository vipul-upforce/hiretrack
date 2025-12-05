/* eslint-disable no-console */
import mongoose from "mongoose";
import { candidateSchema } from "./models/candidate";
import { IUser } from "./models/user";
import { ILane } from "./models/Lane";
import { jobSchema } from "./models/job";
import { userSchema } from "./models/user";
import organizationSchema from "./models/organization";
import { laneSchema } from "./models/Lane";
import { IOrganization } from "./models/organization";
import { IJob } from "./models/job";
import { ICandidate } from "./models/candidate";
import settingsSchema, { ISettings } from "./models/settings";
import { historySchema, IHistory } from "./models/history";
import candidateAccountSchema, {
  IUCandidateAccount,
} from "./models/candidateAccount";
import cvBatchSchema, { ICVBatch } from "./models/cvBatch";
import { jobLaneConfigSchema, IJobLaneConfig } from "./models/JobLaneConfig";
import { checklistTemplateSchema, IChecklistTemplate } from "./models/ChecklistTemplate";
import fileShareSchema, { IFileShare } from "./models/fileshare";
import emailHistorySchema, { IEmailHistory } from "./models/emailhistory";
import notificationSchema, { INotification } from "./models/notification";
import { FileUrlMappingSchema, IFileUrlMapping } from "./models/fileUrlMapping";
import webhookSubscriptionSchema, { IWebhookSubscription } from "./models/webhookSubscription";

interface MongooseGlobal {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseGlobal | null;
}

export var User: mongoose.Model<IUser> | null = null;
export var Organization: mongoose.Model<IOrganization> | null = null;
export var Lane: mongoose.Model<ILane> | null = null;
export var Job: mongoose.Model<IJob> | null = null;
export var Candidate: mongoose.Model<ICandidate> | null = null;
export var Settings: mongoose.Model<ISettings> | null = null;
export var History: mongoose.Model<IHistory> | null = null;
export var CandidateAccount: mongoose.Model<IUCandidateAccount> | null = null;
export var cvBatch: mongoose.Model<ICVBatch> | null = null;
export var JobLaneConfig: mongoose.Model<IJobLaneConfig> | null = null;
export var ChecklistTemplate: mongoose.Model<IChecklistTemplate> | null = null;
export var FileShare: mongoose.Model<IFileShare> | null = null;
export var EmailHistory: mongoose.Model<IEmailHistory> | null = null;
export var Notification: mongoose.Model<INotification> | null = null;
export var WebhookSubscription: mongoose.Model<IWebhookSubscription> | null = null;
export var FileUrlMapping: mongoose.Model<IFileUrlMapping> | null = null;

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env"
  );
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Helper function to register/re-register all models
function registerModels(mongooseInstance: typeof mongoose) {
  console.log("Registering models///....");
  try {
    // Use existing models if already registered, otherwise create new ones
    Organization = mongooseInstance.models.Organization || mongooseInstance.model<IOrganization>("Organization", organizationSchema);
    User = mongooseInstance.models.User || mongooseInstance.model<IUser>("User", userSchema);
    Lane = mongooseInstance.models.Lane || mongooseInstance.model<ILane>("Lane", laneSchema);
    Job = mongooseInstance.models.Job || mongooseInstance.model<IJob>("Job", jobSchema);
    Candidate = mongooseInstance.models.Candidate || mongooseInstance.model<ICandidate>("Candidate", candidateSchema);
    Settings = mongooseInstance.models.Settings || mongooseInstance.model<ISettings>("Settings", settingsSchema);
    History = mongooseInstance.models.History || mongooseInstance.model<IHistory>("History", historySchema);
    CandidateAccount = mongooseInstance.models.CandidateAccount || mongooseInstance.model<IUCandidateAccount>("CandidateAccount", candidateAccountSchema);
    cvBatch = mongooseInstance.models.CVBatch || mongooseInstance.model<ICVBatch>("CVBatch", cvBatchSchema);
    JobLaneConfig = mongooseInstance.models.JobLaneConfig || mongooseInstance.model<IJobLaneConfig>("JobLaneConfig", jobLaneConfigSchema);
    ChecklistTemplate = mongooseInstance.models.ChecklistTemplate || mongooseInstance.model<IChecklistTemplate>("ChecklistTemplate", checklistTemplateSchema);
    FileShare = mongooseInstance.models.FileShare || mongooseInstance.model<IFileShare>("FileShare", fileShareSchema);
    EmailHistory = mongooseInstance.models.EmailHistory || mongooseInstance.model<IEmailHistory>("EmailHistory", emailHistorySchema);
    Notification = mongooseInstance.models.Notification || mongooseInstance.model<INotification>("Notification", notificationSchema);
    WebhookSubscription = mongooseInstance.models.WebhookSubscription || mongooseInstance.model<IWebhookSubscription>("WebhookSubscription", webhookSubscriptionSchema);
    FileUrlMapping = mongooseInstance.models.FileUrlMapping || mongooseInstance.model<IFileUrlMapping>("FileUrlMapping", FileUrlMappingSchema);
  } catch (error) {
    console.error("Error during model registration:", error);
    throw error;
  }
}

export default async function connectToDatabase() {
  if (cached!.conn) {
    // Connection exists, but check if models need re-registration (hot reload scenario)
    if (!Settings || !Organization || !User) {
      console.log("Re-registering models....");
      registerModels(cached!.conn);
    }
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
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
