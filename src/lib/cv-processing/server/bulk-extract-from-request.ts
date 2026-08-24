import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import type { IBulkCvAi } from '@/lib/types/bulk-cv-ai';
import connectToDatabase, { Settings } from '@/lib/mongodb';
import { decryptBulkCvAi } from '@/lib/encryption';
import { BULK_CV_PROVIDER_IDS } from '../config';
import type { BulkCvExtractorProvider } from '../pipelines/bulk-cv-resume';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';
import {
  buildBulkCvReadinessAndSlots,
  extractBulkCvResumeFromPdfFile,
  extractBulkCvResumeFromPdfFileWithProvider,
  readyBulkCvProviders,
  type BulkCvProviderReadiness,
} from './bulk-resume-extract';
import { getCvParseRoutingForOrganization } from './cv-parse-routing';
import type { CvParseRoutingSnapshot } from './cv-parse-routing';

export type { BulkCvProviderReadiness };

function isBulkExtractorProvider(v: string): v is BulkCvExtractorProvider {
  return (BULK_CV_PROVIDER_IDS as readonly string[]).includes(v);
}

export interface RunBulkCvExtractResult {
  ok: true;
  data: ProcessedResumeData;
  usedBulkCvProvider?: BulkCvExtractorProvider;
}

export interface RunBulkCvExtractError {
  ok: false;
  message: string;
  status: number;
}

export interface BulkCvRoutingResponse {
  status: 'ok';
  cvUploadPool: CvParseRoutingSnapshot['cvUploadPool'];
  cvParseMode: CvParseRoutingSnapshot['cvParseMode'];
  bulkCvProviderReadiness: BulkCvProviderReadiness;
  bulkReadyCount: number;
  premiumReady: boolean;
  premiumActiveProvider?: CvParseRoutingSnapshot['premiumActiveProvider'];
}

/**
 * Routing + readiness for CV upload UI and ops (no keys exposed).
 */
export async function getCvParseRoutingForRequest(
  req: NextRequest,
): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; routing: BulkCvRoutingResponse }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  try {
    const snapshot = await getCvParseRoutingForOrganization(
      user.organizationId,
    );
    return {
      ok: true,
      routing: {
        status: 'ok',
        cvUploadPool: snapshot.cvUploadPool,
        cvParseMode: snapshot.cvParseMode,
        bulkCvProviderReadiness: snapshot.bulkCvProviderReadiness,
        bulkReadyCount: snapshot.bulkReadyCount,
        premiumReady: snapshot.premiumReady,
        premiumActiveProvider: snapshot.premiumActiveProvider,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load CV parse routing';
    return { ok: false, status: 400, message };
  }
}

/**
 * @deprecated Prefer `getCvParseRoutingForRequest` — kept for existing clients.
 */
export async function getBulkCvProviderReadinessForRequest(
  req: NextRequest,
): Promise<
  | { ok: false; status: number; message: string }
  | { ok: true; bulkCvProviderReadiness: BulkCvProviderReadiness }
> {
  const result = await getCvParseRoutingForRequest(req);
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    bulkCvProviderReadiness: result.routing.bulkCvProviderReadiness,
  };
}

export async function runBulkCvExtractFromRequest(
  req: NextRequest,
  options: { forceProvider?: BulkCvExtractorProvider } = {},
): Promise<RunBulkCvExtractResult | RunBulkCvExtractError> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return { ok: false, message: 'Unauthorized', status: 401 };
  }

  await connectToDatabase();
  if (!Settings) {
    return { ok: false, message: 'Database not connected', status: 500 };
  }

  const row = await Settings.findOne({ organizationId: user.organizationId })
    .select('bulkCvAi')
    .lean()
    .exec();

  const bulkCvAi = decryptBulkCvAi(
    row?.bulkCvAi as IBulkCvAi | undefined,
    user.organizationId,
  );

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return { ok: false, message: 'Invalid form data', status: 400 };
  }

  const file = formData.get('file');
  const providerField = formData.get('provider');

  if (!(file instanceof File)) {
    return { ok: false, message: 'No PDF file provided.', status: 400 };
  }

  const { readiness } = buildBulkCvReadinessAndSlots(bulkCvAi);
  const ready = readyBulkCvProviders(readiness);
  if (ready.length === 0) {
    return {
      ok: false,
      message:
        'No bulk CV AI providers are configured. Add at least one API key under Settings → Bulk CV AI (Groq can use GROQ_API_KEY in development).',
      status: 400,
    };
  }

  const explicitFromForm =
    typeof providerField === 'string' &&
    providerField.trim() !== '' &&
    isBulkExtractorProvider(providerField.trim())
      ? (providerField.trim() as BulkCvExtractorProvider)
      : null;

  const pinned =
    typeof options.forceProvider === 'string'
      ? options.forceProvider
      : explicitFromForm;

  try {
    if (pinned) {
      if (!isBulkExtractorProvider(pinned)) {
        return {
          ok: false,
          message: `Invalid provider: ${String(pinned)}`,
          status: 400,
        };
      }
      const { data, usedBulkCvProvider } =
        await extractBulkCvResumeFromPdfFileWithProvider(
          file,
          bulkCvAi,
          pinned,
        );
      return { ok: true, data, usedBulkCvProvider };
    }

    const { data, usedBulkCvProvider } = await extractBulkCvResumeFromPdfFile(
      file,
      bulkCvAi,
    );
    return { ok: true, data, usedBulkCvProvider };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Extraction failed';
    return { ok: false, message, status: 500 };
  }
}
