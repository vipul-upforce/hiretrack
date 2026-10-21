import { NextRequest, NextResponse } from 'next/server';
import { handleStepCompleted } from './stepCompletedHandler';
import { handleInterviewAssignment } from './interviewAssignmentHandler';
import { handleQueueStatus } from './queueStatusHandler';

/**
 * PUT endpoint: Send step completed email
 */
export async function PUT(req: NextRequest) {
  try {
    return await handleStepCompleted(req);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown Error Occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint: Schedule or send interview assignment email
 */
export async function POST(req: NextRequest) {
  try {
    return await handleInterviewAssignment(req);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown Error Occurred',
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint: Get email queue status (debug only)
 */
export async function GET(req: NextRequest) {
  try {
    return await handleQueueStatus(req);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown Error Occurred',
      },
      { status: 500 },
    );
  }
}
