import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/mongodb";
import dbConnect from "@/lib/mongodb";
import { signToken } from "@/app/actions/auth";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const user = await User?.findOne({
      email,
      otp,
      otpExpires: { $gt: new Date() },
    });

    if (user) {
      await User?.updateOne(
        { _id: user._id },
        { $unset: { otp: 1, otpExpires: 1 } }
      );
      const token = await signToken(user);
      return NextResponse.json({ message: "OTP verified successfully", token });
    } else {
      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
