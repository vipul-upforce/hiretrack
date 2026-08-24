import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  Job,
  User,
  History,
} from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Candidate collection indexes
    if (Candidate) {
      await Candidate.collection.createIndex({ organizationId: 1, status: 1 });
      await Candidate.collection.createIndex({ 'tracking.createdAt': -1 });
      await Candidate.collection.createIndex({ 'assignment.interviewerId': 1 });
      await Candidate.collection.createIndex({
        organizationId: 1,
        'tracking.createdAt': -1,
      });
      await Candidate.collection.createIndex({ 'scores.overall': 1 });
      await Candidate.collection.createIndex({ location: 1 });
      logger.info('✓ Candidate indexes created');
    }

    // Job collection indexes
    if (Job) {
      await Job.collection.createIndex({ organizationId: 1, status: 1 });
      await Job.collection.createIndex({ organizationId: 1, createdAt: -1 });
      logger.info('✓ Job indexes created');
    }

    // User collection indexes
    if (User) {
      await User.collection.createIndex({ organizationId: 1, role: 1 });
      await User.collection.createIndex({ organizationId: 1, updatedAt: -1 });
      logger.info('✓ User indexes created');
    }

    // History collection indexes
    if (History) {
      await History.collection.createIndex({
        candidateId: 1,
        'history.dateTime': -1,
      });
      logger.info('✓ History indexes created');
    }

    logger.info('All analytics indexes created successfully!');

    return NextResponse.json({
      success: true,
      message: 'Analytics database indexes created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      { error, url: request.url },
      'Error creating analytics indexes:',
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create analytics indexes',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
