
import { NextResponse } from 'next/server';
import { Lane } from '@/lib/mongodb';
import connectToDatabase from '@/lib/mongodb';

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const { lanes } = await request.json();
    if (!Lane) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    // Update each lane's order in the database
    await Promise.all(
      lanes.map(async (lane: { _id: string; order: number }) => {
        await Lane!.findByIdAndUpdate(lane._id, {
          $set: { order: lane.order }
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 

