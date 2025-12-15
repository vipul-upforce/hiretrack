import logger from '@/lib/logger';
import { IEvaluationConfig } from '@/lib/models/settings';

/**
 * Validates PDF page count against evaluation config
 */
export async function validatePdfPageCount(
  base64Resume: string,
  evaluationConfig: IEvaluationConfig
): Promise<void> {
  if (evaluationConfig.autoEvaluateAllCandidates) {
    return; // Skip validation if auto-evaluation is enabled
  }

  try {
    const pdfBuffer = Buffer.from(base64Resume, 'base64');
    const uint8Array = new Uint8Array(pdfBuffer);

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

    const pageCount = pdf.numPages;

    if (
      evaluationConfig.maxPdfPages > 0 &&
      pageCount > evaluationConfig.maxPdfPages
    ) {
      throw new Error(
        `Resume has ${pageCount} pages. Auto-evaluation is limited to ${evaluationConfig.maxPdfPages} pages. Please evaluate manually or update settings.`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('pages')) {
      throw error; // Re-throw page count validation errors
    }
    logger.error({ error }, 'PDF page count check failed');
    // Don't throw for other PDF errors, just log them
  }
}

