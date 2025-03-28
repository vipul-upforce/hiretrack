import { Schema, Types } from "mongoose";
const DEFAULT_LANES = ["applied", "screening", "shortlisted", "processing", "accepted", "rejected"];
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
    lanes:{
        type: [String], 
        default: DEFAULT_LANES 
    },
    customFields:{
        type: Schema.Types.Mixed,
        default: {}
    }

});

export default organizationSchema;

export interface IOrganization {
    name: string;
    adminId: Schema.Types.ObjectId;
    lanes: string[];
    customFields: Schema.Types.Mixed;
}

// export const Organization = mongoose.model("Organization", organizationSchema);
