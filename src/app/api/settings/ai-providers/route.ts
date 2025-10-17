import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { decryptProviderKeys, encryptProviderKeys } from "@/lib/encryption";
import { getDefaultModel } from "@/lib/ai-providers/models-config";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let organizationId = "";
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
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

    // Return AI providers configuration, with backward compatibility for old gemini field
    let aiProviders = settings.aiProviders || {
      activeProvider: "gemini",
      gemini: {
        api_key: settings.gemini?.gemini_key || "",
        model: getDefaultModel("gemini"),
        customModel: "",
      },
      openai: {
        api_key: "",
        model: getDefaultModel("openai"),
        customModel: "",
      },
      anthropic: {
        api_key: "",
        model: getDefaultModel("anthropic"),
        customModel: "",
      },
      perplexity: {
        api_key: "",
        model: getDefaultModel("perplexity"),
        customModel: "",
      },
    };

    // Decrypt API keys before sending to client
    aiProviders = decryptProviderKeys(aiProviders, orgId);

    return NextResponse.json({ aiProviders });
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
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
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

    const aiProvidersSetting = await req.json();

    // Encrypt API keys before storing in database
    const encryptedProviders = encryptProviderKeys(aiProvidersSetting, orgId);

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: organizationId,
      },
      { aiProviders: encryptedProviders },
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

    return NextResponse.json({
      message: "AI providers settings updated successfully",
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
