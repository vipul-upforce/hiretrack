import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { CandidateAccount, User } from '@/lib/mongodb';
import {
  getAuthenticatedUser,
  signAccessToken,
  type AuthenticatedUser,
} from '@/app/actions/auth';
import { updateAccessToken } from '@/lib/authCookies';
import { UserDocument } from '@/lib/models/user';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [userData, { id }] = await Promise.all([
      getAuthenticatedUser(req, 'admin'),
      params,
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!User) {
      return NextResponse.json(
        { error: 'User Model not found' },
        { status: 400 },
      );
    }
    if (userData.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete yourself' },
        { status: 400 },
      );
    }

    const isUserExisted = await User.findById(id)
      .select('role organizationId _id')
      .lean()
      .exec();

    const isAdmin = isUserExisted?.role === 'admin';
    if (isAdmin) {
      const adminCount = await User.countDocuments({
        role: 'admin',
        organizationId: userData.organizationId,
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last remaining admin' },
          { status: 400 },
        );
      }
    }
    const user = await User.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: false },
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

const refreshAndReAssignToken = async (
  data: unknown,
  orgId: string,
  request: NextRequest,
) => {
  const newToken = await signAccessToken(data, orgId);

  const response = NextResponse.json({ message: 'User updated successfully' });

  // Use centralized helper that preserves existing cookies
  updateAccessToken(response, request, newToken);

  return response;
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, userData, session] = await Promise.all([
      await params,
      await req.json(),
      await getAuthenticatedUser(req, 'admin'),
      await connectToDatabase(),
    ]);

    if (!User) {
      return NextResponse.json(
        { error: 'UserModel not found' },
        { status: 400 },
      );
    }

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent logged-in user from deactivating themselves
    if (session.id === id && userData.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot deactivate yourself' },
        { status: 400 },
      );
    }

    // Duplicate email check
    if (userData.email && userData.email !== user.email) {
      const existingUser = await User.findOne({
        email: userData.email,
        _id: { $ne: id }, // Exclude the current user
        organizationId: session?.organizationId,
      });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already exists for another user' },
          { status: 400 },
        );
      }

      const existingCandidate = await CandidateAccount?.findOne({
        email: userData.email,
        organizationId: session?.organizationId,
      });

      if(existingCandidate){
        return NextResponse.json(
          { error: 'Email already exists for candidate.' },
          { status: 400 },
        );
      }
    }

    const isAdmin = user.role === 'admin';
    if (isAdmin && (userData?.role !== 'admin' || userData?.isDeleted)) {
      const adminCount = await User.countDocuments({
        role: 'admin',
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
          role: 'admin',
          isDeleted: false,
          email: userData?.admin,
        });

        return NextResponse.json(
          { error: 'Cannot remove last admin' },
          { status: 400 },
        );
      }
    }

    const sanitizedUserData = { ...userData };
    delete sanitizedUserData.tokenVersion;

    user.set(sanitizedUserData);
    await (user as unknown as UserDocument).incrementTokenVersion();

    if (session && session.id === id) {
      const updatedData: AuthenticatedUser = {
        ...session,
        name: user.name,
        email: user.email,
        role: user.role,
        tokenVersion: user.tokenVersion,
      };
      return refreshAndReAssignToken(updatedData, session.organizationId, req);
    }

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
