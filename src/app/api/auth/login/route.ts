import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect, { Settings } from '@/lib/mongodb';
import { signToken } from '@/lib/jwt';
import { User, Organization } from '@/lib/mongodb';
export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();
    if(!User || !Organization || !Settings){
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 }
      );
    }
    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const orgInfo = await Organization.findById(user.organizationId);

    const fileStorage = await Settings.findOne({organizationId:user.organizationId},{_id:0}).select("fileStorage").lean();
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name
    });

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationInfo:orgInfo,
        fileStorage:fileStorage?.fileStorage?.storageType
      }
    });

    response.cookies.set('token', token, {
      httpOnly: false,
      // httpOnly: process.env.NODE_ENV === 'production',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 