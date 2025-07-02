import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import readline from "readline";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ file: string[] }> }
) {
  const { file } = await params;
  const { searchParams } = new URL(req.url);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = parseInt(searchParams.get("limit") || "100", 10);
  const query = searchParams.get("query")?.toLowerCase() || "";

  const logDir =
    process.platform === "linux"
      ? "/var/log/nginx"
      : "/Users/Upforce/Documents/hiretrack-latest";
  const filePath = path.join(logDir, ...file);

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Log file not found" },
        { status: 404 }
      );
    }

    // Count total matching lines
    let totalLines = 0;
    const lineCounter = readline.createInterface({
      input: fs.createReadStream(filePath, "utf-8"),
      crlfDelay: Infinity,
    });

    for await (const line of lineCounter) {
      if (line.trim() && (!query || line.toLowerCase().includes(query))) {
        totalLines++;
      }
    }

    // Read specific matching lines for pagination
    const lines: string[] = [];
    let currentLine = 0;
    const fileStream = fs.createReadStream(filePath, "utf-8");
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (line.trim() && (!query || line.toLowerCase().includes(query))) {
        if (currentLine >= offset && currentLine < offset + limit) {
          lines.push(line);
        }
        currentLine++;
        if (currentLine >= offset + limit) {
          break;
        }
      }
    }

    return NextResponse.json({
      content: lines,
      totalLines,
      offset,
      limit,
      query,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read nginx log file" },
      { status: 500 }
    );
  }
}
