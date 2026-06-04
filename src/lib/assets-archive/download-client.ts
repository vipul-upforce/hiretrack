import { assemblePartBuffers } from './assemble-parts';
import type { AssetsArchiveManifest } from './types';

export interface DownloadAssetsArchiveOptions {
  /** Base path without trailing slash, e.g. `/api/download/assets` */
  basePath?: string;
  onProgress?: (current: number, total: number, phase: 'prepare' | 'download') => void;
  maxPartRetries?: number;
}

export interface DownloadAssetsArchiveResult {
  blob: Blob;
  filename: string;
}

function isChunkedManifest(data: unknown): data is AssetsArchiveManifest {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  const parts =
    typeof m.parts === 'number' ? m.parts : Number.parseInt(String(m.parts), 10);
  const totalBytes =
    typeof m.totalBytes === 'number'
      ? m.totalBytes
      : Number.parseInt(String(m.totalBytes), 10);
  return (
    m.chunked === true &&
    Number.isInteger(parts) &&
    parts > 0 &&
    typeof m.sessionId === 'string' &&
    typeof m.filename === 'string' &&
    typeof m.sha256 === 'string' &&
    Number.isFinite(totalBytes) &&
    totalBytes > 0
  );
}

function normalizeManifest(raw: AssetsArchiveManifest): AssetsArchiveManifest {
  return {
    ...raw,
    parts:
      typeof raw.parts === 'number'
        ? raw.parts
        : Number.parseInt(String(raw.parts), 10),
    totalBytes:
      typeof raw.totalBytes === 'number'
        ? raw.totalBytes
        : Number.parseInt(String(raw.totalBytes), 10),
  };
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

function looksLikeErrorPayload(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength === 0) return true;
  if (buffer.byteLength > 2048) return false;
  const start = new TextDecoder()
    .decode(buffer.slice(0, Math.min(64, buffer.byteLength)))
    .trimStart();
  return start.startsWith('{') || start.startsWith('<!');
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchPartWithRetry(
  url: string,
  maxRetries: number,
  partIndex: number,
): Promise<ArrayBuffer> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      const contentType = response.headers.get('Content-Type') ?? '';
      if (
        contentType.includes('application/json') ||
        contentType.includes('text/html')
      ) {
        throw new Error(
          `Part ${partIndex} returned ${contentType} instead of binary data`,
        );
      }

      const buffer = await response.arrayBuffer();
      const contentLengthHeader = response.headers.get('Content-Length');
      if (contentLengthHeader) {
        const expectedLength = Number.parseInt(contentLengthHeader, 10);
        if (
          Number.isFinite(expectedLength) &&
          expectedLength !== buffer.byteLength
        ) {
          throw new Error(
            `Part ${partIndex} size mismatch: header ${expectedLength}, got ${buffer.byteLength}`,
          );
        }
      }

      if (looksLikeErrorPayload(buffer)) {
        throw new Error(
          `Part ${partIndex} returned an error payload instead of archive bytes`,
        );
      }

      return buffer;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }
  }
  throw lastError ?? new Error(`Part ${partIndex} download failed`);
}

async function downloadMonolithic(
  assetsPath: string,
): Promise<DownloadAssetsArchiveResult> {
  const response = await fetch(assetsPath, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }
  const blob = await response.blob();
  const assembled = await blob.arrayBuffer();
  assemblePartBuffers([assembled], assembled.byteLength);

  const contentDisposition = response.headers.get('Content-Disposition');
  const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
  const filename = fileNameMatch
    ? fileNameMatch[1]
    : `assets-${Date.now()}.tar.gz`;
  return { blob: new Blob([assembled], { type: 'application/gzip' }), filename };
}

async function downloadChunked(
  assetsPath: string,
  manifest: AssetsArchiveManifest,
  onProgress?: DownloadAssetsArchiveOptions['onProgress'],
  maxPartRetries = 3,
): Promise<DownloadAssetsArchiveResult> {
  const normalized = normalizeManifest(manifest);
  const { parts, sessionId, filename, totalBytes, sha256 } = normalized;
  const partBuffers: ArrayBuffer[] = [];

  for (let i = 0; i < parts; i += 1) {
    onProgress?.(i + 1, parts, 'download');
    const partUrl = `${assetsPath}?part=${i}&sessionId=${encodeURIComponent(sessionId)}`;
    const partBuffer = await fetchPartWithRetry(partUrl, maxPartRetries, i);
    partBuffers.push(partBuffer);
  }

  const assembled = assemblePartBuffers(partBuffers, totalBytes);
  const digest = await sha256Hex(assembled);
  if (digest !== sha256) {
    throw new Error('SHA256 checksum mismatch after chunked download');
  }

  const blob = new Blob([assembled], { type: 'application/gzip' });
  return { blob, filename };
}

/**
 * Download organization assets archive (chunked when meta is available, else monolithic).
 */
export async function downloadAssetsArchive(
  options: DownloadAssetsArchiveOptions = {},
): Promise<DownloadAssetsArchiveResult> {
  const base = options.basePath ?? '/api/download/assets';
  const metaPath = `${base}/meta`;
  const maxPartRetries = options.maxPartRetries ?? 3;

  options.onProgress?.(0, 1, 'prepare');

  const metaResponse = await fetch(metaPath, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (metaResponse.ok) {
    const manifest: unknown = await metaResponse.json();
    if (isChunkedManifest(manifest)) {
      return downloadChunked(
        base,
        manifest,
        options.onProgress,
        maxPartRetries,
      );
    }
  }

  options.onProgress?.(1, 1, 'download');
  return downloadMonolithic(base);
}
