import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/** Ensure path points to a valid gzip stream (same check as installer chunked download). */
export async function assertValidGzipFile(filePath: string): Promise<void> {
  try {
    await execAsync(`gzip -t "${filePath}"`);
  } catch {
    throw new Error('Archive is not a valid gzip file (gzip -t failed)');
  }
}
