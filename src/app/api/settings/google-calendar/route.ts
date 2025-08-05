import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { encryptText, decryptText } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
        if (userData.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }
    
    const settings = await Settings.findOne({
      organizationId: organizationId,
    });

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    // Return Google Calendar configuration with decrypted credentials
    const googleCalendar = settings.googleCalendar || {
      isConnected: false,
      clientId: "",
      clientSecret: "",
      accessToken: "",
      refreshToken: "",
      expiryDate: null,
      connectedEmail: "",
    };

    // Decrypt sensitive data
    if (googleCalendar.clientSecret) {
      googleCalendar.clientSecret = decryptText(googleCalendar.clientSecret);
    }
    if (googleCalendar.accessToken) {
      googleCalendar.accessToken = decryptText(googleCalendar.accessToken);
    }
    if (googleCalendar.refreshToken) {
      googleCalendar.refreshToken = decryptText(googleCalendar.refreshToken);
    }

    return NextResponse.json({ googleCalendar });
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
    await connectToDatabase();
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
        if (userData.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const { clientId, clientSecret } = await req.json();

    // Get existing settings
    const existingSettings = await Settings.findOne({
      organizationId: organizationId,
    });

    // Prepare update data
    const updateData: any = {
      "googleCalendar.clientId": clientId,
    };

    // Only encrypt and update client secret if it's provided
    if (clientSecret) {
      updateData["googleCalendar.clientSecret"] = encryptText(clientSecret);
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId: organizationId,
      },
      { $set: updateData },
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

    return NextResponse.json({ message: "Google Calendar credentials updated successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
        if (userData.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    // Clear Google Calendar connection
    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId: organizationId,
      },
      {
        $set: {
          "googleCalendar.isConnected": false,
          "googleCalendar.accessToken": "",
          "googleCalendar.refreshToken": "",
          "googleCalendar.expiryDate": null,
          "googleCalendar.connectedEmail": "",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Google Calendar disconnected successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}