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
  oldPortalName?: string,
  token?: string // Add token parameter
): Promise<void> {
  try {
    console.log(
      `[saveFavicon] Starting with sourceUrl: ${sourceUrl}, destPath: ${destPath}, token: ${token ? "provided" : "not provided"}`
    );
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
        // console.log(
        //   `[saveFavicon] Renaming directory from ${oldDir} to ${destDir}`
        // );
        await fs.promises.rename(oldDir, destDir);
      }
    }

    if (!fs.existsSync(destDir)) {
      // console.log(`[saveFavicon] Creating directory: ${destDir}`);
      fs.mkdirSync(destDir, { recursive: true });
    }

    const downloadImage = async (
      url: string,
      outputPath: string,
      authToken?: string
    ): Promise<void> => {
      const protocol = url.startsWith("https") ? https : http;

      return new Promise((resolve, reject) => {
        const options = {
          headers: authToken ? { Cookie: `token=${authToken}` } : {}, // Pass token in Cookie header
        };

        // console.log(`[downloadImage] Requesting URL: ${url}`);
        // console.log(
        //   `[downloadImage] Headers: ${JSON.stringify(options.headers)}`
        // );

        protocol
          .get(url, options, (res) => {
            // console.log(`[downloadImage] Status Code: ${res.statusCode}`);
            // console.log(
            //   `[downloadImage] Response Headers: ${JSON.stringify(res.headers)}`
            // );
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

      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      let fullUrl = sourceUrl;
      if (pathName) {
        const normalizedPath = path.posix
          .normalize(decodeURI(pathName))
          .replace(/\\/g, "/");
        fullUrl = `${baseUrl}/api/files?pathName=${encodeURIComponent(normalizedPath)}`;
      } else if (!sourceUrl.startsWith("http")) {
        fullUrl = `${baseUrl}${sourceUrl}`;
      }

      const tempDir = path.dirname(tempImagePath);
      if (!fs.existsSync(tempDir)) {
        // console.log(`[saveFavicon] Creating temp directory: ${tempDir}`);
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // console.log(`[saveFavicon] Downloading from: ${fullUrl}`);
      await downloadImage(fullUrl, tempImagePath, token);
      inputImagePath = tempImagePath;
    } else {
      inputImagePath = path.resolve(process.cwd(), decodeURI(sourceUrl));
      if (!fs.existsSync(inputImagePath)) {
        throw new Error(`Local source file does not exist: ${inputImagePath}`);
      }
    }

    // console.log(`[saveFavicon] Saving favicon to: ${finalDestPath}`);
    await sharp(inputImagePath)
      .resize(48, 48, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ quality: 80 })
      .toFile(finalDestPath);

    if (isRemote && fs.existsSync(tempImagePath)) {
      // console.log(`[saveFavicon] Cleaning up temp file: ${tempImagePath}`);
      await fs.promises.unlink(tempImagePath);
    }
  } catch (error) {
    console.error(
      `saveFavicon error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw error;
  }
}

async function saveHeaderFile(
  sourceUrl: string,
  destPath: string,
  oldPortalName?: string,
  token?: string // Add token parameter
): Promise<void> {
  try {
    console.log(
      `[saveHeaderFile] Starting with sourceUrl: ${sourceUrl}, destPath: ${destPath}, token: ${token ? "provided" : "not provided"}`
    );
    if (!sourceUrl || typeof sourceUrl !== "string") {
      throw new Error("Invalid or missing source URL");
    }
    if (!destPath || typeof destPath !== "string") {
      throw new Error("Invalid or missing destination path");
    }

    const finalDestPath = destPath.endsWith(".html")
      ? destPath
      : path.join(path.dirname(destPath), "headerFile.html");
    console.log("finalDestPath :>> ", finalDestPath);

    // const destDir = path.dirname(finalDestPath);
    // if (oldPortalName) {
    //   const parentDir = path.dirname(destDir);
    //   const oldDir = path.join(parentDir, oldPortalName);
    //   if (fs.existsSync(oldDir) && oldDir !== destDir) {
    //     console.log(
    //       `[saveFavicon] Renaming directory from ${oldDir} to ${destDir}`
    //     );
    //     await fs.promises.rename(oldDir, destDir);
    //   }
    // }

    // if (!fs.existsSync(destDir)) {
    //   console.log(`[saveFavicon] Creating directory: ${destDir}`);
    //   fs.mkdirSync(destDir, { recursive: true });
    // }

    // const downloadImage = async (
    //   url: string,
    //   outputPath: string,
    //   authToken?: string
    // ): Promise<void> => {
    //   const protocol = url.startsWith("https") ? https : http;

    //   return new Promise((resolve, reject) => {
    //     const options = {
    //       headers: authToken ? { Cookie: `token=${authToken}` } : {}, // Pass token in Cookie header
    //     };

    //     console.log(`[downloadImage] Requesting URL: ${url}`);
    //     console.log(
    //       `[downloadImage] Headers: ${JSON.stringify(options.headers)}`
    //     );

    //     protocol
    //       .get(url, options, (res) => {
    //         console.log(`[downloadImage] Status Code: ${res.statusCode}`);
    //         console.log(
    //           `[downloadImage] Response Headers: ${JSON.stringify(res.headers)}`
    //         );
    //         if (res.statusCode !== 200) {
    //           reject(
    //             new Error(
    //               `Failed to download image: HTTP status ${res.statusCode}`
    //             )
    //           );
    //           return;
    //         }

    //         const contentType = res.headers["content-type"]?.toLowerCase();
    //         if (!contentType?.startsWith("image/")) {
    //           reject(
    //             new Error(`Invalid content type: ${contentType || "unknown"}`)
    //           );
    //           return;
    //         }

    //         const writeStream = fs.createWriteStream(outputPath);
    //         streamPipeline(res, writeStream)
    //           .then(resolve)
    //           .catch((err) =>
    //             reject(new Error(`Failed to write image: ${err.message}`))
    //           );
    //       })
    //       .on("error", (err) =>
    //         reject(new Error(`Network error: ${err.message}`))
    //       );
    //   });
    // };

    // const isRemote =
    //   sourceUrl.startsWith("http") || sourceUrl.startsWith("/api/");
    // const tempImagePath = path.join(
    //   process.cwd(),
    //   "temp",
    //   `favicon-${Date.now()}.tmp`
    // );

    // let inputImagePath = sourceUrl;
    // if (isRemote) {
    //   const parsedUrl = parse(sourceUrl, true);
    //   const pathName = parsedUrl.query.pathName as string | undefined;

    //   const baseUrl =
    //     process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    //   let fullUrl = sourceUrl;
    //   if (pathName) {
    //     const normalizedPath = path.posix
    //       .normalize(decodeURI(pathName))
    //       .replace(/\\/g, "/");
    //     fullUrl = `${baseUrl}/api/files?pathName=${encodeURIComponent(normalizedPath)}`;
    //   } else if (!sourceUrl.startsWith("http")) {
    //     fullUrl = `${baseUrl}${sourceUrl}`;
    //   }

    //   const tempDir = path.dirname(tempImagePath);
    //   if (!fs.existsSync(tempDir)) {
    //     console.log(`[saveFavicon] Creating temp directory: ${tempDir}`);
    //     fs.mkdirSync(tempDir, { recursive: true });
    //   }

    //   console.log(`[saveFavicon] Downloading from: ${fullUrl}`);
    //   await downloadImage(fullUrl, tempImagePath, token);
    //   inputImagePath = tempImagePath;
    // } else {
    //   inputImagePath = path.resolve(process.cwd(), decodeURI(sourceUrl));
    //   if (!fs.existsSync(inputImagePath)) {
    //     throw new Error(`Local source file does not exist: ${inputImagePath}`);
    //   }
    // }

    // console.log(`[saveFavicon] Saving favicon to: ${finalDestPath}`);
    // await sharp(inputImagePath)
    //   .resize(48, 48, {
    //     fit: "contain",
    //     background: { r: 0, g: 0, b: 0, alpha: 0 },
    //   })
    //   .png({ quality: 80 })
    //   .toFile(finalDestPath);

    // if (isRemote && fs.existsSync(tempImagePath)) {
    //   console.log(`[saveFavicon] Cleaning up temp file: ${tempImagePath}`);
    //   await fs.promises.unlink(tempImagePath);
    // }
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
      portalHeader: settings.portalConfigs?.portalHeader || null,
      portalFooter: settings.portalConfigs?.portalFooter || null,
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

    const token = req.cookies.get("token")?.value;
    // console.log(`[PUT] Token received: ${token ? "provided" : "not provided"}`);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptToken(token);
    // console.log(
    //   `[PUT] Token verification: ${decryptedResponse.success ? "successful" : "failed"}`
    // );
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
    // console.log(`[PUT] Request data: ${JSON.stringify(data)}`);
    const newPortalName = data.portalName
      ? data.portalName.toLowerCase().replace(/\s+/g, "-")
      : currentOrgName;

    const currentSettings = await Settings!.findOne({ organizationId });
    const oldPortalName = currentSettings?.portalConfigs?.portalName
      ? currentSettings.portalConfigs.portalName
          .toLowerCase()
          .replace(/\s+/g, "-")
      : currentOrgName;

    let uploadedLogo = null;
    let uploadedHeader = null;
    let uploadedFooter = null;

    if (data.portalLogo) {
      try {
        // console.log(`[PUT] Processing portalLogo: ${data.portalLogo}`);
        uploadedLogo = await handleSingleFile(
          data.portalLogo,
          fileStorage,
          organizationId
        );
        // console.log(
        //   `[PUT] File upload result: ${JSON.stringify(uploadedLogo)}`
        // );
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
        // console.log(`[PUT] Saving favicon from source: ${source}`);
        try {
          await saveFavicon(source, faviconTargetPath, oldPortalName, token);
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
      const faviconPath = path.join(
        process.cwd(),
        "..",
        "assets",
        "organizations",
        newPortalName,
        "favicon.png"
      );
      // console.log(
      //   `[PUT] No portalLogo provided, checking favicon at: ${faviconPath}`
      // );

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

    if (data.portalHeader) {
      try {
        console.log(`[PUT] Processing portalLogo: ${data.portalHeader}`);
        uploadedHeader = await handleSingleFile(
          data.portalHeader,
          fileStorage,
          organizationId,
          currentSettings?.portalConfigs?.portalName
        );
        console.log(
          `[PUT] File upload result: ${JSON.stringify(uploadedHeader)}`
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
    } else {
      const headerPath = path.join(
        process.cwd(),
        "..",
        "assets",
        "organizations",
        newPortalName,
        "header.html"
      );
      console.log(
        `[PUT] No portalLogo provided, checking favicon at: ${headerPath}`
      );

      if (fs.existsSync(headerPath)) {
        console.log(`[PUT] header file found at ${headerPath}, removing...`);
        fs.unlinkSync(headerPath);
        console.log(
          `[PUT] header file removed successfully from ${headerPath}`
        );
      } else {
        console.log(
          `[PUT] No header file found at ${headerPath}, skipping removal.`
        );
      }
    }

    if (data.portalFooter) {
      try {
        console.log(`[PUT] Processing portalLogo: ${data.portalFooter}`);
        uploadedFooter = await handleSingleFile(
          data.portalFooter,
          fileStorage,
          organizationId,
          currentSettings?.portalConfigs?.portalName
        );
        console.log(
          `[PUT] File upload result: ${JSON.stringify(uploadedFooter)}`
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
    } else {
      const footerPath = path.join(
        process.cwd(),
        "..",
        "assets",
        "organizations",
        newPortalName,
        "footer.html"
      );
      console.log(
        `[PUT] No portalLogo provided, checking favicon at: ${footerPath}`
      );

      if (fs.existsSync(footerPath)) {
        console.log(`[PUT] header file found at ${footerPath}, removing...`);
        fs.unlinkSync(footerPath);
        console.log(
          `[PUT] header file removed successfully from ${footerPath}`
        );
      } else {
        console.log(
          `[PUT] No header file found at ${footerPath}, skipping removal.`
        );
      }
    }

    const updatedPortal = {
      portalHeader: uploadedHeader || null,
      portalFooter: uploadedFooter || null,
      portalLogo: uploadedLogo || null,
      portalName:
        data.portalName || currentSettings?.portalConfigs?.portalName || "",
    };

    // console.log("❓❓❓❓ ", updatedPortal);

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
