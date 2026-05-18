import type { DoclingParseResponse } from '../types';

/**
 * Sends a PDF to Docling and returns extracted Markdown.
 */
export async function parsePdfToMarkdownViaDocling(
  file: File,
  parseUrl: string,
  fetchInit?: RequestInit,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(parseUrl, {
    method: 'POST',
    body: formData,
    ...fetchInit,
  });

  if (!response.ok) {
    throw new Error(`Docling service failed with status: ${response.status}`);
  }

  const data = (await response.json()) as DoclingParseResponse;
  if (
    data.status !== 'success' ||
    typeof data.markdown !== 'string' ||
    !data.markdown.trim()
  ) {
    throw new Error('Docling did not return usable markdown');
  }

  return data.markdown;
}
