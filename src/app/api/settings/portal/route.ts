import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Organization, Settings } from "@/lib/mongodb";
import { handleSingleFile } from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { pipeline } from "stream";
import { promisify } from "util";
import sharp from "sharp";
import { parse } from "url";

const streamPipeline = promisify(pipeline);

async function saveFavicon(
  sourceUrl: string,
  destPath: string,
  oldPortalName?: string
): Promise<void> {
  try {
    if (!sourceUrl || typeof sourceUrl !== "string") {
      throw new Error("Invalid or missing source URL");
    }
    if (!destPath || typeof destPath !== "string") {
      throw new Error("Invalid or missing destination path");
    }

    const finalDestPath = destPath.endsWith(".png")
      ? destPath
      : path.join(path.dirname(destPath), "favicon.png");

    const destDir = path.dirname(finalDestPath);
    if (oldPortalName) {
      const parentDir = path.dirname(destDir);
      const oldDir = path.join(parentDir, oldPortalName);
      if (fs.existsSync(oldDir) && oldDir !== destDir) {
        try {
          await fs.promises.rename(oldDir, destDir);
        } catch (renameError) {
          throw new Error(
            `Failed to rename directory from ${oldDir} to ${destDir}: ${renameError instanceof Error ? renameError.message : "Unknown error"}`
          );
        }
      }
    }

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const downloadImage = async (
      url: string,
      outputPath: string
    ): Promise<void> => {
      const protocol = url.startsWith("https") ? https : http;

      return new Promise((resolve, reject) => {
        protocol
          .get(url, (res) => {
            if (res.statusCode !== 200) {
              reject(
                new Error(
                  `Failed to download image: HTTP status ${res.statusCode}`
                )
              );
              return;
            }

            const contentType = res.headers["content-type"]?.toLowerCase();
            if (!contentType?.startsWith("image/")) {
              reject(
                new Error(`Invalid content type: ${contentType || "unknown"}`)
              );
              return;
            }

            const writeStream = fs.createWriteStream(outputPath);
            streamPipeline(res, writeStream)
              .then(resolve)
              .catch((err) =>
                reject(new Error(`Failed to write image: ${err.message}`))
              );
          })
          .on("error", (err) =>
            reject(new Error(`Network error: ${err.message}`))
          );
      });
    };

    // Handle remote URL with query parameters
    const isRemote =
      sourceUrl.startsWith("http") || sourceUrl.startsWith("/api/");
    const tempImagePath = path.join(
      process.cwd(),
      "temp",
      `favicon-${Date.now()}.tmp`
    );

    let inputImagePath = sourceUrl;
    if (isRemote) {
      const parsedUrl = parse(sourceUrl, true);
      const pathName = parsedUrl.query.pathName as string | undefined;

      let fullUrl = sourceUrl;
      if (pathName) {
        const normalizedPath = path.posix
          .normalize(decodeURI(pathName))
          .replace(/\\/g, "/");
        fullUrl = `http://localhost:3000/api/files?pathName=${encodeURIComponent(normalizedPath)}`;
      } else if (!sourceUrl.startsWith("http")) {
        fullUrl = `http://localhost:3000${sourceUrl}`;
      }

      const tempDir = path.dirname(tempImagePath);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      await downloadImage(fullUrl, tempImagePath);
      inputImagePath = tempImagePath;
    } else {
      inputImagePath = path.resolve(process.cwd(), decodeURI(sourceUrl));
      if (!fs.existsSync(inputImagePath)) {
        throw new Error(`Local source file does not exist: ${inputImagePath}`);
      }
    }

    await sharp(inputImagePath)
      .resize(48, 48, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ quality: 80 })
      .toFile(finalDestPath);

    if (isRemote && fs.existsSync(tempImagePath)) {
      try {
        await fs.promises.unlink(tempImagePath);
      } catch (cleanupError) {
        console.warn(
          `Failed to clean up temp file ${tempImagePath}: ${cleanupError instanceof Error ? cleanupError.message : "Unknown error"}`
        );
      }
    }
  } catch (error) {
    console.error(
      `saveFavicon error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let organizationId = "";
    const token = req.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId || "";
      }
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }
    const settings = await Settings.findOne(
      { organizationId: organizationId },
      {
        "fileStorage.storageType": 1,
        portalConfigs: 1,
        smtpConfigs: 1,
      }
    );

    if (!settings) {
      return NextResponse.json({
        fileStorage: null,
        portalLogo: null,
        portalName: null,
      });
    }

    const response = {
      fileStorage: settings.fileStorage,
      portalLogo: settings.portalConfigs?.portalLogo || null,
      portalName: settings.portalConfigs?.portalName || "",
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await dbConnect();

    const token = req.cookies.get("token");
    if (!token?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptToken(String(token.value));
    if (!decryptedResponse.success) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = decryptedResponse.user;
    if (userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = userData.organizationId || "";
    const fileStorage = userData.fileStorage || "local";

    const org = await Organization?.findById(organizationId);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const currentOrgName =
      org.name?.toLowerCase().replace(/\s+/g, "-") || organizationId;
    const data = await req.json();
    const newPortalName = data.portalName
      ? data.portalName.toLowerCase().replace(/\s+/g, "-")
      : currentOrgName;

    // Fetch current settings to get old portal name
    const currentSettings = await Settings!.findOne({ organizationId });
    const oldPortalName = currentSettings?.portalConfigs?.portalName
      ? currentSettings.portalConfigs.portalName
          .toLowerCase()
          .replace(/\s+/g, "-")
      : currentOrgName;

    // Handle favicon if a new logo is provided
    let uploadedLogo = null;
    if (data.portalLogo) {
      try {
        uploadedLogo = await handleSingleFile(
          data.portalLogo,
          fileStorage,
          organizationId
        );
      } catch (fileError) {
        console.error(
          `File upload failed: ${fileError instanceof Error ? fileError.message : "Unknown error"}`
        );
        return NextResponse.json(
          {
            error: `Failed to process logo file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
          },
          { status: 400 }
        );
      }

      const faviconTargetPath = path.join(
        process.cwd(),
        "..",
        "assets",
        "organizations",
        newPortalName,
        "favicon.png"
      );
      const source = uploadedLogo?.url;

      if (source) {
        try {
          await saveFavicon(source, faviconTargetPath, oldPortalName);
        } catch (faviconError) {
          console.error(
            `Favicon save failed: ${faviconError instanceof Error ? faviconError.message : "Unknown error"}`
          );
          return NextResponse.json(
            {
              error: `Failed to save favicon: ${faviconError instanceof Error ? faviconError.message : "Unknown error"}`,
            },
            { status: 500 }
          );
        }
      } else {
        console.warn("Skipping favicon update: no valid source URL.");
        return NextResponse.json(
          { error: "No valid logo URL provided for favicon" },
          { status: 400 }
        );
      }
    } else {
      // No portalLogo provided, check and remove existing favicon
      const faviconPath = path.join(
        process.cwd(),
        "..",
        "assets",
        "organizations",
        newPortalName,
        "favicon.png"
      );
      console.log(
        `[PUT] No portalLogo provided, checking favicon at: ${faviconPath}`
      );

      if (fs.existsSync(faviconPath)) {
        // console.log(`[PUT] Favicon found at ${faviconPath}, removing...`);
        fs.unlinkSync(faviconPath);
        // console.log(`[PUT] Favicon removed successfully from ${faviconPath}`);
      } else {
        console.log(
          `[PUT] No favicon found at ${faviconPath}, skipping removal.`
        );
      }
    }

    console.log("KKKKKKKKKKKKK ", uploadedLogo);
    // Update organization and settings
    const updatedPortal = {
      portalLogo: uploadedLogo || null,
      portalName:
        data.portalName || currentSettings?.portalConfigs?.portalName || "",
    };

    console.log("❓❓❓❓ ", updatedPortal);

    await Organization?.findByIdAndUpdate(organizationId, {
      name: updatedPortal.portalName,
    });

    const updatedSettings = await Settings?.findOneAndUpdate(
      { organizationId },
      { portalConfigs: updatedPortal },
      { new: true, runValidators: true, upsert: true }
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    console.error(
      `PUT handler error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}
