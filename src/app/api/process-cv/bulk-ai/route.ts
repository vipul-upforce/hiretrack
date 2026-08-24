import {
  getCvParseRoutingForRequest,
  runBulkCvExtractFromRequest,
} from '@/lib/cv-processing/server/bulk-extract-from-request';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Which bulk CV extractors have a usable key (same rules as POST).
 * Lets the UI list only configured providers without exposing keys.
 */
export async function GET(req: NextRequest) {
  const result = await getCvParseRoutingForRequest(req);
  if (!result.ok) {
    return NextResponse.json(
      { status: 'error', message: result.message },
      { status: result.status },
    );
  }
  return NextResponse.json(result.routing);
}

export async function POST(req: NextRequest) {
  const result = await runBulkCvExtractFromRequest(req, {});

  if (!result.ok) {
    console.error('API /process-cv/bulk-ai Error:', result.message);
    return NextResponse.json(
      { status: 'error', message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json({
    status: 'success',
    data: result.data,
    ...(result.usedBulkCvProvider
      ? { usedBulkCvProvider: result.usedBulkCvProvider }
      : {}),
  });
}
