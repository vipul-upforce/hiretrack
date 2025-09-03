import { NextResponse } from "next/server";
import fs from "fs";
// import path from "path"; 

export async function GET() {
  if (process.platform === "linux") {
    const logDir = "/var/log/nginx";
    try {
      const files = fs.readdirSync(logDir);
      const filteredFiles = files.filter((file) => !file.endsWith(".gz"));
      return NextResponse.json({ files: filteredFiles });
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: "Failed to read nginx log directory" },
        { status: 500 }
      );
    }
  } else {
    // const logDir = "/Users/Upforce/Documents/hiretrack-latest";
    const logDir = "/Users/UpforceTech/hiretrack";
    try {
      const files = fs.readdirSync(logDir);
      const filteredFiles = files.filter(
        (file) => !file.endsWith(".tsbuildinfo")
      );
      return NextResponse.json({ files: filteredFiles });
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: "Failed to read nginx log directory" },
        { status: 500 }
      );
    }
    // return NextResponse.json({ files: [] });
  }
}
