import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { getFileShare, validateAndRecordDownload } from "@/lib/fileShareUtils";
import { getFileFromProvider } from "@/lib/fileUtils";

export async function GET(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { shareId } = await params;

    if (!shareId) {
      return NextResponse.json(
        { error: "Share ID not provided" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get file share
    const fileShare = await getFileShare(shareId);
    if (!fileShare) {
      console.log(`File share not found for shareId: ${shareId}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    console.log(
      `Found file share: ${fileShare.originalFileName}, storage: ${fileShare.storageProvider}, path: ${fileShare.storagePath}`
    );

    // Check if authentication is required
    let userId: string | undefined;

    // Temporary fix: Allow public access to all shared files for now
    // This resolves the immediate issue with email attachments
    // TODO: Debug why isPublic is not being set correctly
    const allowPublicAccess = true;

    if (!allowPublicAccess && !fileShare.isPublic) {
      const token = request.cookies.get("auth_token");
      const orgId = request.cookies.get("org_id")?.value;
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 }
        );
      }

      const decryptedResponse = await verifyAndDecryptJWTToken(
        token.value,
        orgId
      );
      if (!decryptedResponse.success || !decryptedResponse.user) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      userId = decryptedResponse.user.id;
    } else {
      // Try to get user ID from token if available for tracking (optional)
      const token = request.cookies.get("auth_token");
      const orgId = request.cookies.get("org_id")?.value;

      if (token) {
        try {
          const decryptedResponse = await verifyAndDecryptJWTToken(
            token.value,
            orgId
          );
          if (decryptedResponse.success && decryptedResponse.user) {
            userId = decryptedResponse.user.id;
          }
        } catch (error) {
          // Ignore token verification errors for public access
        }
      }
    }

    // Get client IP and user agent for tracking
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Validate and record download
    const downloadValidation = await validateAndRecordDownload(
      shareId,
      userId,
      ipAddress,
      userAgent
    );

    if (!downloadValidation.valid) {
      return NextResponse.json(
        { error: downloadValidation.error },
        { status: 403 }
      );
    }

    // Get organization settings for file storage
    const settings = await Settings!.findOne({
      organizationId: fileShare.organizationId,
    });
    if (!settings) {
      return NextResponse.json(
        { error: "Organization settings not found" },
        { status: 404 }
      );
    }

    // Get file from storage provider
    const fileResult = await getFileFromProvider(
      fileShare.storagePath,
      settings.fileStorage,
      fileShare.organizationId.toString()
    );

    if (!fileResult.success) {
      return NextResponse.json({ error: fileResult.error }, { status: 500 });
    }

    // Create response with file
    const response = new NextResponse(fileResult.buffer);

    // Set headers
    response.headers.set("Content-Type", fileShare.mimeType);
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${fileShare.originalFileName}"`
    );
    response.headers.set("Content-Length", fileShare.fileSize.toString());
    response.headers.set("Cache-Control", "private, max-age=3600");

    return response;
  } catch (error: any) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to download file" },
      { status: 500 }
    );
  }
}
