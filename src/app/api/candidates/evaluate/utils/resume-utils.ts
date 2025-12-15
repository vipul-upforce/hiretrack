import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generates base64 encoded string from a local file path
 * @param url - URL containing file path (format: ...files?pathName=...)
 * @returns Base64 encoded file content or empty string if path not found
 */
export async function generateBase64(url: string): Promise<string> {
  const pathName = url.split('files?pathName=')[1];
  if (!pathName) {
    return '';
  }
  const safePath = path.normalize(pathName);
  const filePath = safePath;
  const fileBuffer = await fs.readFile(filePath);
  const base64Resume = fileBuffer.toString('base64');
  return base64Resume;
}

/**
 * Fetches resume from remote URL and converts to base64
 */
export async function fetchResumeAsBase64(resumeUrl: string): Promise<string> {
  const response = await fetch(resumeUrl.trim());
  if (!response.ok) {
    throw new Error('Failed to fetch resume file');
  }
  const arrayBuffer = await response.arrayBuffer();
  const resumeBuffer = Buffer.from(arrayBuffer);
  return resumeBuffer.toString('base64');
}

/**
 * Normalizes resume URL by adding origin if needed
 */
export function normalizeResumeUrl(
  resumeUrl: string,
  origin: string | null
): string {
  if (!resumeUrl.startsWith('http')) {
    return `${origin || ''}${resumeUrl}`.trim();
  }
  return resumeUrl;
}

