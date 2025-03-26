import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
// import { User } from '@/models/User';
import { User } from "@/lib/mongodb"
import { auth } from '@/lib/auth';
import mongoose from "mongoose"
import { Organization } from '@/lib/mongodb';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();
    if(!User){
      return NextResponse.json({ error: "User not found" }, { status: 400 });
    }
    
    const users = await User.find(
      { 
        _id: { $ne: session.user.id },
        organizationId: session.user.organizationId,
        isDeleted: { $ne: true }
      },
      { password: 0 }
    ).sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          "Internal server error" +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}


export async function PUT(req: Request) {
  await dbConnect();

  try {
    var { adminId, organizationId } = await req.json();
    organizationId = new mongoose.Types.ObjectId(organizationId);
    if (!adminId || !organizationId) {
      return NextResponse.json({ error: 'Both adminId and organizationId are required' }, { status: 400 });
    }
    if(!Organization){
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const DEFAULT_LANES = ["applied", "screening", "shortlisted", "processing", "accepted", "rejected"];
    if (!organization.lanes || organization.lanes.length === 0) {
      organization.lanes = DEFAULT_LANES;
      await organization.save();
    }

    if(!User){
      return NextResponse.json({ error: "User Model Not Found" }, { status: 400 });
    }
    const updatedAdmin = await User.updateOne(
      { _id: adminId }, 
      { $set: { organizationId: organizationId } }
    );

    if (updatedAdmin.matchedCount === 0) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }
    
    if (updatedAdmin.modifiedCount === 0) {
      return NextResponse.json({ error: 'No changes made' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Admin updated successfully', 
      user: updatedAdmin,
      lanes: organization.lanes
    }, { status: 200 });

  } catch (error: unknown) {
    return NextResponse.json({ error: 'Failed to update admin' + (error instanceof Error ? error.message : "Unknown error") }, { status: 400 });
  }
}
