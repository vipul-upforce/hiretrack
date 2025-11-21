import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { createFileShare, validateAttachments } from "@/lib/fileShareUtils";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function POST(request: NextRequest) {
  try {
    
    // Parse request body
    const [user, data] = await Promise.all([
      getAuthenticatedUser(request, ["admin", "hr", "interviewer"]),
      request.json(),
      connectToDatabase(),
    ]);
   
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
    

    // Get organization settings for file storage
    const settings = await Settings!.findOne({
      organizationId: user.organizationId,
    }).select("fileStorage").lean().exec();
    if (!settings) {
      return NextResponse.json(
        { error: "Organization settings not found" },
        { status: 404 }
      );
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
      files: results,
    });
  } catch (error: any) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload files" },
      { status: 500 }
    );
  }
}
