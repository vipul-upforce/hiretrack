import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const logDir =
    process.platform === "linux"
      ? path.join(process.env.HOME || "/root", ".pm2", "logs")
      : "/Users/Upforce/.pm2/logs";

  try {
    const files = fs.readdirSync(logDir);

    const filteredFiles = files.filter(
      (file) => (file.endsWith(".log") || file.endsWith(".txt")) && !file.endsWith(".gz")
    );

    return NextResponse.json({ files: filteredFiles });
  } catch (error) {
    console.error("PM2 log read error:", error);
    return NextResponse.json(
      { error: "Failed to read PM2 log directory" },
      { status: 500 }
    );
  }
}
