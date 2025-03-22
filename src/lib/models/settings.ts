import { Schema, Document } from "mongoose";

const settingsSchema = new Schema({
    organizationId:{ type:String, required:true },
    fileStorage:{ 
        storageType:{ type:String, default: '' },
        cloudinaryCloudName:{ type:String, default: '' },
        cloudinaryApiSecret:{ type:String, default: '' },
        cloudinaryApiKey:{ type:String, default: '' },
        awsRegion: { type:String, default: '' },
        awsAccessKeyId: { type:String, default: '' },
        awsSecretAccessKey: { type:String, default: '' },
        awsBucketName: { type:String, default: '' },
    },
    smtpConfig: {
        SMTP_HOST: { type: String, default: '' },
        SMTP_PORT: { type: String, default: '' },
        SMTP_USER: { type: String, default: '' },
        SMTP_PASSWORD: { type: String, default: '' },
        SMTP_FROM: { type: String, default: '' },
    },
    portalConfigs:{
        portalLogo: {
            id: String,
            name: String,
            url: String,
            type: { type: String, default: 'image' },
            size: Number
        },
        portalName: {
            type: String,
            default: ''
        }
    }
})

export interface ISettings {
    organizationId: string;
    fileStorage: Ifs;
    smtpConfig: Ismtp;
    portalConfigs?: {
        portalLogo: string | null;
        portalName: string;
    };
}

export interface Ismtp {
    SMTP_HOST: string,
    SMTP_PORT: string,
    SMTP_USER:string,
    SMTP_PASSWORD: string,
    SMTP_FROM: string,
}

export interface Ifs {
    storageType:string,
    cloudinaryCloudName?:string,
    cloudinaryApiSecret?:string,
    cloudinaryApiKey?:string,
    awsRegion?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsBucketName?: string,
}

export interface SettingsDocument extends Document, ISettings {}

export default settingsSchema