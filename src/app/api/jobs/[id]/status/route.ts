import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization, Job } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { logger } from '@/lib/logger/logger.server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { status, openJobCardsOrder } = await request.json();
    const { id } = await params;
    if (!Job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { organizationId } = user;

    const [updatedJob] = await Promise.all([
      Job.findByIdAndUpdate(
        id,
        {
          status,
          updatedAt: new Date(),
        },
        { new: true },
      ),
      Organization?.findByIdAndUpdate(organizationId, {
        $set: {
          openJobCards: openJobCardsOrder,
        },
      }),
    ]);

    if (!updatedJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(updatedJob);
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error updating job status');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
