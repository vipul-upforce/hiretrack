import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function getFolderSize(folderPath: string) {
  try {
    const result = execSync(`du -sh "${folderPath}"`, { encoding: "utf-8" });
    return result.split("\t")[0];
  } catch {
    return "0M";
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rootKey = searchParams.get("root");
    const subPath = searchParams.get("path") || "";

    const isWindows = process.platform === "win32";

    const WINDOWS_PATHS: Record<string, string> = {
      nginx: "/Users/UpforceTech/",
      pm2: "/Users/Upforce/.pm2/logs",
      hiretrack: "/Users/UpforceTech/hiretrack",
    };

    const LINUX_PATHS: Record<string, string> = {
      nginx: "/var/log/nginx",
      pm2: "/.pm2/logs",
      hiretrack: "/root/.hiretrack",
    };

    if (rootKey) {
      const baseRootPath = isWindows
        ? WINDOWS_PATHS[rootKey]
        : LINUX_PATHS[rootKey];

      if (!baseRootPath) {
        return NextResponse.json(
          { error: "Invalid root directory" },
          { status: 400 }
        );
      }

      const fullPath = path.resolve(baseRootPath, subPath);

      if (!fullPath.startsWith(path.resolve(baseRootPath))) {
        return NextResponse.json(
          { error: "Access denied: Path outside root directory" },
          { status: 403 }
        );
      }

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json(
          { error: "Directory not found", path: fullPath },
          { status: 404 }
        );
      }

      const dirStat = fs.statSync(fullPath);
      if (!dirStat.isDirectory()) {
        return NextResponse.json(
          { error: "Path is not a directory", path: fullPath },
          { status: 400 }
        );
      }

      const files = fs
        .readdirSync(fullPath)
        .map((file) => {
          try {
            const filePath = path.join(fullPath, file);
            const stats = fs.statSync(filePath);

            return {
              name: file,
              // Relative path for the frontend to use in the next request
              relativePath: path.join(subPath, file),
              size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
              rawSize: stats.size,
              type: stats.isDirectory() ? "folder" : "file",
              // For folders, we might not know children count without reading,
              // but we can leave it undefined or try to read safely
              childrenCount: stats.isDirectory() ? 0 : undefined,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);

      return NextResponse.json({
        success: true,
        root: rootKey,
        currentPath: subPath,
        files,
      });
    }

    // 2. Handle Root Folder Stats (Initial View)
    const baseFolders = ["nginx", "pm2", "hiretrack"];
    const result = baseFolders.map((key) => {
      const folderPath = isWindows ? WINDOWS_PATHS[key] : LINUX_PATHS[key];

      let size = "0M";
      try {
        if (isWindows) {
          if (fs.existsSync(folderPath)) {
            // Simple recursive size for Windows (caution: slow on huge dirs)
            const getAllFiles = (
              dirPath: string,
              arrayOfFiles: string[] = []
            ) => {
              const files = fs.readdirSync(dirPath);
              files.forEach((file) => {
                const fullPath = path.join(dirPath, file);
                if (fs.statSync(fullPath).isDirectory()) {
                  getAllFiles(fullPath, arrayOfFiles);
                } else {
                  arrayOfFiles.push(fullPath);
                }
              });
              return arrayOfFiles;
            };

            const files = fs.readdirSync(folderPath);
            let total = 0;
            files.forEach((file) => {
              try {
                const stats = fs.statSync(path.join(folderPath, file));
                total += stats.size;
              } catch {}
            });
            size = (total / 1024 / 1024).toFixed(1) + "M";
          }
        } else {
          size = getFolderSize(folderPath);
        }
      } catch {}

      return {
        name: key,
        path: folderPath,
        size,
        type: "folder",
      };
    });

    return NextResponse.json({
      success: true,
      folders: result,
    });
  } catch (error) {
    console.error("Disk folder read error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve disk usage" },
      { status: 500 }
    );
  }
}
