import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { auth } from "@/lib/auth";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const session = await auth(req);
  const organizationId = session?.user.organizationId;
  try {
    console.log("###########ORGID: ", organizationId);
    if (!organizationId) {
      throw new Error("Not Authorized");
    }

    const assetsRoot = path.join(process.cwd(), "..", "assets");
    const timestamp = Date.now().toString();
    const archiveFileName = `assets-${timestamp}.tar.gz`;
    const tempDir = path.join(
      process.cwd(),
      "..",
      "temp",
      `assets-${timestamp}`
    );
    const tempArchivePath = path.join(tempDir, archiveFileName);

    // Check if assets directory exists
    if (!existsSync(assetsRoot)) {
      return NextResponse.json(
        { message: "Assets directory does not exist" },
        { status: 404 }
      );
    }

    // Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });

    // Copy assets to temporary directory
    const tempAssetsDir = path.join(tempDir, "assets");
    await fs.mkdir(tempAssetsDir, { recursive: true });
    await fs.cp(assetsRoot, tempAssetsDir, { recursive: true });

    // Compress the assets to tar.gz
    const tarCommand = `tar -czf "${tempArchivePath}" -C "${tempAssetsDir}" .`;
    try {
      await execAsync(tarCommand);
    } catch (tarError) {
      console.error("Compression failed:", tarError);
      await fs.rm(tempDir, { recursive: true, force: true });
      return NextResponse.json(
        { message: "Failed to compress assets", error: String(tarError) },
        { status: 500 }
      );
    }

    // Read the archive into memory
    const archiveBuffer = await fs.readFile(tempArchivePath);

    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });

    // Send the archive in the response
    return new NextResponse(archiveBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${archiveFileName}"`,
        "Content-Length": archiveBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error during assets archiving process:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Recursively calculate the total size of all files in a directory
async function calculateDirectorySize(dirPath: string): Promise<number> {
  let totalSize = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += await calculateDirectorySize(entryPath);
    } else if (entry.isFile()) {
      const stats = await fs.stat(entryPath);
      totalSize += stats.size;
    }
  }

  return totalSize;
}

export async function POST(req: NextRequest) {
  const session = await auth(req);
  const organizationId = session?.user.organizationId;
  try {
    console.log("###########ORGID: ", organizationId);
    if (!organizationId) {
      return NextResponse.json({ message: "Not Authorized" }, { status: 401 });
    }

    const assetsRoot = path.join(process.cwd(), "..", "assets");

    // Check if assets directory exists
    if (!existsSync(assetsRoot)) {
      return NextResponse.json(
        { message: "Assets directory does not exist" },
        { status: 404 }
      );
    }

    // Get metadata for the assets directory
    const stats = await fs.stat(assetsRoot);
    const totalSize = await calculateDirectorySize(assetsRoot);
    const assetsData = {
      name: "assets",
      type: "directory",
      path: "assets",
      size: totalSize,
      createdAt: stats.birthtime.toISOString(),
    };

    return NextResponse.json(
      { message: "Assets metadata retrieved successfully", data: assetsData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error retrieving assets metadata:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
