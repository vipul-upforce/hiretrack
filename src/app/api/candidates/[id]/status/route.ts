import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Candidate } from '@/lib/mongodb';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { status } = await request.json();
    const { id } = await params;  
    if(!Candidate){
      return NextResponse.json({ error: "Candidate Model not found" }, { status: 400 });
    }
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        status,
        'tracking.updatedAt': new Date(),
      },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCandidate);
  } catch (error : unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 