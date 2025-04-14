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

export default async function connectToDatabase() {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      Organization = mongoose.model<IOrganization>(
        "Organization",
        organizationSchema
      );
      User = mongoose.model<IUser>("User", userSchema);
      Lane = mongoose.model<ILane>("Lane", laneSchema);
      Job = mongoose.model<IJob>("Job", jobSchema);
      Candidate = mongoose.model<ICandidate>("Candidate", candidateSchema);
      Settings = mongoose.model<ISettings>("Settings", settingsSchema);
      History = mongoose.model<IHistory>("History", historySchema);
      CandidateAccount = mongoose.model<IUCandidateAccount>(
        "CandidateAccount",
        candidateAccountSchema
      );
      console.log("Models registered");
      return mongoose;
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
