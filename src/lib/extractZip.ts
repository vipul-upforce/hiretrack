import JSZip from "jszip";

export async function extractFromZip(
  zipBuffer: ArrayBuffer
): Promise<Buffer[]> {
  const zip = new JSZip();
  const contents = await zip.loadAsync(zipBuffer);
  const files: Buffer[] = [];

  for (const [filename, file] of Object.entries(contents.files)) {
    if (!file.dir) {
      const extension = filename.split(".").pop()?.toLowerCase();
      if (["pdf", "doc", "docx"].includes(extension || "")) {
        const content = await file.async("nodebuffer");
        files.push(content);
      }
    }
  }

  return files;
}
