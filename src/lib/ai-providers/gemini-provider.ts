import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { BaseAIProvider } from "./base-provider";
import { ProcessedResumeData } from "./types";
import { getDefaultModel } from "./models-config";

export class GeminiProvider extends BaseAIProvider {
  name = "gemini";

  async processResume(base64Resume: string, apiKey: string, modelName?: string): Promise<ProcessedResumeData> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = modelName || getDefaultModel("gemini");
      const model = genAI.getGenerativeModel({ model: selectedModel });

      const prompt = this.getStandardPrompt();

      const parts: Part[] = [
        { text: prompt },
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Resume,
          },
        },
      ];

      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      const response = await result.response;

      if (!response.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error("No valid response from Gemini");
      }

      const jsonString = this.cleanJsonResponse(response.candidates[0].content.parts[0].text);
      return this.parseJsonResponse(jsonString);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to process resume with Gemini"
      );
    }
  }

  async validateApiKey(apiKey: string, modelName?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = modelName || getDefaultModel("gemini");
      const model = genAI.getGenerativeModel({ model: selectedModel });
      
      // Simple test to validate the API key and model
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Test" }] }],
      });
      
      if (!result.response) {
        return { isValid: false, error: "No response received from Gemini" };
      }
      
      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check for common error patterns
      if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("invalid API key")) {
        return { isValid: false, error: "Invalid API key" };
      }
      if (errorMessage.includes("model not found") || errorMessage.includes("invalid model")) {
        return { isValid: false, error: `Model '${modelName || getDefaultModel("gemini")}' not found` };
      }
      
      return { isValid: false, error: errorMessage };
    }
  }
}