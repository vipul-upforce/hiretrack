import mongoose, { Schema } from "mongoose";

export interface ILane {
  userId: string;
  lanes: LaneItem[];
  order: number;
  organizationId: object;
}

export interface LaneItem {
  id: string; // or whatever properties are relevant
  name: string;
  // Add other properties as needed
}

export const laneSchema = new mongoose.Schema<ILane>({
  userId: { type: String, required: true },
  lanes: { type: [Object], default: [] },
  order: { type: Number, default: 0 },
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
  },
});

// export const Lane = mongoose.model<ILane>('Lane', laneSchema);
