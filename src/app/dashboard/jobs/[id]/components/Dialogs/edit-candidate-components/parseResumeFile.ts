import { Resume } from '@/lib/redux/types';
import { parseResumeFromPdf } from '@/lib/parse-resume-from-pdf';

/**
 * Reads a PDF file, parses it for resume data, and calls the setter with the result.
 * No-op for non-PDF files.
 */
export function parseResumeFile(
  file: File | null,
  setParsedResume: (data: Resume | null) => void,
): Promise<void> {
  if (!file || file.type !== 'application/pdf') {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const { result } = reader;
      if (result && typeof result === 'string') {
        try {
          const parsedData = await parseResumeFromPdf(result);
          setParsedResume(parsedData);
        } catch {
          setParsedResume(null);
        }
      }
      resolve();
    };
    reader.readAsDataURL(file);
  });
}
