import { NextResponse } from 'next/server';
import connectToDatabase, { Job } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';

export async function GET() {
  try {
    await connectToDatabase();
    if (!Job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const jobs = await Job.find({
      assignment: { $exists: true },
    })
      .populate('assignment.interviewerId', 'name email')
      .select('title company assignment')
      .lean(); // Use lean() for better performance

    return NextResponse.json(jobs);
  } catch (error: unknown) {
    logger.error({ error }, 'Error fetching job assignments');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
