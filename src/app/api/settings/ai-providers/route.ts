import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { decryptProviderKeys, encryptProviderKeys } from "@/lib/encryption";
import { getDefaultModel } from "@/lib/ai-providers/models-config";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userData = await getAuthenticatedUser(req, "admin");
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId || "";

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }
    const settings = await Settings.findOne({
      organizationId: organizationId,
    }).select("aiProviders gemini").lean().exec();

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
    aiProviders = decryptProviderKeys(aiProviders, userData.organizationId);

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
    const [userData, aiProvidersSetting] = await Promise.all([
      getAuthenticatedUser(req, "admin"),
      req.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId || "";

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }


    // Encrypt API keys before storing in database
    const encryptedProviders = encryptProviderKeys(aiProvidersSetting, userData.organizationId);

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
