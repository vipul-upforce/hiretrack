import Anthropic from "@anthropic-ai/sdk";
import { BaseAIProvider } from "./base-provider";
import { ProcessedResumeData } from "./types";
import { getDefaultModel } from "./models-config";

export class AnthropicProvider extends BaseAIProvider {
  name = "anthropic";

  async processResume(base64Resume: string, apiKey: string, modelName?: string): Promise<ProcessedResumeData> {
    try {
      const anthropic = new Anthropic({ apiKey });

      const prompt = this.getStandardPrompt();
      const selectedModel = modelName || getDefaultModel("anthropic");

      const response = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 2000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "text",
                text: `[PDF content provided as base64: ${base64Resume.substring(0, 50)}...]`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text" || !content.text) {
        throw new Error("No valid response from Anthropic");
      }

      const jsonString = this.cleanJsonResponse(content.text);
      return this.parseJsonResponse(jsonString);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to process resume with Anthropic"
      );
    }
  }

  async validateApiKey(apiKey: string, modelName?: string): Promise<{ isValid: boolean; error?: string }> {
    const selectedModel = modelName || getDefaultModel("anthropic");
    
    try {
      const anthropic = new Anthropic({ apiKey });
      
      // Simple test to validate the API key and model
      const response = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 5,
        messages: [{ role: "user", content: "Test" }],
      });
      
      if (!response.content || response.content.length === 0) {
        return { isValid: false, error: "No response received from Anthropic" };
      }
      
      return { isValid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check for common error patterns
      if (errorMessage.includes("invalid_api_key") || errorMessage.includes("authentication_error")) {
        return { isValid: false, error: "Invalid API key" };
      }
      if (errorMessage.includes("model_not_found") || errorMessage.includes(`The model '${selectedModel}' does not exist`)) {
        return { isValid: false, error: `Model '${selectedModel}' not found` };
      }
      if (errorMessage.includes("rate_limit") || errorMessage.includes("overloaded")) {
        return { isValid: false, error: "Rate limit exceeded or service overloaded" };
      }
      
      return { isValid: false, error: errorMessage };
    }
  }
}