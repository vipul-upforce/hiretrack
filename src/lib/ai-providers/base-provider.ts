import { AIProvider, ProcessedResumeData } from "./types";

export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  
  abstract processResume(base64Resume: string, apiKey: string, model?: string): Promise<ProcessedResumeData>;
  
  abstract validateApiKey(apiKey: string, model?: string): Promise<{ isValid: boolean; error?: string }>;

  protected getStandardPrompt(): string {
    return `
    please firstly check that it is valid cv or not,
    if not then dont give me anything just give me message in json like
    { error : " this is not valid cv"},
    If it as then & then only give me fields
    As an AI assistant specializing in resume parsing, analyze this resume and extract the following information in JSON format:
    {
      "name": "candidate's full name",
      "email": "candidate's email if present",
      "location": "candidate's location/city",
      "experience": number of years of experience (as a number),
      "skills": ["array", "of", "technical", "and", "soft", "skills"],
      "currentCTC": current CTC as a number (in lakhs, 0 if not found),
      "expectedCTC": expected CTC as a number (in lakhs, 0 if not found),
      "noticePeriod": notice period in months (as a number, 0 if not found),
      "scores": {
        "overall": // An overall rating (out of 10),
        "experience": // A rating (out of 10),
        "skills": // A rating (out of 10),
        "strengths": // A list of strengths,
        "areas_for_improvement": // A list of areas for improvement,
        "recommendation": // A recommendation,
        "notes": // Additional notes
      }
    }

    Please ensure:
    1. All numeric fields are numbers, not strings
    2. Skills are extracted as an array of strings
    3. Experience is calculated based on work history
    4. CTCs are in lakhs per annum
    5. If any field is not found, use appropriate default values (0 for numbers, empty array for skills)

    Below is the resume content:`;
  }

  protected cleanJsonResponse(response: string): string {
    return response
      .replace(/```json\n?/g, "")
      .replace(/```/g, "")
      .trim();
  }

  protected parseJsonResponse(jsonString: string): ProcessedResumeData {
    try {
      const parsedData = JSON.parse(jsonString);
      
      // Check if the response indicates an invalid CV
      if (parsedData.error) {
        return {
          name: "",
          location: "",
          experience: 0,
          skills: [],
          currentCTC: 0,
          expectedCTC: 0,
          noticePeriod: 0,
          error: parsedData.error,
        };
      }

      return parsedData;
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}