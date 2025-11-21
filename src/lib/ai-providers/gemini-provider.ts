import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { BaseAIProvider } from "./base-provider";
import { ProcessedResumeData } from "./types";
import { getDefaultModel } from "./models-config";

export class GeminiProvider extends BaseAIProvider {
  name = "gemini";

  async processResume(
    base64Resume: string,
    apiKey: string,
    modelName?: string
  ): Promise<ProcessedResumeData> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = modelName || getDefaultModel("gemini");

      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const prompt = `
You are an expert resume parser. 
Return ONLY valid JSON according to the required format.
No explanations, no markdown, no extra text.
`;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt + "\n\n" + this.getStandardPrompt() },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Resume,
                },
              },
            ],
          },
        ],
      });

      const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!raw) throw new Error("No valid JSON response from Gemini");

      const cleaned = this.cleanJsonResponse(raw);
      return this.parseJsonResponse(cleaned);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to process resume with Gemini"
      );
    }
  }

  async evaluateResume(
    resumeBase64: string,
    apiKey: string,
    prompt: string,
    modelName?: string,
    temperature?: number
  ): Promise<string> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = modelName || getDefaultModel("gemini");

      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: temperature ?? 0.1,
        },
      });

      const systemPrompt = `
You are an expert technical recruiter.
Return ONLY valid JSON based on the structure provided.
Never include explanations, markdown, or commentary.
`;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt + "\n\n" + prompt },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: resumeBase64,
                },
              },
            ],
          },
        ],
      });

      const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("No valid JSON response from Gemini");

      return text;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to evaluate resume with Gemini"
      );
    }
  }

  async validateApiKey(
    apiKey: string,
    modelName?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = modelName || getDefaultModel("gemini");
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: { responseMimeType: "application/json" },
      });

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: 'Return {"status": "ok"}' }],
          },
        ],
      });

      if (!result?.response) {
        return { isValid: false, error: "No response received from Gemini" };
      }

      return { isValid: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("API_KEY_INVALID"))
        return { isValid: false, error: "Invalid API key" };

      if (errorMessage.includes("model"))
        return {
          isValid: false,
          error: `Model '${modelName || getDefaultModel("gemini")}' not found`,
        };

      return { isValid: false, error: errorMessage };
    }
  }
}
