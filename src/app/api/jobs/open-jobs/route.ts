import connectToDatabase, { Job, Organization } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';
import {
  validateQueryParams,
  VALIDATION_PATTERNS,
  MAX_LENGTHS,
  sanitizeString,
} from '@/lib/inputValidation';
import { apiRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

interface CustomField {
  label: string;
  private?: boolean;
}

interface JobPositionCustomFieldConfig {
  formName?: string;
  fields?: CustomField[];
}

const handleGetOpenJobs = async (request: NextRequest) => {
  try {
    const validation = validateQueryParams(request.nextUrl.searchParams, {
      o: {
        type: 'string',
        maxLength: MAX_LENGTHS.name,
        pattern: VALIDATION_PATTERNS.safeString,
      },
      title: {
        type: 'string',
        maxLength: MAX_LENGTHS.title,
        sanitize: true,
      },
      limit: {
        type: 'number',
        min: 1,
        max: 50, // Reasonable limit for public job listings
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.errors },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const orgName = sanitizeString(
      request.nextUrl.searchParams?.get('o') || '',
    );
    const title = sanitizeString(
      request.nextUrl.searchParams?.get('title') || '',
    );

    if (!Organization && !Job) {
      return NextResponse.json(
        { error: 'DB Model not Found' },
        { status: 404 },
      );
    }

    let organizationId;

    if (orgName !== '') {
      const organization = await Organization!.findOne({ name: orgName });
      organizationId = organization?._id;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 },
        );
      }
    } else {
      const organization = await Organization!.findOne().sort({ _id: 1 });
      organizationId = organization?._id;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'No organizations found' },
          { status: 404 },
        );
      }
    }

    const organization = await Organization?.findById(organizationId).lean();

    const jobs = await Job!
      .find(
        {
          organizationId,
          status: 'open',
          isPublished: true,
          ...(title && {
            title: {
              $regex: title,
              $options: 'i',
            },
          }),
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
        {
          attachments: 0,
          tracking: 0,
          organizationId: 0,
          links: 0,
          status: 0,
        },
      )
      .lean();

    const openJobCardsOrder = organization?.openJobCards || [];
    const orderedJobIds = new Set(openJobCardsOrder.map((id) => id?.toString()));
    const jobsMap = new Map(jobs.map((job) => [job._id.toString(), job]));

    const orderedJobs = openJobCardsOrder
      .map((id) => jobsMap.get(id?.toString()))
      .filter((job): job is NonNullable<typeof job> => !!job);

    const remainingJobs = jobs.filter(
      (job) => !orderedJobIds.has(job._id.toString()),
    );

    const jobsInDisplayOrder = [...orderedJobs, ...remainingJobs];
    const customFieldsMap = (organization?.customFields || {}) as Record<
      string,
      JobPositionCustomFieldConfig
    >;

    const jobPositionFields =
      Object.values(customFieldsMap).find(
        (field) => field.formName === 'Job Position',
      )?.fields || [];

    const publicFieldLabels = jobPositionFields
      ?.filter((field: CustomField) => !field.private)
      ?.map((data: CustomField) => data.label);

    const filteredJobs = jobsInDisplayOrder?.map((job) => ({
      ...job,
      salary: job?.salary && !job?.salary?.isPrivate ? job?.salary : undefined,
      customFields: Object.fromEntries(
        job?.customFields
          ? Object.entries(job.customFields as Record<string, unknown>).filter(
              ([key, value]) =>
                publicFieldLabels.includes(key) &&
                value !== null &&
                value !== '' &&
                !(Array.isArray(value) && value.length === 0),
            )
          : [],
      ),
    }));

    return NextResponse.json(filteredJobs);
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error fetching open jobs');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500 },
    );
  }
};

export async function GET(request: NextRequest) {
  return apiRateLimiter(request as NextRequest, handleGetOpenJobs);
}
