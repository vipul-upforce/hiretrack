import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { auth } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;
    if (!User) {
      return NextResponse.json(
        { error: "User Model not found" },
        { status: 400 }
      );
    }

    const isUserExisted = await User.findByIdAndUpdate(id);

    const isAdmin = isUserExisted?.role === "admin";
    if (isAdmin) {
      const adminCount = await User.countDocuments({
        role: "admin",
        organizationId:session?.user?.organizationId,
        isDeleted: false,
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last remaining admin" },
          { status: 400 }
        );
      }
    }
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: false }
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);

    if (!User) {
      return NextResponse.json(
        { error: "UserModel not found" },
        { status: 400 }
      );
    }

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;
    const userData = await req.json();

    let user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isUserExisted = await User.findByIdAndUpdate(id);

    const isAdmin = isUserExisted?.role === "admin";
    if (isAdmin && (userData?.role !== "admin" || userData?.isDeleted)) {
      const adminCount = await User.countDocuments({
        role: "admin",
        isDeleted: false,
        organizationId:session?.user?.organizationId
      });
      if (adminCount <= 1) {
        user = await User.findByIdAndUpdate(id, {
          name: userData.name,
          role: "admin",
          isDeleted: false,
          email: userData?.admin,
        });
        return NextResponse.json(
          { error: "Cannot remove last admin" },
          { status: 400 }
        );
      }
    }

    user = await User.findByIdAndUpdate(id, userData);
    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
