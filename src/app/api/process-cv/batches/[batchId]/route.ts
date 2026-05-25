import { NextRequest, NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectToDatabase, { cvBatch as CVBatch } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import logger from '@/lib/logger';
import { formatBatchItemParseLabel } from '@/lib/cv-processing/batch-item-parse-display';
import { batchItemParseFieldsFromContext } from '@/lib/cv-processing/batch-item-parse-fields';
import { loadOrgCvParseContext } from '@/lib/cv-processing/server/cv-parse-routing';

const JSON_NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
} as const;

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  await connectToDatabase();
  if (!CVBatch) {
    return NextResponse.json({ error: 'Database not connected' }, { status: 400 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'User not Authenticated' },
      { status: 401 },
    );
  }

  const { batchId } = await params;
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  if (!organizationId) {
    return NextResponse.json(
      { error: 'organizationId is required' },
      { status: 400 },
    );
  }

  if (!Types.ObjectId.isValid(organizationId) || !Types.ObjectId.isValid(batchId)) {
    return NextResponse.json(
      { error: 'organizationId and batchId must be valid ObjectIds' },
      { status: 400 },
    );
  }

  try {
    const batch = await CVBatch.findOne({
      _id: new Types.ObjectId(batchId),
      organizationId: new Types.ObjectId(organizationId),
    })
      .select(
        'organizationId totalFiles successCount failureCount status processingMode operationsSnapshot items pendingItems startedAt completedAt createdAt updatedAt historyAt',
      )
      .lean();

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    let enrichedBatch = batch;
    try {
      const cvParseContext = await loadOrgCvParseContext(organizationId);
      enrichedBatch = {
        ...batch,
        items: (batch.items ?? []).map((item) => {
          if (formatBatchItemParseLabel(item) || item.status !== 'failed') {
            return item;
          }
          const fields = batchItemParseFieldsFromContext(
            cvParseContext,
            item.filename,
            0,
          );
          return {
            ...item,
            cvParseMode: fields.cvParseMode,
            usedProvider: fields.usedProvider,
            parseProviderLabel: fields.parseProviderLabel,
          };
        }),
      };
    } catch (routingError) {
      logger.warn(
        {
          organizationId,
          batchId,
          error:
            routingError instanceof Error
              ? routingError.message
              : String(routingError),
        },
        'Could not enrich CV batch detail with parse provider labels',
      );
    }

    return NextResponse.json(
      { batch: enrichedBatch },
      {
        status: 200,
        headers: JSON_NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    logger.error(
      { error, batchId, url: request.url },
      'Error fetching CV batch detail',
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      },
      { status: 500 },
    );
  }
}
