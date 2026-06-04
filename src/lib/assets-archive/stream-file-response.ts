import { createReadStream } from 'fs';
import fs from 'fs/promises';
import { Readable } from 'stream';
import { NextResponse } from 'next/server';
import { binaryDownloadHeaders } from './binary-download-headers';

interface StreamFileOptions {
  filePath: string;
  contentType: string;
  contentDisposition?: string;
  contentLength?: number;
  onComplete?: () => Promise<void>;
}

/**
 * Stream a file without loading it into memory; optionally cleanup when done.
 */
export function streamFileResponse({
  filePath,
  contentType,
  contentDisposition,
  contentLength,
  onComplete,
}: StreamFileOptions): NextResponse {
  const nodeStream = createReadStream(filePath);

  if (onComplete) {
    nodeStream.on('close', () => {
      void onComplete().catch(() => undefined);
    });
  }

  const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

  const extra: Record<string, string> = {
    'Content-Type': contentType,
  };
  if (contentDisposition) {
    extra['Content-Disposition'] = contentDisposition;
  }
  if (contentLength !== undefined) {
    extra['Content-Length'] = String(contentLength);
  }

  return new NextResponse(webStream, {
    status: 200,
    headers: binaryDownloadHeaders(extra),
  });
}

export async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}
