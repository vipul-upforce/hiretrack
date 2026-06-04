/** Matches release manifest schema in mds/ASSET_CHUNKED_DOWNLOAD.md */
export interface AssetsArchiveManifest {
  filename: string;
  version?: string;
  chunked: boolean;
  partSizeBytes: number;
  parts: number;
  totalBytes: number;
  sha256: string;
  partPrefix: string;
  partPad: number;
  /** Portal-only: ties part requests to a prepared session directory */
  sessionId: string;
}

export const PART_SIZE_MB = 50;
export const PART_SIZE_BYTES = PART_SIZE_MB * 1024 * 1024;
export const PART_PAD = 3;
export const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export const MANIFEST_FILENAME = 'manifest.json';

export interface BuildChunkedArchiveResult {
  manifest: AssetsArchiveManifest;
  sessionDir: string;
}
