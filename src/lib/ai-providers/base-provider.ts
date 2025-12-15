
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { AIProvider, ProcessedResumeData } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;

  // They will be used in concrete implementations
  abstract processResume(
    base64Resume: string,
    apiKey: string,
    model?: string
  ): Promise<ProcessedResumeData>;

  abstract validateApiKey(
    apiKey: string,
    model?: string
  ): Promise<{ isValid: boolean; error?: string }>;

  abstract evaluateResume(
    resumeBase64: string,
    apiKey: string,
    prompt: string,
    model?: string,
    temperature?: number,
  ): Promise<string>;

  protected static async extractTextFromPdf(base64Pdf: string): Promise<string> {
    const pdfData = Buffer.from(base64Pdf, 'base64');
    const uint8Array = new Uint8Array(pdfData);
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    let textContent = '';

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const pageText = await page.getTextContent();
      textContent += pageText.items.map((item) => (item as TextItem).str).join(' ');
    }

    return textContent;
  }

  protected static getStandardPrompt(): string {
    return `
    first of all you should check if the provided document is a CV or Resume, 
    If not then return JSON: {error:"Not a valid CV"}
    othervise As an AI assistant specializing in resume parsing, analyze the provided resume text and extract the following information in JSON format:
    {
      "name": "candidate's full name",
      "email": "candidate's email if present",
      "location": "candidate's location/city",
      "contact": "candidate's contact number if present",
      "experience": number of years of experience (as a number),
      "relevantExperience": number of years of relevant experience (as a number),
      "skills": ["array", "of", "technical", "and", "soft", "skills"],
      "currentCTC": current CTC as a number (in lakhs, 0 if not found),
      "expectedCTC": expected CTC as a number (in lakhs, 0 if not found),
      "noticePeriod": notice period in months (as a number, 0 if not found),
      "scores": {
        "overall": // An overall rating (out of 10),
        "experience": // A rating (out of 10),
        "skills": // A rating (out of 10),
        "affordability": // Salary alignment score (1-10) with calculation shown (include normalization logic),
        "strengths": // A list of strengths,
        "areas_for_improvement": // A list of areas for improvement,
        "recommendation": // A recommendation,
        "notes": // Additional notes
      }
    }

    SALARY NORMALIZATION EXAMPLES:
    - Candidate says "34000 expected": 34000 ÷ 1000 × 12 = 4.08 LPA
    - Candidate says "34 LPA expected": 34 LPA (no conversion needed)
    - Candidate says "45000 current, 50000 expected": 50000 ÷ 1000 × 12 = 6 LPA expected


    Please ensure:
    1. All numeric fields are numbers, not strings.
    2. Skills are extracted as an array of strings.
    3. Experience is calculated based on work history (e.g., sum the duration of all listed positions, accounting for overlaps).
    4. CTCs are in lakhs per annum.
    5. If any field is not found, use appropriate default values (0 for numbers, empty array for skills, empty string for others).
    6. Handle unconventional formats, minor formatting issues (e.g., extra spaces, typos), or incomplete resumes by extracting as much relevant information as possible.
    7. If the resume text is not in a standard CV format, still attempt to parse it and return the JSON with available data, make sure you can fill all the fields mentioned above.
    8. If no valid data can be extracted, return JSON object { error : " this is not valid cv"}.
    Below is the resume content:`;
  }

  protected static cleanJsonResponse(response: string): string {
    return response
      .replace(/```json\n?/g, '')
      .replace(/```/g, '')
      .trim();
  }

  protected static parseJsonResponse(jsonString: string): ProcessedResumeData {
    try {
      const parsedData = JSON.parse(jsonString);

      // Check if the response indicates an invalid CV
      if (parsedData.error) {
        return {
          name: '',
          location: '',
          contact: '',
          experience: 0,
          relevantExperience: 0,
          skills: [],
          currentCTC: 0,
          expectedCTC: 0,
          noticePeriod: 0,
          error: parsedData.error,
        };
      }

      return parsedData;
    } catch (error) {
      throw new Error(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
