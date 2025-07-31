import { BaseAIProvider } from "./base-provider";
import { ProcessedResumeData } from "./types";
import { getDefaultModel } from "./models-config";

export class PerplexityProvider extends BaseAIProvider {
  name = "perplexity";

  async processResume(base64Resume: string, apiKey: string, modelName?: string): Promise<ProcessedResumeData> {
    try {
      const prompt = this.getStandardPrompt();
      const selectedModel = modelName || getDefaultModel("perplexity");

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64Resume}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("No valid response from Perplexity");
      }

      const jsonString = this.cleanJsonResponse(content);
      return this.parseJsonResponse(jsonString);
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to process resume with Perplexity"
      );
    }
  }

  async validateApiKey(apiKey: string, modelName?: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const selectedModel = modelName || getDefaultModel("perplexity");
      
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 1,
          temperature: 0
        }),
      });
      
      // Check for authentication errors first
      if (response.status === 401) {
        return { isValid: false, error: "Invalid API key" };
      }
      
      // If we get a successful response, the API key is valid
      if (response.ok) {
        const data = await response.json();
        if (data && (data.choices || data.id || data.object)) {
          return { isValid: true };
        }
      }
      
      // Check for specific error cases
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.type === "invalid_model" && response.status === 400) {
          // API key is valid but model name is wrong
          return { isValid: false, error: `Model '${selectedModel}' not found` };
        }
        if (errorData.error?.message) {
          return { isValid: false, error: errorData.error.message };
        }
      } catch (parseError) {
        // If we can't parse the error, return the raw response
      }
      
      return { isValid: false, error: `HTTP ${response.status}: ${errorText}` };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { isValid: false, error: errorMessage };
    }
  }
}