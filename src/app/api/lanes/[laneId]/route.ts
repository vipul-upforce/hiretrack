import { NextResponse } from 'next/server';
import connectToDatabase, { Candidate, History, Organization } from '@/lib/mongodb';
import {
  broadcastLaneUpdate,
  broadcastMultipleCandidateUpdate,
} from '@/lib/broadcast/broadCastCandidate';
import { IHistory } from '@/lib/models/history';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> },
) {
  try {
    await connectToDatabase();
    const { organizationId } = await request.json();
    if (!Organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const org = await Organization.findOne({ _id: organizationId });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization Info not found' },
        { status: 404 },
      );
    }
    const { laneId } = await params;
    // Use defaultLanes if available, fallback to lanes for backward compatibility
    const currentLanes = org.defaultLanes || org.lanes || [];

    if (currentLanes.length == 1) {
      return NextResponse.json(
        { error: "Can't delete all lanes" },
        { status: 400 },
      );
    }

    const updatedLanes = currentLanes.filter((l: string) => l !== laneId);

    // Update the appropriate field
    if (org.defaultLanes) {
      org.defaultLanes = updatedLanes;
    } else {
      org.lanes = updatedLanes;
    }

    await org.save();
    const newLaneId = updatedLanes[0];

    const updated = await Candidate?.updateMany(
      { organizationId, status: laneId },
      {
        $set: {
          status: newLaneId,
        },
      },
    );
    broadcastLaneUpdate(organizationId, org.lanes);
    if (!Candidate) {
      throw new Error('Database not connected');
    }
    const updatedCandidates = await Candidate.find({
      organizationId,
      status: newLaneId,
    }).populate([
      {
        path: 'assignment.interviewerId',
        select: '_id name email',
      },
      {
        path: 'remarks.userId',
        select: 'name email',
      },
      {
        path: 'jobId',
        select: '_id description title',
      },
    ]);
    if (!History) {
      throw new Error('Database not connected');
    }
    const candidateIds = updatedCandidates.map((c) => c._id);

    const candidateHistories: IHistory[] = await History.find({
      candidateId: {
        $in: candidateIds,
      },
    }).populate([
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ]);
    const candidatesWithHistory = updatedCandidates.map((candidate) => {
      const history = candidateHistories.filter(
        (h) => h.candidateId.toString() === candidate._id.toString(),
      );
      return {
        ...candidate.toObject(),
        history: history[0]?.history || [],
      };
    });
    // .populate([
    //   { path: "history.assignmentBy", select: "_id name email" },
    //   { path: "history.currentInterviewer", select: "_id name email" },
    //   { path: "history.previousInterviewer", select: "_id name email" },
    //   { path: "history.note.userId", select: "_id name email" },
    // ]);
    broadcastMultipleCandidateUpdate(candidatesWithHistory);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error }, { status: 500 });
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> },
) {
  try {
    await connectToDatabase();
    const { organizationId, newLaneId } = await request.json();
    if (!organizationId || !newLaneId) {
      return NextResponse.json(
        { error: 'Missing organizationId or newLaneId' },
        { status: 400 },
      );
    }
    if (!Organization || !Candidate) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 },
      );
    }

    const { laneId } = await params;
    if (!laneId) {
      return NextResponse.json(
        { error: 'Missing laneId in URL parameters' },
        { status: 400 },
      );
    }

    const org = await Organization.findOne({ _id: organizationId });
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Use defaultLanes if available, fallback to lanes for backward compatibility
    const currentLanes = org.defaultLanes || org.lanes || [];

    if (!currentLanes.includes(laneId)) {
      return NextResponse.json(
        { error: `Lane ${laneId} not found in organization` },
        { status: 404 },
      );
    }

    if (laneId === newLaneId) {
      return NextResponse.json(
        { error: 'New lane ID must be different from the current lane ID' },
        { status: 400 },
      );
    }

    if (
      currentLanes
        .map((lane) => lane.toLowerCase())
        .includes(newLaneId.toLowerCase())
    ) {
      return NextResponse.json(
        { error: `Lane ${newLaneId} already exists in the organization` },
        { status: 400 },
      );
    }

    if (currentLanes.length === 1) {
      return NextResponse.json(
        { error: 'Cannot update the only lane in the organization' },
        { status: 400 },
      );
    }

    const laneIndex = currentLanes.findIndex((lane: string) => lane === laneId);
    if (laneIndex === -1) {
      return NextResponse.json(
        { error: `Lane ${laneId} not found` },
        { status: 404 },
      );
    }

    // Update the lanes in the appropriate field
    const updatedLanes = [...currentLanes];
    updatedLanes[laneIndex] = newLaneId;

    if (org.defaultLanes) {
      org.defaultLanes = updatedLanes;
    } else {
      org.lanes = updatedLanes;
    }

    await org.save();

    await Candidate.updateMany(
      { organizationId, status: laneId },
      { $set: { status: newLaneId } },
    );
    broadcastLaneUpdate(organizationId, org.lanes);

    const updatedCandidates = await Candidate.find({
      organizationId,
      status: newLaneId,
    }).populate([
      {
        path: 'assignment.interviewerId',
        select: '_id name email',
      },
      {
        path: 'remarks.userId',
        select: 'name email',
      },
      {
        path: 'jobId',
        select: '_id description title',
      },
    ]);
    if (!History) {
      throw new Error('Database not connected');
    }
    const candidateIds = updatedCandidates.map((c) => c._id);

    const candidateHistories: IHistory[] = await History.find({
      candidateId: {
        $in: candidateIds,
      },
    }).populate([
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ]);
    const candidatesWithHistory = updatedCandidates.map((candidate) => {
      const history = candidateHistories.filter(
        (h) => h.candidateId.toString() === candidate._id.toString(),
      );
      return {
        ...candidate.toObject(), // Convert Mongoose document to plain object
        history: history[0]?.history || [],
      };
    });
    // .populate([
    //   { path: "history.assignmentBy", select: "_id name email" },
    //   { path: "history.currentInterviewer", select: "_id name email" },
    //   { path: "history.previousInterviewer", select: "_id name email" },
    //   { path: "history.note.userId", select: "_id name email" },
    // ]);
    broadcastMultipleCandidateUpdate(candidatesWithHistory);

    return NextResponse.json({
      message: 'Lane updated successfully',
      updatedLanes: org.lanes,
      updatedCandidates,
    });
  } catch (err) {
    console.error('Error updating lane:', err);
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
