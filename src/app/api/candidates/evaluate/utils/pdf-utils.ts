import logger from '@/lib/logger';
import { IEvaluationConfig } from '@/lib/models/settings';
import { PDFDocument } from 'pdf-lib';

/**
 * Validates PDF page count against evaluation config.
 * Does not throw when page count exceeds limit—evaluation proceeds with limited pages.
 */
export async function validatePdfPageCount(
  base64Resume: string,
  evaluationConfig: IEvaluationConfig,
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
      logger.info(
        {
          pageCount,
          maxPdfPages: evaluationConfig.maxPdfPages,
        },
        'Resume exceeds page limit; evaluating first N pages only',
      );
      // Do not throw—evaluation proceeds with truncated PDF via getResumeForEvaluation
    }
  } catch (error) {
    logger.error({ error }, 'PDF page count check failed');
    // Don't throw for PDF errors, just log them
  }
}

/**
 * Returns resume content for evaluation, truncated to maxPdfPages when limit is set.
 * When PDF has more pages than limit, returns base64 of first N pages only.
 *
 * @param base64Resume - Base64 encoded PDF
 * @param maxPdfPages - Max pages to evaluate (0 = no limit)
 * @returns Base64 of full or truncated PDF
 */
export async function getResumeForEvaluation(
  base64Resume: string,
  maxPdfPages: number,
): Promise<string> {
  if (maxPdfPages <= 0) {
    return base64Resume;
  }

  try {
    const pdfBuffer = Buffer.from(base64Resume, 'base64');
    const sourcePdf = await PDFDocument.load(pdfBuffer);
    const pageCount = sourcePdf.getPageCount();

    if (pageCount <= maxPdfPages) {
      return base64Resume;
    }

    const newPdf = await PDFDocument.create();
    const pageIndices = Array.from({ length: maxPdfPages }, (_, i) => i);
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const truncatedBytes = await newPdf.save();
    return Buffer.from(truncatedBytes).toString('base64');
  } catch (error) {
    logger.error(
      { error },
      'Failed to truncate PDF for evaluation; using full resume',
    );
    return base64Resume;
  }
}
