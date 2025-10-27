import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization, Settings } from "@/lib/mongodb";
import { handleSingleFile } from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import path from "path";
import fs from "fs";
import https from "https";
import http from "http";
import { pipeline } from "stream";
import { promisify } from "util";
// Removed sharp import
import { parse } from "url";
import {
  validateQueryParams,
  VALIDATION_PATTERNS,
  MAX_LENGTHS,
} from "@/lib/inputValidation";
import { apiRateLimiter } from "@/lib/rateLimiter";

const streamPipeline = promisify(pipeline);

// saveFavicon now just copies the image as-is, no resizing or format conversion
async function saveFavicon(
  sourceUrl: string,
  destPath: string,
  _?: string, // Unused parameter for backward compatibility
  token?: string
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
    if (!fs.existsSync(destDir)) {
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
          headers: authToken ? { Cookie: `token=${authToken}` } : {},
        };

        protocol
          .get(url, options, (res) => {
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
            writeStream.on("finish", () => {
              writeStream.close(() => resolve());
            });
            writeStream.on("error", (err) => {
              writeStream.close();
              reject(new Error(`Failed to write image: ${err.message}`));
            });

            streamPipeline(res, writeStream).catch((err) => {
              writeStream.close();
              reject(new Error(`Stream pipeline error: ${err.message}`));
            });
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
        fs.mkdirSync(tempDir, { recursive: true });
      }

      await downloadImage(fullUrl, tempImagePath, token);
      inputImagePath = tempImagePath;
    } else {
      inputImagePath = path.resolve(process.cwd(), decodeURI(sourceUrl));
      if (!fs.existsSync(inputImagePath)) {
        throw new Error(`Local source file does not exist: ${inputImagePath}`);
      }
    }

    // Instead of resizing/converting, just copy the file as-is
    await fs.promises.copyFile(inputImagePath, finalDestPath);

    if (isRemote && fs.existsSync(tempImagePath)) {
      await fs.promises.unlink(tempImagePath);
    }
  } catch (error) {
    console.error(
      `saveFavicon error: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

const handleGetPortalData = async (req: NextRequest) => {
  try {
    // SECURITY FIX: Validate query parameters
    const validation = validateQueryParams(req.nextUrl.searchParams, {
      org: {
        type: "string",
        maxLength: MAX_LENGTHS.shortText,
        pattern: VALIDATION_PATTERNS.safeString,
      },
      subdomain: {
        type: "string",
        maxLength: MAX_LENGTHS.shortText,
        pattern: VALIDATION_PATTERNS.slug,
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while ((!Settings || !Organization) && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!Settings || !Organization) {
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }

    let organizationId = "";
    let isAuthenticated = false;

    // Try to get organization from auth token
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      try {
        const decryptedResponse = await verifyAndDecryptToken(
          String(token?.value),
          orgId
        );
        const userData = decryptedResponse.user;
        if (decryptedResponse.success) {
          organizationId = userData.organizationId || "";
          isAuthenticated = true;
        }
      } catch (error) {
        // Token verification failed, continue as anonymous user
        console.log("Token verification failed, serving as anonymous user");
      }
    }

    let settings = null;

    if (organizationId) {
      // Authenticated user - get specific organization settings
      settings = await Settings.findOne(
        { organizationId: organizationId },
        {
          "fileStorage.storageType": 1,
          portalConfigs: 1,
          smtpConfigs: 1,
        }
      );
    } else {
      // Anonymous user - get default organization settings
      // Try to find a default organization or the first available one
      const defaultOrg = await Organization.findOne({}).sort({ createdAt: 1 });
      if (defaultOrg) {
        settings = await Settings.findOne(
          { organizationId: defaultOrg._id.toString() },
          {
            portalConfigs: 1,
          }
        );
      }
    }

    if (!settings) {
      return NextResponse.json({
        fileStorage: null,
        portalLogo: null,
        portalHeader: null,
        portalFooter: null,
        portalName: null,
      });
    }

    // For anonymous users, only return portal branding (no sensitive data)
    const response = isAuthenticated
      ? {
          fileStorage: settings.fileStorage,
          portalLogo: settings.portalConfigs?.portalLogo || null,
          portalLogoDark: settings.portalConfigs?.portalLogoDark || null,
          portalFavicon: settings.portalConfigs?.portalFavicon || null,
          portalHeader: settings.portalConfigs?.portalHeader || null,
          portalFooter: settings.portalConfigs?.portalFooter || null,
          portalName: settings.portalConfigs?.portalName || "",
          primaryColor: settings.portalConfigs?.primaryColor || "#6366f1",
          secondaryColor: settings.portalConfigs?.secondaryColor || "#8b5cf6",
        }
      : {
          // Anonymous users only get public portal branding
          fileStorage: null,
          portalLogo: settings.portalConfigs?.portalLogo || null,
          portalLogoDark: settings.portalConfigs?.portalLogoDark || null,
          portalFavicon: settings.portalConfigs?.portalFavicon || null,
          portalHeader: settings.portalConfigs?.portalHeader || null,
          portalFooter: settings.portalConfigs?.portalFooter || null,
          portalName: settings.portalConfigs?.portalName || "",
          primaryColor: settings.portalConfigs?.primaryColor || "#6366f1",
          secondaryColor: settings.portalConfigs?.secondaryColor || "#8b5cf6",
        };
    console.log(response, "etting responsee get -- = ");

    return NextResponse.json(response);
  } catch (error) {
    console.error("Portal settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleGetPortalData);
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get("auth_token")?.value;
    const orgId = req.cookies.get("org_id")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptToken(token, orgId);
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

    const data = await req.json();
    console.log(`[PUT] Request data keys: ${Object.keys(data)}`);
    console.log(`[PUT] Has portalHeaderHtml: ${!!data.portalHeaderHtml}`);
    console.log(`[PUT] Has portalFooterHtml: ${!!data.portalFooterHtml}`);
    if (data.portalHeaderHtml) {
      console.log(`[PUT] Header HTML length: ${data.portalHeaderHtml.length}`);
    }
    if (data.portalFooterHtml) {
      console.log(`[PUT] Footer HTML length: ${data.portalFooterHtml.length}`);
    }

    const currentSettings = await Settings!.findOne({ organizationId });

    let uploadedLogo = null;
    let uploadedLogoDark = null;
    let uploadedFavicon = null;
    let uploadedHeader = null;
    let uploadedFooter = null;

    // Handle HTML content for header
    if (data?.portalHeaderHtml) {
      try {
        console.log(`[PUT] Processing header HTML for org: ${organizationId}`);
        const headerPath = path.join(
          process.cwd(),
          "..",
          "assets",
          "organizations",
          organizationId,
          "header.html"
        );

        console.log(`[PUT] Header file path: ${headerPath}`);

        // Ensure directory exists
        const headerDir = path.dirname(headerPath);
        if (!fs.existsSync(headerDir)) {
          console.log(`[PUT] Creating directory: ${headerDir}`);
          fs.mkdirSync(headerDir, { recursive: true });
        }

        // Remove existing header file if it exists
        if (fs.existsSync(headerPath)) {
          console.log(`[PUT] Removing existing header file: ${headerPath}`);
          fs.unlinkSync(headerPath);
          console.log(`[PUT] Existing header file removed successfully`);
        }

        // Write HTML content to file
        await fs.promises.writeFile(headerPath, data.portalHeaderHtml, "utf8");
        console.log(
          `[PUT] Header HTML file created successfully at: ${headerPath}`
        );

        uploadedHeader = {
          id: Date.now().toString(),
          name: "header.html",
          url: `/api/files?pathName=../assets/organizations/${organizationId}/header.html`,
          type: "text/html",
          size: Buffer.byteLength(data.portalHeaderHtml, "utf8"),
        };

        console.log(
          `[PUT] Header file metadata: ${JSON.stringify(uploadedHeader)}`
        );
      } catch (error) {
        console.error("Failed to save header HTML:", error);
        return NextResponse.json(
          {
            error: `Failed to save header HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 }
        );
      }
    }

    // Handle HTML content for footer
    if (data?.portalFooterHtml) {
      try {
        console.log(`[PUT] Processing footer HTML for org: ${organizationId}`);
        const footerPath = path.join(
          process.cwd(),
          "..",
          "assets",
          "organizations",
          organizationId,
          "footer.html"
        );

        console.log(`[PUT] Footer file path: ${footerPath}`);

        // Ensure directory exists
        const footerDir = path.dirname(footerPath);
        if (!fs.existsSync(footerDir)) {
          console.log(`[PUT] Creating directory: ${footerDir}`);
          fs.mkdirSync(footerDir, { recursive: true });
        }

        // Remove existing footer file if it exists
        if (fs.existsSync(footerPath)) {
          console.log(`[PUT] Removing existing footer file: ${footerPath}`);
          fs.unlinkSync(footerPath);
          console.log(`[PUT] Existing footer file removed successfully`);
        }

        // Write HTML content to file
        await fs.promises.writeFile(footerPath, data.portalFooterHtml, "utf8");
        console.log(
          `[PUT] Footer HTML file created successfully at: ${footerPath}`
        );
        console.log(
          `[PUT] Footer HTML length: ${fs.readFileSync(footerPath, "utf8")}`
        );

        uploadedFooter = {
          id: Date.now().toString(),
          name: "footer.html",
          url: `/api/files?pathName=../assets/organizations/${organizationId}/footer.html`,
          type: "text/html",
          size: Buffer.byteLength(data.portalFooterHtml, "utf8"),
        };

        console.log(
          `[PUT] Footer file metadata: ${JSON.stringify(uploadedFooter)}`
        );
      } catch (error) {
        console.error("Failed to save footer HTML:", error);
        return NextResponse.json(
          {
            error: `Failed to save footer HTML: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
          { status: 500 }
        );
      }
    }

    if (data?.portalLogo) {
      try {
        console.log(`[PUT] Processing portalLogo: ${data.portalLogo}`);
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
        organizationId,
        "favicon.png"
      );
      const source = uploadedLogo?.url;

      if (source) {
        console.log(`[PUT] Saving favicon from source: ${source}`);
        try {
          await saveFavicon(source, faviconTargetPath, undefined, token);
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
        organizationId,
        "favicon.png"
      );
      console.log(
        `[PUT] No portalLogo provided, checking favicon at: ${faviconPath}`
      );

      if (fs.existsSync(faviconPath)) {
        console.log(`[PUT] Favicon found at ${faviconPath}, removing...`);
        fs.unlinkSync(faviconPath);
        console.log(`[PUT] Favicon removed successfully from ${faviconPath}`);
      } else {
        console.log(
          `[PUT] No favicon found at ${faviconPath}, skipping removal.`
        );
      }
    }

    // Handle dark logo upload
    if (data?.portalLogoDark) {
      try {
        console.log(`[PUT] Processing portalLogoDark: ${data.portalLogoDark}`);
        uploadedLogoDark = await handleSingleFile(
          data.portalLogoDark,
          fileStorage,
          organizationId
        );
      } catch (fileError) {
        console.error(
          `Dark logo upload failed: ${fileError instanceof Error ? fileError.message : "Unknown error"}`
        );
        return NextResponse.json(
          {
            error: `Failed to process dark logo file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
          },
          { status: 400 }
        );
      }
    }

    // Handle favicon upload
    if (data?.portalFavicon) {
      try {
        console.log(`[PUT] Processing portalFavicon: ${data.portalFavicon}`);
        uploadedFavicon = await handleSingleFile(
          data.portalFavicon,
          fileStorage,
          organizationId
        );
      } catch (fileError) {
        console.error(
          `Favicon upload failed: ${fileError instanceof Error ? fileError.message : "Unknown error"}`
        );
        return NextResponse.json(
          {
            error: `Failed to process favicon file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
          },
          { status: 400 }
        );
      }
    }

    // Handle removal of header HTML file if no content provided
    if (!data?.portalHeaderHtml) {
      const headerRelativePath = path.join(
        "..",
        "assets",
        "organizations",
        organizationId,
        "header.html"
      );
      const headerPath = path.join(process.cwd(), headerRelativePath);

      if (fs.existsSync(headerPath)) {
        console.log(
          `[PUT] No header HTML provided, removing existing file: ${headerPath}`
        );
        fs.unlinkSync(headerPath);
        uploadedHeader = null; // Clear the header reference
      }
    }

    // Handle removal of footer HTML file if no content provided
    if (!data?.portalFooterHtml) {
      const footerRelativePath = path.join(
        "..",
        "assets",
        "organizations",
        organizationId,
        "footer.html"
      );
      const footerPath = path.join(process.cwd(), footerRelativePath);

      if (fs.existsSync(footerPath)) {
        console.log(
          `[PUT] No footer HTML provided, removing existing file: ${footerPath}`
        );
        fs.unlinkSync(footerPath);
        uploadedFooter = null; // Clear the footer reference
      }
    }

    const updatedPortal = {
      portalHeader:
        uploadedHeader || currentSettings?.portalConfigs?.portalHeader || null,
      portalFooter:
        uploadedFooter || currentSettings?.portalConfigs?.portalFooter || null,
      portalLogo:
        uploadedLogo || currentSettings?.portalConfigs?.portalLogo || null,
      portalLogoDark:
        uploadedLogoDark ||
        currentSettings?.portalConfigs?.portalLogoDark ||
        null,
      portalFavicon:
        uploadedFavicon ||
        currentSettings?.portalConfigs?.portalFavicon ||
        null,
      portalName:
        data.portalName || currentSettings?.portalConfigs?.portalName || "",
      primaryColor:
        data.primaryColor ||
        currentSettings?.portalConfigs?.primaryColor ||
        "#6366f1",
      secondaryColor:
        data.secondaryColor ||
        currentSettings?.portalConfigs?.secondaryColor ||
        "#8b5cf6",
    };

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
