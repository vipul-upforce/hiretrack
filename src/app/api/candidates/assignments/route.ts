// @ts-nocheck

import { NextResponse, NextRequest } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Candidate } from '@/lib/mongodb';
import { User } from '@/lib/mongodb';
import { Job } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const user = req.cookies.get('user');
    const userData = JSON.parse(user?.value || '{}');
    const query = {
      'assignment.interviewerId': userData?.role === 'interviewer' ? userData?.id : { $exists: true }
    }
    if(!Candidate || !User || !Job){
      return NextResponse.json({ error: "Candidate, User, or Job not found" }, { status: 400 });
    }
    const projection = userData?.role === 'interviewer' ? { 
      currentCTC: 0,
      expectedCTC: 0,
      customFields:0
    } : {};
    const candidates = await Candidate.find(query, projection).populate([
      {
        path: 'assignment.interviewerId',
        model: User,
        select: '_id name email'
      },
      {
        path: 'remarks.userId',
        model: User,
        select: '_id name email'
      },
      {
        path: 'jobId',
        model: Job,
        select: '_id title skills description organizationId'
      }
    ]);
    const filteredCandidates = candidates.filter(
      (candidate) => candidate.jobId?.organizationId?.toString() === userData.organizationId && candidate.status !== 'rejected'
    );
    return NextResponse.json(filteredCandidates);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 