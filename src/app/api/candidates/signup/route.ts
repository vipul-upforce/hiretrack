import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase, { CandidateAccount, Organization, User } from '@/lib/mongodb';
import {
  validateInput, VALIDATION_PATTERNS, MAX_LENGTHS, sanitizeString,
} from '@/lib/inputValidation';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const requestData = await req.json();

    // SECURITY FIX: Validate candidate signup input
    const validation = validateInput(requestData, {
      email: {
        required: true,
        type: 'email',
        maxLength: MAX_LENGTHS.email,
      },
      password: {
        required: true,
        type: 'string',
        minLength: 8,
        maxLength: 128,
      },
      name: {
        required: true,
        type: 'string',
        maxLength: MAX_LENGTHS.name,
        pattern: VALIDATION_PATTERNS.safeString,
        sanitize: true,
      },
      orgName: {
        type: 'string',
        maxLength: MAX_LENGTHS.name,
        pattern: VALIDATION_PATTERNS.safeString,
        sanitize: true,
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid candidate registration data',
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Sanitize inputs
    const { email, password, orgName } = requestData;
    const name = sanitizeString(requestData.name);
    const sanitizedOrgName = orgName ? sanitizeString(orgName) : undefined;
    if (!CandidateAccount || !Organization || !User) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    let organizationInfo;
    let organizationId;

    if (sanitizedOrgName) {
      // If orgName is provided, find the organization by name
      organizationInfo = await Organization.findOne(
        { name: sanitizedOrgName },
        {
          adminId: 0,
          lanes: 0,
        },
      ).lean();
      if (!organizationInfo) {
        return NextResponse.json(
          { error: `Organization "${sanitizedOrgName}" not found` },
          { status: 404 },
        );
      }
      organizationId = organizationInfo._id;
    } else {
      // If orgName is not provided, find the first organization
      organizationInfo = await Organization.findOne(
        {},
        {
          adminId: 0,
          lanes: 0,
        },
      ).lean();
      if (!organizationInfo) {
        return NextResponse.json(
          { error: 'No organizations found in the database' },
          { status: 404 },
        );
      }
      organizationId = organizationInfo._id;
    }

    const existingCandidate = await CandidateAccount.findOne({ email });
    if (existingCandidate) {
      return NextResponse.json(
        { error: 'Candidate already exists in an organization' },
        { status: 400 },
      );
    }
    const existingUser = await User.findOne({ email, organizationId }).lean();

    if (existingUser) {
      if (existingUser.isDeleted) {
        return NextResponse.json(
          {
            error:
              'Candidate already exists in this organization, but is deactivated.',
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: 'Candidate alredy exists in this organization as a Member.' },
        { status: 400 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await CandidateAccount.create({
      email,
      password: hashedPassword,
      name,
      organizationId,
      organizationInfo,
    });

    const response = NextResponse.json(
      {
        message: 'Candidate created successfully',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: 'candidate',
          organizationInfo,
        },
      },
      { status: 201 },
    );

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
