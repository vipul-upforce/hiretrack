import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { Organization, User } from "@/lib/mongodb";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { verifyAndDecryptToken } from "../../../../middleware";
import path from "path";
import fs from "fs/promises";

const ORG_BASE_DIR = path.join(process.cwd(), "organizations");
// Handle POST request
async function ensureBaseDir() {
  try {
    await fs.mkdir(ORG_BASE_DIR, { recursive: true });
  } catch (error) {
    console.error(
      `Failed to create base directory ${ORG_BASE_DIR}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    throw new Error("Failed to initialize organization directory");
  }
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  let createdOrg = null;
  let admin = null;
  let organizationId = "";
  const token = req.cookies.get("auth_token");
  if (token?.value) {
    const decryptedResponse = await verifyAndDecryptToken(String(token?.value));
    const userData = decryptedResponse.user;
    if (decryptedResponse.success) {
      organizationId = userData.organizationId || "";
    }
  }
  try {
    const { name, adminData } = await req.json();

    if (!Organization || !User || !Settings) {
      return NextResponse.json(
        { error: "Database not connected." },
        { status: 400 }
      );
    }

    if (organizationId !== "") {
      const settings = await Settings.findOne({
        organizationId: organizationId,
      });
      settings.portalConfigs.portalName = name;
      await settings.save();
      if (settings?.multipleOrg === false) {
        return NextResponse.json(
          {
            error:
              "Enable multiple organizations from settings of the first organization.",
          },
          { status: 401 }
        );
      }
    } else {
      const totalOrgs = await Organization.find({}).lean();
      if (totalOrgs.length === 1) {
        const settings = await Settings.findOne({
          organizationId: String(totalOrgs[0]._id),
        });
        settings.portalConfigs.portalName = name;
        await settings.save();
        if (!settings?.multipleOrg) {
          return NextResponse.json(
            {
              error:
                "Enable multiple organizations from settings of the first organization.",
            },
            { status: 401 }
          );
        }
      }
    }
    await ensureBaseDir();
    try {
      // 1. Create organization first
      createdOrg = await Organization.create([
        {
          name: name,
          adminId: new mongoose.Types.ObjectId(), // adminId is required
          customFields: {
            h3qmln24v: { fields: [], formName: "Job Position" },
            g2xh8hoe1: { fields: [], formName: "Candidate" },
          },
        },
      ]);
      const orgFolder = path.join(ORG_BASE_DIR, name);
      try {
        await fs.mkdir(orgFolder, { recursive: true });
      } catch (error) {
        console.error(
          `Failed to create folder for organization ${name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        // Optionally rollback organization creation
        await Organization.deleteOne({ _id: createdOrg[0]._id });
        throw new Error("Failed to create organization folder");
      }

      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // 2. Check if user with the same email already exists in the organization
      const existingUser = await User.findOne({
        email: adminData.email,
        organizationId: createdOrg[0]._id,
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "User with this email already exists in the organization." },
          { status: 400 }
        );
      }

      // 3. Create admin user with org ID
      admin = await User.create([
        {
          ...adminData,
          password: hashedPassword,
          organizationId: createdOrg[0]._id,
          role: "admin",
        },
      ]);

      await Settings.create([
        {
          organizationId: createdOrg[0]._id,
          multipleOrg: false,
          portalConfigs: {
            portalName: name,
          },
        },
      ]);

      // 4. Update organization with admin ID
      await Organization.findByIdAndUpdate(
        createdOrg[0]._id,
        { adminId: admin[0]._id },
        { new: true }
      );

      return NextResponse.json(
        {
          message: "Organization and Admin Created Successfully",
          organization: createdOrg[0],
          admin: admin[0],
        },
        { status: 201 }
      );
    } catch (adminError) {
      // Manual rollback: Delete the created organization if admin creation fails
      if (createdOrg) {
        const orgFolder = path.join(ORG_BASE_DIR, name);
        await Organization.deleteOne({ _id: createdOrg[0]._id });
        try {
          await fs.rm(orgFolder, { recursive: true, force: true });
        } catch (cleanupError) {
          console.warn(
            `Failed to clean up folder ${orgFolder}: ${cleanupError instanceof Error ? cleanupError.message : "Unknown error"}`
          );
        }
      }
      throw adminError; // Re-throw to be caught by outer catch block
    }
  } catch (error: unknown) {
    console.log(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 400 }
    );
  }
}

// Handle PUT request
export async function PUT(req: Request) {
  await connectToDatabase();

  try {
    const { orgId, lanes } = await req.json();
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      { lanes },
      { new: true }
    );

    if (!updatedOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedOrg, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 400 }
    );
  }
}

// Handle unsupported methods
export function OPTIONS() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}

//!!! THIS IMPLIES RESTRICT ACCESS TO REGISTER/ORG PAGE
export async function GET(req: NextRequest) {
  // let organizationId;

  // if (token?.value) {
  //   const decryptedResponse = await verifyAndDecryptToken(String(token?.value));
  //   const userData = decryptedResponse.user;
  //   if (decryptedResponse.success) {
  //     organizationId = userData.organizationId || "";
  //   }
  // }

  try {
    await connectToDatabase();
    if (!Settings) {
      return NextResponse.json(
        { error: "Settings model not found" },
        { status: 500 }
      );
    }
    // if (organizationId != "") {
    //   const settings = await Settings.find({
    //     organizationId: String(organizationId),
    //   });
    //   console.log("✅✅✅ ", settings);
    //   if (settings[0].multipleOrg !== false) {
    //     return {
    //       allow: true,
    //     };
    //   }
    //   return {
    //     allow: false,
    //   };
    // } else {
    const settings = await Settings.find(
      {},
      {
        fileStorage: 0,
        mailConfig: 0,
        gemini: 0,
        aiProviders: 0,
        emailTemplates: 0,
        googleCalendar: 0,
        twoFA: 0,
      }
    );
    // console.log("⛔⛔⛔ ", settings);
    if (settings.length > 1 || settings.length === 0) {
      return NextResponse.json({
        allow: true,
        data: settings,
      });
    } else if (settings.length === 1 && settings[0].multipleOrg !== false) {
      return NextResponse.json({
        allow: true,
        data: settings,
      });
    }
    return NextResponse.json({
      allow: false,
      data: settings,
    });
    // }
  } catch (error) {
    console.error("Organization API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
