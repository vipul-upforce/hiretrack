import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
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

    // Return evaluation config with defaults
    const evaluationConfig = settings.evaluationConfig || {
      temperature: 0.1,
      customPrompt: null,
      autoEvaluateAllCandidates: false,
      maxPdfPages: 4,
    };

    return NextResponse.json({ evaluationConfig });
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

    const evaluationConfig = await req.json();
    console.log("🟢🟢 Evaluation config update: ", evaluationConfig);

    // Validate temperature range
    if (
      evaluationConfig.temperature !== undefined &&
      (evaluationConfig.temperature < 0 || evaluationConfig.temperature > 1)
    ) {
      return NextResponse.json(
        { error: "Temperature must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Validate maxPdfPages
    if (
      evaluationConfig.maxPdfPages !== undefined &&
      evaluationConfig.maxPdfPages < 0
    ) {
      return NextResponse.json(
        { error: "Max PDF pages must be 0 or greater (0 = no limit)" },
        { status: 400 }
      );
    }

    const updatedSettings = await Settings.findOneAndUpdate(
      {
        organizationId: organizationId,
      },
      { evaluationConfig: evaluationConfig },
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

    return NextResponse.json({
      message: "Evaluation settings updated successfully",
      evaluationConfig: updatedSettings.evaluationConfig,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
