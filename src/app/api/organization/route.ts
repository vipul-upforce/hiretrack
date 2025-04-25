import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { Organization, User } from "@/lib/mongodb";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { verifyAndDecryptToken } from "@/middleware";

// Handle POST request
export async function POST(req: NextRequest) {
  await connectToDatabase();
  let createdOrg = null;
  let admin = null;
  let organizationId = "";
  const token = req.cookies.get("token");
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
      if (settings?.multipleOrg === false) {
        return NextResponse.json(
          { error: "You cannot create a new organization." },
          { status: 401 }
        );
      }
    } else {
      const totalOrgs = await Organization.find({}).lean();
      if (totalOrgs.length === 1) {
        const settings = await Settings.findOne({
          organizationId: String(totalOrgs[0]._id),
        });
        if (!settings?.multipleOrg) {
          return NextResponse.json(
            { error: "You cannot create a new organization." },
            { status: 401 }
          );
        }
      }
    }

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
        await Organization.deleteOne({ _id: createdOrg[0]._id });
      }
      throw adminError; // Re-throw to be caught by outer catch block
    }
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
  // const token = req.cookies.get("token");
  // if (token?.value) {
  //   const decryptedResponse = await verifyAndDecryptToken(String(token?.value));
  //   const userData = decryptedResponse.user;
  //   if (decryptedResponse.success) {
  //     organizationId = userData.organizationId || "";
  //   }
  // }
  await connectToDatabase();
  if (!Settings) {
    throw new Error("Not connected to Database");
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
  const settings = await Settings.find({});
  // console.log("⛔⛔⛔ ", settings);
  if (settings.length > 1 || settings.length === 0) {
    return NextResponse.json({
      allow: true,
    });
  } else if (settings.length === 1 && settings[0].multipleOrg !== false) {
    return NextResponse.json({
      allow: true,
    });
  }
  return NextResponse.json({
    allow: false,
  });
  // }
}
