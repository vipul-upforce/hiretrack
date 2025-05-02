import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const backupsDir = path.join(process.cwd(), "..", "backups");
    // console.log("BACKUPDS DI:R: ", backupsDir);

    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    // console.log("BACKUPDS Entries ", entries);

    const files = entries
      .filter((entry) => entry.isFile())
      .map((file) => ({
        name: file.name,
        url: `/api/files?pathName=../backups/${encodeURIComponent(file.name)}`,
      }));

    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Could not list backup files", detail: error.message },
      { status: 500 }
    );
  }
}
