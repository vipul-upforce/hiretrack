import { NextRequest, NextResponse } from "next/server";
import connectToDatabase,{ User } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { getAuthenticatedUser, signToken } from "@/app/actions/auth";
import { setSecureAuthTokens } from "@/lib/secureTokens";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(req);

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "You cannot delete yourself" },
        { status: 401 }
      );
    }
    if (!User) {
      return NextResponse.json(
        { error: "User Model not found" },
        { status: 400 }
      );
    }

    const isUserExisted = await User.findByIdAndUpdate(id).lean().exec();

    const isAdmin = isUserExisted?.role === "admin";
    if (isAdmin) {
      const adminCount = await User.countDocuments({
        role: "admin",
        organizationId: session?.user?.organizationId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
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
    const [{ id }, userData, session] = await Promise.all([
      await params,
      await req.json(),
      await getAuthenticatedUser(req, "admin"),
      await connectToDatabase(),
    ]);

    if (!User) {
      return NextResponse.json(
        { error: "UserModel not found" },
        { status: 400 }
      );
    }

    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(id).lean().exec();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent logged-in user from deactivating themselves
    if (session.id === id && userData.isDeleted) {
      return NextResponse.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    // Duplicate email check
    if (userData.email && userData.email !== user.email) {
      const existingUser = await User.findOne({
        email: userData.email,
        _id: { $ne: id }, // Exclude the current user
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists for another user" },
          { status: 400 }
        );
      }
    }

    const isAdmin = user.role === "admin";
    if (isAdmin && (userData?.role !== "admin" || userData?.isDeleted)) {
      const adminCount = await User.countDocuments({
        role: "admin",
        // isDeleted: false ,
        $or: [
          { isDeleted: { $exists: false } },
          { $and: [{ isDeleted: { $exists: true } }, { isDeleted: false }] },
        ],
        organizationId: session?.organizationId,
      });

      if (adminCount <= 1) {
        await User.findByIdAndUpdate(id, {
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

    await User.findByIdAndUpdate(id, userData);

    if (session?.email === userData?.email) {
      const updatedData = {
        ...session,
        name: userData?.name,
        email: userData?.email,
      };
      const newToken = await refreshAndReAssignToken(updatedData, session.organizationId);
      return newToken;
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

const refreshAndReAssignToken = async (data: unknown, orgId: string) => {
  const newToken = await signToken(data, orgId);

  const response = NextResponse.json({ message: "User updated successfully" });

  // SECURITY FIX: Use secure token system with improved security
  setSecureAuthTokens(response, newToken, {
    expires: 30, // 30 days
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  });

  return response;
};
