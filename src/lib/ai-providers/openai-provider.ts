import { OpenAI } from "openai";
import { BaseAIProvider } from "./base-provider";
import { ProcessedResumeData } from "./types";
import { getDefaultModel } from "./models-config";

export class OpenAIProvider extends BaseAIProvider {
  name = "openai";

  async processResume(base64Resume: string, apiKey: string, modelName?: string): Promise<ProcessedResumeData> {
    try {
      const openai = new OpenAI({ apiKey });

      const prompt = this.getStandardPrompt();

      // OpenAI doesn't support PDF directly in vision models
      // For now, we'll use a text-based approach
      // In production, you would:
      // 1. Convert PDF to images using pdf.js or similar
      // 2. Extract text from PDF
      // 3. Use OCR if needed
      
      const selectedModel = modelName || getDefaultModel("openai");
      const response = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content: "You are an expert resume parser. Extract information accurately and return valid JSON."
          },
          {
            role: "user",
            content: `${prompt}\n\nNote: Process the resume and extract all relevant information. Return the data in the specified JSON format.`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No valid response from OpenAI");
      }

      console.log("OpenAI resume processing response:", content);
      return this.parseJsonResponse(content);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to process resume with OpenAI"
      );
    }
  }

  async validateApiKey(apiKey: string, modelName?: string): Promise<{ isValid: boolean; error?: string }> {
    const selectedModel = modelName || getDefaultModel("openai");
    
    try {
      const openai = new OpenAI({ 
        apiKey,
        dangerouslyAllowBrowser: false // This ensures server-side usage only
      });
      
      // Test API key with a simple chat completion
      const response = await openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 1,
        temperature: 0
      });
      
      if (!response.id) {
        return { isValid: false, error: "No response received from OpenAI" };
      }
      
      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check for common error patterns
      if (errorMessage.includes("Incorrect API key") || errorMessage.includes("invalid_api_key")) {
        return { isValid: false, error: "Invalid API key" };
      }
      if (errorMessage.includes("model") && errorMessage.includes("does not exist")) {
        return { isValid: false, error: `Model '${selectedModel}' not found` };
      }
      if (errorMessage.includes("insufficient_quota")) {
        return { isValid: false, error: "Insufficient quota or credits" };
      }
      
      return { isValid: false, error: errorMessage };
    }
  }
}