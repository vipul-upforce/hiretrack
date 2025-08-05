import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { createFileShare, validateAttachments } from "@/lib/fileShareUtils";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get("auth_token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token.value);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = decryptedResponse.user;

    // Check role - candidates cannot upload files
    if (user.role === "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const data = await request.json();
    const { files, shareOptions } = data;


    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate attachments
    const validation = validateAttachments(files);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Connect to database
    await connectToDatabase();

    // Get organization settings for file storage
    const settings = await Settings!.findOne({ organizationId: user.organizationId });
    if (!settings) {
      return NextResponse.json({ error: "Organization settings not found" }, { status: 404 });
    }

    // Process each file
    const results = [];
    for (const file of files) {
      const result = await createFileShare({
        organizationId: user.organizationId,
        userId: user.id,
        file: {
          base64: file.base64,
          fileName: file.fileName,
          mimeType: file.mimeType || "application/octet-stream",
        },
        isPublic: shareOptions?.isPublic ?? true,
        expiresInHours: shareOptions?.expiresInHours,
        maxDownloads: shareOptions?.maxDownloads,
        metadata: shareOptions?.metadata,
        storageConfig: settings.fileStorage,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      results.push(result);
    }

    return NextResponse.json({ 
      success: true, 
      files: results 
    });
  } catch (error: any) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload files" },
      { status: 500 }
    );
  }
}