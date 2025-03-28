import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Candidate } from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await connectToDatabase();
    const { jobId } = await params;
    if (!Candidate) {
      return NextResponse.json({ error: "Candidate Model not found" }, { status: 404 });
    }
    const candidates = await Candidate.find({ jobId: jobId })
      .sort({ 'tracking.createdAt': -1 });
    
    return NextResponse.json(candidates);
  } catch (error : unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 