import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Organization, User } from "@/lib/mongodb";
import mongoose  from "mongoose";
import bcrypt from 'bcryptjs';

// Handle POST request
export async function POST(req: Request) {
  await connectToDatabase()
  let createdOrg = null;
  let admin = null;

  try {
    const { name, adminData } = await req.json();
    
    if (!Organization || !User) {
      return NextResponse.json(
        { error: "Database not connected." },
        { status: 400 }
      );
    }

    try {
      // 1. Create organization first
      createdOrg = await Organization.create([{ 
        name: name,  
        adminId: new mongoose.Types.ObjectId(), // adminId is required
        customFields: { 
          h3qmln24v: { fields: [], formName: "Job Position" }, 
          g2xh8hoe1: { fields: [], formName: "Candidate" } 
        } 
      }]);

      const hashedPassword = await bcrypt.hash(adminData.password, 10);

      // 2. Create admin user with org ID
      admin = await User.create([{
        ...adminData,
        password:hashedPassword,
        organizationId: createdOrg[0]._id,
        role: 'admin'
      }]);

      // 3. Update organization with admin ID
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
