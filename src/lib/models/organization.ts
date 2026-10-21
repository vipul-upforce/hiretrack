import { Schema, Types } from 'mongoose';

const DEFAULT_TAGS = [
  { title: 'Accepted Another Offer', color: '#FF4D4F' },
  { title: 'Insufficient Experience', color: '#FA8C16' },
  { title: 'Skills Mismatch', color: '#F5222D' },
  { title: 'Location Incompatibility', color: '#FAAD14' },
  { title: 'Salary Expectations', color: '#EB2F96' },
  { title: 'Cultural Fit', color: '#722ED1' },
];
const organizationSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
    },
    adminId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Reference to Lane documents for organization default lanes
    // These lanes are used as defaults for all jobs in this organization
    defaultLanes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Lane',
      },
    ],
    laneRestrictions: {
      type: {
        nonEditable: [String],
        nonDeletable: [String],
      },
      default: {
        nonEditable: ['applied', 'accepted', 'rejected'],
        nonDeletable: ['applied', 'accepted', 'rejected'],
      },
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
  },
  {
    timestamps: true,
  },
);

// Add index for default lane references queries
organizationSchema.index({ defaultLanes: 1 });

export default organizationSchema;

export interface ITag {
  title: string;
  color: string;
}

export interface ILaneRestrictions {
  nonEditable: string[];
  nonDeletable: string[];
}

export interface IOrganization {
  name: string;
  adminId: Schema.Types.ObjectId;
  defaultLanes: Schema.Types.ObjectId[]; // References to Lane documents
  laneRestrictions: ILaneRestrictions;
  openJobCards: string[];
  customFields: Schema.Types.Mixed;
  tags: ITag[];
  createdAt?: Date;
  updatedAt?: Date;
}

// export const Organization = mongoose.model("Organization", organizationSchema);
