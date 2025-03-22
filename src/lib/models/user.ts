import  { Schema } from 'mongoose';

export interface OrgInfo{
  customFields?: any;
  _id:Schema.Types.ObjectId|string;
  name:string;
  adminId:Schema.Types.ObjectId|string;
  lanes:string[];
}

export interface IUser {
  _id: string;
  organizationId: Schema.Types.ObjectId;
  organizationInfo?: OrgInfo;
  name: string;
  email: string;
  role: 'admin' | 'hr' | 'interviewer';
  password: string;
  createdAt: Date;
  updatedAt: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
}


export const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['hr', 'interviewer','admin'],
    required: true,
    default: 'hr'
  },
  password: {
    type: String,
    required: true,
  },
  organizationId: { 
    type: Schema.Types.ObjectId, 
    ref:'Organization',
    required: false
  },
  resetToken: {
    type: String,
    required: false
  },
  resetTokenExpiry: {
    type: Date,
    required: false
  }
}, {
  timestamps: true,
});

export default userSchema;

// export const User = mongoose.model<IUser>('User', userSchema); 