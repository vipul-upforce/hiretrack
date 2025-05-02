import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const backupsDir = path.join(process.cwd(), "..", "backups");
    // console.log("BACKUPDS DI:R: ", backupsDir);

    const entries = await fs.readdir(backupsDir, { withFileTypes: true });
    // console.log("BACKUPDS Entries ", entries);

    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (file) => {
          const filePath = path.join(backupsDir, file.name);
          const stats = await fs.stat(filePath);
          return {
            name: file.name,
            url: `/api/files?pathName=../backups/${encodeURIComponent(file.name)}`,
            createdAt: stats.birthtime.toISOString(),
            size: stats.size,
          };
        })
    );

    return NextResponse.json({ files });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Could not list backup files", detail: error.message },
      { status: 500 }
    );
  }
}
