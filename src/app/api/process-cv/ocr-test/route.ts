import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import {
  debugExtractPdfText,
  probeCvOcrTesseractPath,
} from '@/lib/cv-upload/pdf-text-extraction';

const MAX_BYTES = 12 * 1024 * 1024;

/**
 * POST multipart form field `file` (PDF) — returns pdf.js vs OCR diagnostics.
 * Requires an authenticated session (same cookie contract as `/api/process-cv`).
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart form data' },
      { status: 400 },
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: 'Missing file field (PDF)' },
      { status: 400 },
    );
  }

  if (file.type && file.type !== 'application/pdf') {
    return NextResponse.json(
      { error: 'Only application/pdf is supported' },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES} bytes)` },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');

  try {
    const diagnostics = await debugExtractPdfText(base64);
    const tesseractProbe = await probeCvOcrTesseractPath();
    return NextResponse.json({
      filename: file.name,
      sizeBytes: buffer.length,
      ...diagnostics,
      config: {
        hasRemoteOcrUrl: Boolean(process.env.CV_OCR_SERVICE_URL?.trim()),
        localOcrDisabled: process.env.CV_OCR_DISABLE_LOCAL === 'true',
        tesseractCmdEnv: process.env.TESSERACT_CMD?.trim() ?? null,
        tesseractResolvedPath: tesseractProbe.resolvedPath,
        tesseractCandidatesTried: tesseractProbe.candidatesTried,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'PDF processing failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
