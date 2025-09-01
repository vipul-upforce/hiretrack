import { NextRequest, NextResponse } from "next/server";
import { FileUrlMapping } from "@/lib/mongodb";
import connectToDatabase from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = await params;

  if (!fileId) {
    return NextResponse.json({ error: "File ID is required" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const mapping = await FileUrlMapping?.findOne({ fileId });

    if (!mapping) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const realUrl = mapping.realUrl;

    const response = await fetch(realUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: response.status }
      );
    }

    const fileBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Cache-Control", "private, max-age=3600");

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
