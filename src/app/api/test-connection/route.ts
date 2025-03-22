import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import nodemailer from "nodemailer";

interface CustomError {
  error: {
    message: string;
  };
}

export async function POST(request: Request) {
  const { storageType, credentials } = await request.json(); // Expecting storageType and credentials in the request body

  if (storageType === "cloudinary") {
    return await testCloudinary(credentials);
  } else if (storageType === "s3") {
    return await testAWSConnection(credentials);
  } else if (storageType === "smtp") {
    return await testSMTPConnection(credentials);
  } else {
    return NextResponse.json(
      { success: false, message: "Invalid storage type" },
      { status: 400 }
    );
  }
}

const testCloudinary = async (credentials: {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}) => {
  // Configure Cloudinary with the provided credentials
  cloudinary.config({
    cloud_name: credentials.cloud_name,
    api_key: credentials.api_key,
    api_secret: credentials.api_secret,
  });

  try {
    // Test the connection by checking the account details
    await cloudinary.api.resources(); // This can be kept or removed based on your needs
    return NextResponse.json({
      success: true,
      message: "Cloudinary connection successful",
    });
  } catch (error) {
    const customError = error as CustomError; // Type assertion to CustomError
    return NextResponse.json(
      { success: false, message: customError.error.message || "Unknown error" },
      { status: 400 }
    );
  }
};

const testAWSConnection = async (credentials: {
  accessKeyId: string;
  secretAccessKey: string;
  region:string;
  bucketName : string
}) => {
  try {
    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
    
    await s3Client.send(new ListObjectsV2Command({ 
      Bucket: credentials.bucketName,
      MaxKeys: 1 // Limit to just 5 objects for a quick check
    }));
    return NextResponse.json({
      success: true,
      message: "AWS connection successful",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "" },
      { status: 400 }
    );
  }
};

const testSMTPConnection = async (credentials: {
  user: string;
  pass: string;
}) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use `true` for port 465, `false` for other ports
      auth: {
        user: credentials.user,
        pass: credentials.pass,
      },
    });
    // Verify the SMTP connection
    await transporter.verify();
    return NextResponse.json({
      success: true,
      message: "SMTP connection successful",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "" },
      { status: 400 }
    );
  }
};
