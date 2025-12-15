import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';

// Handle POST request
export async function POST(req: NextRequest) {
  try {
    const [user, data] = await Promise.all([
      getAuthenticatedUser(req),
      req.json(),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Not Authorized' }, { status: 401 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    const { orgId, customFields } = data;

    if (!Organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 400 },
      );
    }
    const org = await Organization.findById(orgId);
    if (org) {
      org.customFields = customFields;
      await org.save();
    }
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }
    return NextResponse.json(
      {
        message: 'Meta Fields Updated Successfully',
        organization: org,
        _id: org.id,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Unknown error occurred' },
      { status: 400 },
    );
  }
}
