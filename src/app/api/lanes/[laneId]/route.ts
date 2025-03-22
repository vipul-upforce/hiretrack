import { NextResponse } from 'next/server';
import connectToDatabase, { Candidate } from '@/lib/mongodb';
import { Organization } from '@/lib/mongodb';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> }
) {
  try {
    await connectToDatabase();
    const { organizationId } = await request.json();
    if (!Organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const org = await Organization.findOne
      ({ _id: organizationId });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization Info not found' },
        { status: 404 }
      );
    }
    const { laneId } = await params;
    if(org.lanes.length==1){
      return NextResponse.json(
        { error: "Can't delete all lanes" },
        { status: 400 }
      );
    }
    org.lanes = org.lanes.filter((l : string) => {

      return l !== laneId
    });
    await org.save();
    const newLaneId = org.lanes[0];
    
    const updated=await Candidate?.updateMany(
      {organizationId, status:laneId},{
        $set:{
          status:newLaneId
        }
      }
    );

    return NextResponse.json({data:updated});
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: error },
      { status: 500 }
    );
  }
}