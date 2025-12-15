import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { TextItem } from 'pdfjs-dist/types/src/display/api';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function extractTextFromPdf(base64Pdf: string): Promise<string> {
  const pdfData = Buffer.from(base64Pdf, 'base64');
  const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
  let textContent = '';

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const pageText = await page.getTextContent();
    textContent += pageText.items
      .map((item) => (item as TextItem).str)
      .join(' ');
  }

  return textContent;
}
