import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Settings } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get("user");
    const userData = JSON.parse(userCookie?.value || "{}");
    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }
    const settings = await Settings.findOne({
      organizationId: userData.organizationId,
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // console.log(settings)

    return NextResponse.json({ fileStorage: settings.fileStorage });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const userCookie = req.cookies.get("user");
    const userData = JSON.parse(userCookie?.value || "{}");

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const fileStorage = await req.json();
    let storageObj;
    // console.log("**** ", fileStorage)
    if (fileStorage.storageType === "s3") {
      storageObj = {
        awsRegion: fileStorage.awsRegion,
        awsAccessKeyId: fileStorage.awsAccessKeyId,
        awsSecretAccessKey: fileStorage.awsSecretAccessKey,
        awsBucketName: fileStorage.awsBucketName,
        storageType: fileStorage.storageType,
      };
    } else if (fileStorage.storageType === "cloudinary") {
      storageObj = {
        cloudinaryCloudName: fileStorage.cloudinaryCloudName,
        cloudinaryApiKey: fileStorage.cloudinaryApiKey,
        cloudinaryApiSecret: fileStorage.cloudinaryApiSecret,
        storageType: fileStorage.storageType,
      };
    } else if (fileStorage.storageType === "local") {
      storageObj = { storageType: "local" };
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: userData.organizationId,
      },
      { fileStorage: storageObj },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
