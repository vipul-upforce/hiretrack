/**
 * PDF → text for CV parsing: text layer first, then optional OCR fallbacks.
 *
 * Env (all optional):
 * - CV_PDF_MIN_TEXT_CHARS — min chars to skip OCR (default 80)
 * - CV_OCR_MAX_PAGES — max pages to rasterize for local OCR (default 5)
 * - CV_OCR_RENDER_SCALE — pdf.js render scale (default 2)
 * - CV_OCR_PAGE_TIMEOUT_MS — per-page tesseract timeout (default 45000)
 * - CV_OCR_DISABLE_LOCAL — set "true" to skip local Tesseract
 * - CV_OCR_SERVICE_URL — POST JSON `{ "pdfBase64": "<base64>" }`, expect `{ "text": string }`
 * - CV_OCR_SERVICE_SECRET — optional Bearer token for remote OCR
 * - CV_OCR_REMOTE_TIMEOUT_MS — remote request timeout (default 60000)
 * - TESSERACT_CMD — explicit tesseract binary path (recommended when Node has no Homebrew PATH)
 */

import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { createCanvas } from 'canvas';
import { randomUUID } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import logger from '@/lib/logger';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const execFileAsync = promisify(execFile);

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MIN_TEXT_CHARS = readIntEnv('CV_PDF_MIN_TEXT_CHARS', 80);
const OCR_MAX_PAGES = readIntEnv('CV_OCR_MAX_PAGES', 5);
const OCR_RENDER_SCALE = readIntEnv('CV_OCR_RENDER_SCALE', 2);
const OCR_PAGE_TIMEOUT_MS = readIntEnv('CV_OCR_PAGE_TIMEOUT_MS', 45000);
const OCR_REMOTE_TIMEOUT_MS = readIntEnv('CV_OCR_REMOTE_TIMEOUT_MS', 60000);

/** `undefined` = not probed yet; `null` = none of the candidates worked */
let resolvedTesseractPath: string | null | undefined;

function buildTesseractCandidates(): string[] {
  const fromEnv = process.env.TESSERACT_CMD?.trim();
  const candidates = [
    ...(fromEnv ? [fromEnv] : []),
    // Homebrew / common installs — Node from GUI/IDE often omits these from PATH
    '/opt/homebrew/bin/tesseract',
    '/usr/local/bin/tesseract',
    '/usr/bin/tesseract',
    'tesseract',
  ];
  return [...new Set(candidates)];
}

async function getTesseractExecutablePath(): Promise<string | null> {
  if (resolvedTesseractPath !== undefined) {
    return resolvedTesseractPath;
  }

  const candidates = buildTesseractCandidates();
  for (const bin of candidates) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await withTimeout(
        execFileAsync(bin, ['--version']),
        5000,
        'Tesseract binary check',
      );
      resolvedTesseractPath = bin;
      logger.info({
        event: 'cv_ocr_tesseract_resolved',
        path: bin,
      });
      return bin;
    } catch {
      // try next candidate
    }
  }

  resolvedTesseractPath = null;
  logger.warn({
    event: 'cv_ocr_tesseract_unavailable',
    tried: candidates,
    message:
      'No Tesseract binary responded to --version. Install tesseract, widen PATH, or set TESSERACT_CMD.',
  });
  return null;
}

function isSufficientText(text: string): boolean {
  return text.trim().length >= MIN_TEXT_CHARS;
}

async function extractTextWithPdfJs(pdf: pdfjs.PDFDocumentProxy): Promise<string> {
  let textContent = '';
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const pageText = await page.getTextContent();
    textContent += pageText.items
      .map((item) => (item as TextItem).str)
      .join(' ');
  }
  return textContent;
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    task
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function renderPageToPngBuffer(
  pdf: pdfjs.PDFDocumentProxy,
  pageNumber: number,
): Promise<Buffer> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
  const canvas = createCanvas(
    Math.ceil(viewport.width),
    Math.ceil(viewport.height),
  );
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  return canvas.toBuffer('image/png');
}

