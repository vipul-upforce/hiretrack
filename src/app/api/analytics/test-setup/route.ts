import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Candidate } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    if (!Candidate) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Test basic candidate query
    const testQuery = await Candidate.collection.find({}).limit(5).toArray();

    return NextResponse.json({
      success: true,
      message: 'Analytics setup test successful',
      candidateCount: testQuery.length,
      sampleData: testQuery.map((c) => ({
        id: c._id,
        status: c.status,
        organizationId: c.organizationId,
        createdAt: c.tracking?.createdAt,
      })),
    });
  } catch (error) {
    console.error('Analytics test setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Analytics test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
