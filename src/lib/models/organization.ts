import { Schema, Types } from "mongoose";
const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
];
const DEFAULT_TAGS = [
  { title: "Accepted Another Offer", color: "#FF4D4F" },
  { title: "Insufficient Experience", color: "#FA8C16" },
  { title: "Skills Mismatch", color: "#F5222D" },
  { title: "Location Incompatibility", color: "#FAAD14" },
  { title: "Salary Expectations", color: "#EB2F96" },
  { title: "Cultural Fit", color: "#722ED1" },
];
const organizationSchema = new Schema({
  name: {
    type: String,
    unique: true,
  },
  adminId: {
    type: Types.ObjectId,
    ref: "User",
    required: true,
  },
  lanes: {
    type: [String],
    default: DEFAULT_LANES,
  },
  openJobCards: {
    type: [String],
    // default: DEFAULT_LANES,
  },
  customFields: {
    type: Schema.Types.Mixed,
    default: {},
  },
  tags: {
    type: [
      {
        title: {
          type: String,
        },
        color: {
          type: String,
        },
      },
    ],
    default: DEFAULT_TAGS,
  },
});

export default organizationSchema;

export interface ITag {
  title: string;
  color: string;
}

export interface IOrganization {
  name: string;
  adminId: Schema.Types.ObjectId;
  lanes: string[];
  openJobCards: string[];
  customFields: Schema.Types.Mixed;
  tags: ITag[];
}

// export const Organization = mongoose.model("Organization", organizationSchema);