async function ocrPageWithTesseract(
  pdf: pdfjs.PDFDocumentProxy,
  pageNumber: number,
  tessBinary: string,
): Promise<string> {
  const imageBuffer = await renderPageToPngBuffer(pdf, pageNumber);
  const tempImagePath = join(
    tmpdir(),
    `hiretrack-ocr-${randomUUID()}-${pageNumber}.png`,
  );

  await writeFile(tempImagePath, imageBuffer);
  try {
    const { stdout } = await withTimeout(
      execFileAsync(tessBinary, [
        tempImagePath,
        'stdout',
        '-l',
        'eng',
        '--psm',
        '6',
      ]),
      OCR_PAGE_TIMEOUT_MS,
      `Tesseract page ${pageNumber}`,
    );
    return (stdout || '').trim();
  } finally {
    await unlink(tempImagePath).catch(() => {});
  }
}

async function tryRemoteFullPdfOcr(pdfBase64: string): Promise<string | null> {
  const url = process.env.CV_OCR_SERVICE_URL?.trim();
  if (!url) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OCR_REMOTE_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const secret = process.env.CV_OCR_SERVICE_SECRET?.trim();
    if (secret) {
      headers.Authorization = `Bearer ${secret}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pdfBase64 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn({
        event: 'cv_ocr_remote_failed',
        status: response.status,
        url,
      });
      return null;
    }

    const data = (await response.json()) as { text?: unknown };
    const text = typeof data.text === 'string' ? data.text : '';
    return text;
  } catch (error) {
    logger.warn({
      event: 'cv_ocr_remote_error',
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function ocrConfigurationHint(): string {
  return [
    'This PDF has little or no selectable text (often a scanned image).',
    'Configure OCR: set CV_OCR_SERVICE_URL to a self-hosted OCR API, or install the Tesseract OCR program on the machine running this server (not an npm package).',
    'On macOS with Homebrew: brew install tesseract — that installs the tesseract binary and English trained data; optional extra languages: brew install tesseract-lang.',
    'If `tesseract` works in Terminal but not here, set TESSERACT_CMD=/opt/homebrew/bin/tesseract (Apple Silicon) or /usr/local/bin/tesseract (Intel).',
  ].join(' ');
}

async function tryLocalTesseractOcr(pdf: pdfjs.PDFDocumentProxy): Promise<string> {
  if (process.env.CV_OCR_DISABLE_LOCAL === 'true') {
    throw new Error(
      `Local OCR is disabled (CV_OCR_DISABLE_LOCAL=true). ${ocrConfigurationHint()}`,
    );
  }

  const tessBinary = await getTesseractExecutablePath();
  if (!tessBinary) {
    throw new Error(ocrConfigurationHint());
  }

  const pagesToScan = Math.min(pdf.numPages, OCR_MAX_PAGES);
  let merged = '';

  for (let i = 1; i <= pagesToScan; i += 1) {
    logger.info({
      event: 'cv_ocr_tesseract_page_started',
      page: i,
      totalPages: pdf.numPages,
    });
    // eslint-disable-next-line no-await-in-loop
    const pageText = await ocrPageWithTesseract(pdf, i, tessBinary);
    merged += `${pageText} `;
    logger.info({
      event: 'cv_ocr_tesseract_page_finished',
      page: i,
      chars: pageText.trim().length,
    });
  }

  if (pdf.numPages > OCR_MAX_PAGES) {
    logger.warn({
      event: 'cv_ocr_tesseract_page_cap',
      scannedPages: pagesToScan,
      totalPages: pdf.numPages,
    });
  }

  return merged;
}

/**
 * Extract readable text from a PDF (base64) for resume parsing.
 * Order: pdf.js text layer → optional remote OCR service → optional local Tesseract.
 */
/** For `/api/process-cv/ocr-test` and ops dashboards; uses the same probe cache as extraction. */
export async function probeCvOcrTesseractPath(): Promise<{
  resolvedPath: string | null;
  candidatesTried: string[];
}> {
  const candidatesTried = buildTesseractCandidates();
  const resolvedPath = await getTesseractExecutablePath();
  return { resolvedPath, candidatesTried };
}

export async function extractPdfTextForCv(base64Pdf: string): Promise<string> {
  const pdfData = Buffer.from(base64Pdf, 'base64');
  const uint8Array = new Uint8Array(pdfData);
  const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;

  logger.info({
    event: 'cv_pdf_extraction_started',
    pages: pdf.numPages,
    bytes: pdfData.length,
  });

  const pdfJsText = await extractTextWithPdfJs(pdf);
  logger.info({
    event: 'cv_pdf_text_extracted',
    method: 'pdfjs',
    chars: pdfJsText.trim().length,
    minCharsRequired: MIN_TEXT_CHARS,
  });

  if (isSufficientText(pdfJsText)) {
    return pdfJsText;
  }

  logger.warn({
    event: 'cv_pdf_ocr_fallback_triggered',
    reason: 'insufficient_pdf_text',
    chars: pdfJsText.trim().length,
    pages: pdf.numPages,
  });

  const remoteText = await tryRemoteFullPdfOcr(base64Pdf);
  if (remoteText && isSufficientText(remoteText)) {
    logger.info({
      event: 'cv_pdf_text_extracted',
      method: 'remote_ocr',
      chars: remoteText.trim().length,
    });
    return remoteText;
  }

  if (remoteText && remoteText.trim().length > 0) {
    logger.warn({
      event: 'cv_ocr_remote_insufficient_text',
      chars: remoteText.trim().length,
    });
  }

  const tessText = await tryLocalTesseractOcr(pdf);
  if (isSufficientText(tessText)) {
    logger.info({
      event: 'cv_pdf_text_extracted',
      method: 'tesseract',
      chars: tessText.trim().length,
    });
    return tessText;
  }

  throw new Error(
    `Could not extract enough readable text from this PDF after OCR. ${ocrConfigurationHint()} Alternatively, upload a searchable PDF or DOCX.`,
  );
}

export async function debugExtractPdfText(base64Pdf: string): Promise<{
  pdfjsChars: number;
  remoteAttempted: boolean;
  remoteChars: number;
  tessAttempted: boolean;
  tessChars: number;
  finalChars: number;
  sufficient: boolean;
  preview: string;
  error?: string;
}> {
  const pdfData = Buffer.from(base64Pdf, 'base64');
  const uint8Array = new Uint8Array(pdfData);
  const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
  const pdfJsText = await extractTextWithPdfJs(pdf);
  const pdfjsChars = pdfJsText.trim().length;

  if (isSufficientText(pdfJsText)) {
    return {
      pdfjsChars,
      remoteAttempted: false,
      remoteChars: 0,
      tessAttempted: false,
      tessChars: 0,
      finalChars: pdfjsChars,
      sufficient: true,
      preview: pdfJsText.slice(0, 1200),
    };
  }

  let remoteChars = 0;
  let remoteAttempted = !!process.env.CV_OCR_SERVICE_URL?.trim();
  const remoteText = await tryRemoteFullPdfOcr(base64Pdf);
  if (remoteText) {
    remoteChars = remoteText.trim().length;
  }

  if (remoteText && isSufficientText(remoteText)) {
    return {
      pdfjsChars,
      remoteAttempted,
      remoteChars,
      tessAttempted: false,
      tessChars: 0,
      finalChars: remoteChars,
      sufficient: true,
      preview: remoteText.slice(0, 1200),
    };
  }

  let tessAttempted = false;
  let tessChars = 0;
  try {
    tessAttempted = process.env.CV_OCR_DISABLE_LOCAL !== 'true';
    const tessText = await tryLocalTesseractOcr(pdf);
    tessChars = tessText.trim().length;
    if (isSufficientText(tessText)) {
      return {
        pdfjsChars,
        remoteAttempted,
        remoteChars,
        tessAttempted,
        tessChars,
        finalChars: tessChars,
        sufficient: true,
        preview: tessText.slice(0, 1200),
      };
    }
    return {
      pdfjsChars,
      remoteAttempted,
      remoteChars,
      tessAttempted,
      tessChars,
      finalChars: tessChars,
      sufficient: false,
      preview: tessText.slice(0, 1200),
      error: 'OCR ran but extracted text is still below the minimum length.',
    };
  } catch (error) {
    return {
      pdfjsChars,
      remoteAttempted,
      remoteChars,
      tessAttempted,
      tessChars,
      finalChars: 0,
      sufficient: false,
      preview: '',
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}
