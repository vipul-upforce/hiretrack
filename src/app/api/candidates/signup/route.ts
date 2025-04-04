import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect, { CandidateAccount, Organization } from '@/lib/mongodb'; 
// import { Lane } from '@/lib/mongodb';
import { signToken } from '@/lib/jwt';
// import mongoose from 'mongoose';

// const DEFAULT_LANES = ["applied", "screening", "shortlisted", "processing", "accepted", "rejected"];

export async function POST(req: Request) {
  try {
    await dbConnect();
    var { email, password, name, orgName } = await req.json();

    // if (!(organizationId instanceof mongoose.Types.ObjectId)) {
    //   organizationId = new mongoose.Types.ObjectId(organizationId);
    // }
    if (!CandidateAccount || !Organization) {
      return NextResponse.json({ error: "Database not connected" }, { status: 400 });
    }

    const existingUser = await CandidateAccount.findOne({ email });
    const organizationInfo = await Organization.findOne({ name:orgName },{
      adminId: 0,
      lanes:0
    });
    if (!organizationInfo) {
      return NextResponse.json(
        { error: `Organization "${orgName}" not found` },
        { status: 404 }
      );
    }
    const organizationId = organizationInfo?._id;
    
    if (existingUser) {
      if (existingUser.isDeleted) {
        return NextResponse.json(
          { error: 'Candidate already exists, but is deactivated.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Candidate already exists in this organization' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await CandidateAccount.create({
      email,
      password: hashedPassword,
      name,
      // role,
      organizationId,
      organizationInfo
    });

    // // Create default lanes for the user
    // await Lane.create({
    //   userId: user._id,
    //   lanes: DEFAULT_LANES
    // });

    // Generate token
    const token = signToken({
      id: user._id,
      email: user.email,
    //   role: user.role,
    });

    const response = NextResponse.json({
      message: 'Candidate created successfully',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: "candidate",
        organizationInfo: organizationInfo
      }
    }, { status: 201 });

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 1 day
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 