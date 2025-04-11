import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Organization, Settings } from "@/lib/mongodb";
import { handleSingleFile } from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let organizationId = "";
    const token = req.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }
    const settings = await Settings.findOne(
      // { organizationId: userData.organizationId },
      { organizationId: organizationId },
      {
        "fileStorage.storageType": 1,
        portalConfigs: 1,
        smtpConfigs: 1,
      }
    );

    if (!settings) {
      return NextResponse.json({
        fileStorage: null,
        portalLogo: null,
        portalName: null,
      });
    }

    const response = {
      fileStorage: settings.fileStorage,
      portalLogo: settings.portalConfigs?.portalLogo || null,
      portalName: settings.portalConfigs?.portalName || "",
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    let organizationId = "";
    let fileStorage = "";
    const token = req.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        if (userData.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        fileStorage = userData.fileStorage || "local";
        organizationId = userData.organizationId || "";
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const data = await req.json();
    let uploadedLogo;

    if (data.portalLogo) {
      uploadedLogo = await handleSingleFile(
        data.portalLogo,
        fileStorage,
        organizationId
      );
    }

    const updatedPortal = {
      portalLogo: uploadedLogo,
      portalName: data.portalName,
    };

    // await Organization?.findByIdAndUpdate(userData.organizationId, {
    await Organization?.findByIdAndUpdate(organizationId, {
      name: updatedPortal.portalName,
    });

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        // organizationId: userData.organizationId,
        organizationId: organizationId,
      },
      { portalConfigs: updatedPortal },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
