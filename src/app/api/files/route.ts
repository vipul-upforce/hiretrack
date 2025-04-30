import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import mime from "mime-types";

export async function GET(request: NextRequest) {
  try {
    // Get the pathname from query parameters
    const { searchParams } = new URL(request.url);
    const pathName = searchParams.get("pathName");

    if (!pathName) {
      return NextResponse.json(
        { error: "Path parameter is required" },
        { status: 400 }
      );
    }

    // Resolve the absolute path while handling the parent directory reference
    const projectRoot = path.join(process.cwd(), ".."); // Go one level up from current directory
    const safePath = path.normalize(pathName);
    const filePath = path.join(projectRoot, safePath);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error: unknown) {
      return NextResponse.json(
        {
          error:
            "File not found: " + (error instanceof Error ? error.message : ""),
        },
        { status: 404 }
      );
    }

    // Read the file
    const fileBuffer = await fs.readFile(filePath);

    // Determine content type
    const contentType = mime.lookup(filePath) || "application/octet-stream";

    // Create and return the response with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${path.basename(pathName)}"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          "Internal server error: " +
          (error instanceof Error ? error.message : ""),
      },
      { status: 500 }
    );
  }
}
