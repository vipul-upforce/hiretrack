/**
 * Loads resume bytes as base64 for deferred CV batch processing and retries.
 *
 * Resolution order (avoids fragile server self-fetch where possible):
 * 1. `data:` URLs — payload only
 * 2. Local disk — `../assets/...`, `/api/files?pathName=...` (same allowlist as GET /api/files)
 * 3. Proxied provider URL — `/api/file/:id` via `FileUrlMapping.realUrl` (Cloudinary/S3)
 * 4. Fallback — absolute URL or resolved relative URL via `fetch`
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Model } from 'mongoose';
import type { IFileUrlMapping } from '@/lib/models/fileUrlMapping';

/** Mirrors `src/app/api/files/route.ts` allowlist */
const ALLOWED_RELATIVE_DIRECTORIES = [
  '../assets/images/',
  '../assets/documents/',
  '../assets/organizations/',
  '../backups',
] as const;

function resolveStoredFileTargetUrl(fileUrl: string, requestUrl: string): string {
  if (!fileUrl) {
    return '';
  }

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  if (fileUrl.startsWith('/api/files?') || fileUrl.startsWith('/api/file/')) {
    return new URL(fileUrl, requestUrl).toString();
  }

  if (fileUrl.startsWith('../assets/') || fileUrl.startsWith('assets/')) {
    const normalized = fileUrl.startsWith('../') ? fileUrl : `../${fileUrl}`;
    return new URL(
      `/api/files?pathName=${encodeURIComponent(normalized)}`,
      requestUrl,
    ).toString();
  }

  return new URL(fileUrl, requestUrl).toString();
}

function extractLocalPathName(fileUrl: string): string | null {
  if (!fileUrl) {
    return null;
  }

  if (fileUrl.startsWith('../assets/') || fileUrl.startsWith('assets/')) {
    return fileUrl.startsWith('../') ? fileUrl : `../${fileUrl}`;
  }

  try {
    const parsed = new URL(fileUrl, 'http://local.internal');
    if (parsed.pathname === '/api/files') {
      const pathName = parsed.searchParams.get('pathName');
      if (pathName) {
        return decodeURIComponent(pathName);
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function tryReadLocalFileBase64(fileUrl: string): Promise<string | null> {
  const pathName = extractLocalPathName(fileUrl);
  if (!pathName) {
    return null;
  }

  const projectRoot = process.cwd();
  const sanitizedPath = path.normalize(pathName);

  const isAllowedPath = ALLOWED_RELATIVE_DIRECTORIES.some((allowedDir) =>
    sanitizedPath.startsWith(path.normalize(allowedDir)),
  );
  if (!isAllowedPath) {
    throw new Error('Access denied - invalid local file path');
  }

  const resolvedPath = path.resolve(projectRoot, sanitizedPath);
  const allowedBasePaths = ALLOWED_RELATIVE_DIRECTORIES.map((dir) =>
    path.resolve(projectRoot, dir),
  );
  const isWithinAllowedBase = allowedBasePaths.some((basePath) =>
    resolvedPath.startsWith(basePath),
  );
  if (!isWithinAllowedBase) {
    throw new Error('Access denied - path traversal detected');
  }

  const fileBuffer = await fs.readFile(resolvedPath);
  return fileBuffer.toString('base64');
}

function extractProxyFileId(fileUrl: string): string | null {
  if (!fileUrl) {
    return null;
  }
  try {
    const parsed = new URL(fileUrl, 'http://local.internal');
    const match = parsed.pathname.match(/^\/api\/file\/([^/]+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function tryReadMappedProviderFileBase64(
  fileUrl: string,
  FileUrlMappingModel: Model<IFileUrlMapping> | null,
): Promise<string | null> {
  const fileId = extractProxyFileId(fileUrl);
  if (!fileId || !FileUrlMappingModel) {
    return null;
  }

  const mapping = await FileUrlMappingModel.findOne({ fileId })
    .select('realUrl')
    .lean<{ realUrl?: string } | null>()
    .exec();
  const realUrl = mapping?.realUrl;
  if (!realUrl) {
    throw new Error(`Stored file mapping not found for fileId: ${fileId}`);
  }

  const response = await fetch(realUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch mapped provider file: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

export async function loadResumeFileAsBase64FromStoredUrl(
  fileUrl: string,
  requestUrl: string,
  FileUrlMappingModel: Model<IFileUrlMapping> | null,
): Promise<string> {
  if (!fileUrl) {
    throw new Error('Stored file URL is missing');
  }

  if (fileUrl.startsWith('data:')) {
    const base64Payload = fileUrl.split(',')[1];
    if (!base64Payload) {
      throw new Error('Stored file data URL is invalid');
    }
    return base64Payload;
  }

  const localBase64 = await tryReadLocalFileBase64(fileUrl);
  if (localBase64) {
    return localBase64;
  }

  const mappedBase64 = await tryReadMappedProviderFileBase64(
    fileUrl,
    FileUrlMappingModel,
  );
  if (mappedBase64) {
    return mappedBase64;
  }

  const targetUrl = resolveStoredFileTargetUrl(fileUrl, requestUrl);
  const fileResponse = await fetch(targetUrl);
  if (!fileResponse.ok) {
    throw new Error(`Failed to fetch stored file: ${fileResponse.status}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}
