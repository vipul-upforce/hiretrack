import type { DoclingParseResponse } from '../types';

/** Per-request timeout for local PDF → markdown service (ms). */
const DEFAULT_DOCLING_PARSE_TIMEOUT_MS = 180_000;

const TRANSIENT_FETCH_PATTERNS = [
  'fetch failed',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EPIPE',
  'aborted',
  'AbortError',
] as const;

function isTransientFetchError(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSIENT_FETCH_PATTERNS.some(
    (pattern) =>
      lower.includes(pattern.toLowerCase())
      || message.includes(pattern),
  );
}

function resolveDoclingParseTimeoutMs(): number {
  const raw = process.env.DOCLING_PARSE_TIMEOUT_MS?.trim();
  if (!raw) {
    return DEFAULT_DOCLING_PARSE_TIMEOUT_MS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_DOCLING_PARSE_TIMEOUT_MS;
  }
  return parsed;
}

async function fetchParseService(
  parseUrl: string,
  formData: FormData,
  fetchInit: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(parseUrl, {
      method: 'POST',
      body: formData,
      ...fetchInit,
      signal: fetchInit?.signal ?? controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `PDF parse service timed out after ${Math.round(timeoutMs / 1000)}s`,
      );
    }
    const cause =
      error instanceof Error && 'cause' in error && error.cause instanceof Error
        ? error.cause.message
        : '';
    const base = error instanceof Error ? error.message : String(error);
    throw new Error(cause ? `${base} (${cause})` : base);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends a PDF to the configured parse service and returns extracted Markdown.
 */
export async function parsePdfToMarkdownViaDocling(
  file: File,
  parseUrl: string,
  fetchInit?: RequestInit,
): Promise<string> {
  const timeoutMs = resolveDoclingParseTimeoutMs();

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetchParseService(
        parseUrl,
        formData,
        fetchInit,
        timeoutMs,
      );

      if (!response.ok) {
        throw new Error(
          `PDF parse service failed with status: ${response.status}`,
        );
      }

      const data = (await response.json()) as DoclingParseResponse;
      if (
        data.status !== 'success'
        || typeof data.markdown !== 'string'
        || !data.markdown.trim()
      ) {
        throw new Error('PDF parse service did not return usable markdown');
      }

      return data.markdown;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      if (attempt === 0 && isTransientFetchError(err.message)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error('PDF parse service request failed');
}
