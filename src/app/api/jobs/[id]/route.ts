import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import { Job } from '@/lib/mongodb';
import { Candidate } from '@/lib/mongodb';
import { handleFileAttachments, handleCustomFieldFiles } from '@/lib/fileUtils';


export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const job = await Job.findById(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error : unknown)   {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let fileStorage='local';
  let organizationId;
  try {
    await connectToDatabase();
    const data = await request.json();
    const { id } = await params;
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const userData = JSON.parse(userCookie);
        // console.log("$$$$$$$$$$$$JOBN ",userData)
        fileStorage = userData.fileStorage || 'local';
        organizationId = userData.organizationId || '';
      }
    } catch (error) {
      console.error("Error parsing user cookie:", error);
    }
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get existing job to compare attachments
    // Handle both attachments and custom field files
    if (data.attachments) {
      data.attachments = await handleFileAttachments(
        data.attachments,
        fileStorage,
        organizationId,
        request
      );
    }
    
    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId,
        request
      );
      data.customFields = cs;
    }

    const updatedJob = await Job.findByIdAndUpdate(id, data, { new: true });
    return NextResponse.json(updatedJob);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Job || !Candidate) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    // First, find the job to ensure it exists
    const job = await Job.findById(id);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Delete the job
    await Job.findByIdAndDelete(id);

    // Assuming you have Candidate and Assignment models
    // Delete associated candidates and assignments
    await Candidate.deleteMany({ jobId: id }); // Adjust the field name as necessary

    return NextResponse.json({ message: 'Job and associated candidates and assignments deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
} 