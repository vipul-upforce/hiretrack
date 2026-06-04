const GZIP_MAGIC_0 = 0x1f;
const GZIP_MAGIC_1 = 0x8b;

/** Concatenate part buffers in order and validate gzip magic bytes (0x1f 0x8b). */
export function assemblePartBuffers(
  parts: ArrayBuffer[],
  expectedTotalBytes: number,
): ArrayBuffer {
  let actualTotal = 0;
  for (const part of parts) {
    actualTotal += part.byteLength;
  }

  if (actualTotal !== expectedTotalBytes) {
    throw new Error(
      `Assembled size ${actualTotal} does not match expected ${expectedTotalBytes}`,
    );
  }

  const combined = new Uint8Array(actualTotal);
  let offset = 0;
  for (const part of parts) {
    combined.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }

  if (
    combined.length < 2 ||
    combined[0] !== GZIP_MAGIC_0 ||
    combined[1] !== GZIP_MAGIC_1
  ) {
    throw new Error(
      'Assembled file is not a valid gzip archive (missing gzip header)',
    );
  }

  return combined.buffer;
}
