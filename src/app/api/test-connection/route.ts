import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import nodemailer from "nodemailer";
import { Resend } from "resend";
// import Brevo from "@getbrevo/brevo";
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
  } else if (storageType === "resend") {
    return await testResendConnection(credentials);
  } else if (storageType === "brevo") {
    return await testBrevoConnection(credentials);
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
  region: string;
  bucketName: string;
}) => {
  try {
    const s3Client = new S3Client({
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });

    await s3Client.send(
      new ListObjectsV2Command({
        Bucket: credentials.bucketName,
        MaxKeys: 1, // Limit to just 1 object for a quick check
      })
    );
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
  host?: string;
  port?: number;
  from?: string;
}) => {
  try {
    const transporter = nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port,
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

const testResendConnection = async (credentials: {
  resend_api_key: string;
  resend_from: string;
  reply_to: string;
}) => {
  const resend = new Resend(credentials.resend_api_key);
  try {
    const { error } = await resend.emails.send({
      from: credentials.resend_from,
      to: "delivered@resend.dev",
      subject: "Test Connection",
      replyTo: credentials.reply_to,
      html: "<p>This is a test email to verify the Resend connection.</p>",
    });
    if (error) {
      throw new Error("Failed to send test email");
    }

    return NextResponse.json({
      success: true,
      message: "Resend connection successful",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "" },
      { status: 400 }
    );
  }
};

const testBrevoConnection = async (credentials: {
  brevo_api_key: string;
  brevo_from: string;
  reply_to: string;
}) => {
  try {
    // Validate API key
    if (!credentials.brevo_api_key) {
      throw new Error("Brevo API key is missing");
    }
    if (!credentials.brevo_api_key.startsWith("xkeysib-")) {
      throw new Error(
        "Invalid Brevo API key. It must start with 'xkeysib-'. Generate a new API key in the Brevo dashboard (SMTP & API > API Keys)."
      );
    }

    console.log(
      "API Key (partial):",
      credentials.brevo_api_key.substring(0, 10) + "..."
    );

    // // Log reply_to for debugging
    // console.log("reply_to (raw):", JSON.stringify(credentials.reply_to));
    // console.log("reply_to length:", credentials.reply_to?.length);
    // console.log("reply_to type:", typeof credentials.reply_to);

    // Validate emails
    const emailRegex = /^[\w\.\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}$/;
    if (
      !credentials.brevo_from ||
      !emailRegex.test(credentials.brevo_from.trim())
    ) {
      throw new Error("Invalid brevo_from email address");
    }
    if (
      !credentials.reply_to ||
      !emailRegex.test(credentials.reply_to.trim())
    ) {
      throw new Error(
        `Invalid reply_to email address: "${credentials.reply_to}". Ensure it's a valid email (e.g., user@domain.com).`
      );
    }

    const emailData = {
      sender: { email: credentials.brevo_from.trim() },
      to: [{ email: credentials.brevo_from.trim() }],
      subject: "Test Brevo Connection",
      replyTo: { email: credentials.reply_to.trim() },
      htmlContent:
        "<p>This is a test email to verify the Brevo connection.</p>",
    };

    // console.log("Email config:", emailData);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": credentials.brevo_api_key,
        "content-type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    // Parse response
    const responseData = await response.json();

    console.log("Brevo API Response:", responseData);
    console.log("Response Status:", response.status);

    if (response.ok && responseData.messageId) {
      return NextResponse.json({
        success: true,
        message: "Brevo connection successful! Test email sent.",
        messageId: responseData.messageId,
      });
    } else {
      const errorMessage =
        responseData.message || responseData.error || "Unknown API error";
      throw new Error(`Brevo API error (${response.status}): ${errorMessage}`);
    }
  } catch (error: any) {
    console.error("Brevo connection test failed:", error);

    let errorMessage = "Unknown error occurred";
    let statusCode = 400;

    if (error) {
      errorMessage = error.message;
    }

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorMessage = "Network error: Unable to connect to Brevo API";
      statusCode = 503;
    }
    if (error.name === "AbortError") {
      errorMessage = "Request timeout: Brevo API took too long to respond";
      statusCode = 408;
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error:
          process.env.ENVIRONMENT === "development" ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
};
