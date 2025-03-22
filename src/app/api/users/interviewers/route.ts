import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import {User} from '@/lib/mongodb';

export async function GET(req:NextRequest) {
  try {
    await connectToDatabase();
    const user = req.cookies.get('user');
    const userData = JSON.parse(user?.value || '{}');
    const organizationId = userData.organizationId;
    if(!User){
      return NextResponse.json({ error: "User Model not found" }, { status: 400 });
    }
    const interviewers = await User.find({ organizationId })
      .select('_id name email organizationId');
    
    return NextResponse.json(interviewers);
  } catch (error : unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 