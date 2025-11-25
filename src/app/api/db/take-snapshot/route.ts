import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { getAuthenticatedUser } from "@/app/actions/auth";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, ["admin"]);
    if (!user) {
      return NextResponse.json({ message: "Not Authorized" }, { status: 401 });
    }
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      return NextResponse.json(
        { message: "Missing MONGO_URI environment variable" },
        { status: 500 }
      );
    }

    const backupsRoot = path.join(process.cwd(), "..", "backups");
    const timestamp = Date.now().toString();
    const backupFileName = `backup - ${timestamp}.tar.gz`;
    const tempDumpDir = path.join(backupsRoot, `dump-${timestamp}`);
    const archivePath = path.join(backupsRoot, backupFileName);

    if (!existsSync(backupsRoot)) {
      await fs.mkdir(backupsRoot, { recursive: true });
    }

    await fs.mkdir(tempDumpDir, { recursive: true });

    const dumpCommand = `mongodump --uri="${mongoUri}" --out="${tempDumpDir}"`;
    try {
      await execAsync(dumpCommand);
    } catch (dumpError) {
      console.error("Backup failed during mongodump:", dumpError);
      await fs.rm(tempDumpDir, { recursive: true, force: true });
      return NextResponse.json(
        { message: "Failed to create MongoDB dump", error: String(dumpError) },
        { status: 500 }
      );
    }

    // Compress the dump to tar.gz
    const tarCommand = `tar -czf "${archivePath}" -C "${tempDumpDir}" .`;
    try {
      await execAsync(tarCommand);
    } catch (tarError) {
      console.error("Compression failed:", tarError);
      await fs.rm(tempDumpDir, { recursive: true, force: true });
      return NextResponse.json(
        { message: "Failed to compress backup", error: String(tarError) },
        { status: 500 }
      );
    }

    // Clean up temporary dump directory
    await fs.rm(tempDumpDir, { recursive: true, force: true });

    return NextResponse.json(
      { message: "Backup created successfully", archive: archivePath },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during backup process:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req, ["admin"]);
    if (!user) {
      return NextResponse.json({ message: "Not Authorized" }, { status: 401 });
    }
    const { fileName } = await req.json();
    // console.log("FILENAME: ", fileName);
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { message: "Invalid or missing fileName in request body" },
        { status: 400 }
      );
    }

    const backupsRoot = path.join(process.cwd(), "..", "backups");
    const filePath = path.join(backupsRoot, fileName);
    // console.log("FILENAME: ", filePath);

    if (!existsSync(filePath)) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    await fs.unlink(filePath);

    return NextResponse.json(
      { message: `Backup deleted successfully` },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error during backup deletion:", error);
    return NextResponse.json(
      {
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
