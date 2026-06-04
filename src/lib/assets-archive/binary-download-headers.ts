/** Headers for raw archive bytes — avoid proxy/Next re-compression of gzip payloads. */
export const BINARY_DOWNLOAD_HEADERS: Record<string, string> = {
  'Content-Type': 'application/octet-stream',
  'Content-Encoding': 'identity',
  'Cache-Control': 'no-store, no-transform',
  'X-Content-Type-Options': 'nosniff',
};

export function binaryDownloadHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  return { ...BINARY_DOWNLOAD_HEADERS, ...extra };
}
