import { OpenAI } from "openai";
import { BaseAIProvider } from "./base-provider";
import { ProcessedResumeData } from "./types";
import { getDefaultModel } from "./models-config";

export class OpenAIProvider extends BaseAIProvider {
  name = "openai";

  async processResume(
    base64Resume: string,
    apiKey: string,
    modelName?: string
  ): Promise<ProcessedResumeData> {
    try {
      const openai = new OpenAI({ apiKey });

      const resumeText = await this.extractTextFromPdf(base64Resume);
      // console.log("Extracted resume text:", resumeText);
      const prompt = this.getStandardPrompt() + `Resume Text: ${resumeText}`;
      // console.log("⬇️⬇️⬇️⬇️ :", prompt);

      const selectedModel = modelName || getDefaultModel("openai");
      const response = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          {
            role: "system",
            content:
              "You are an expert resume parser. Extract information accurately and return valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No valid response from OpenAI");
      }

      console.log("OpenAI resume processing response:", content);
      return this.parseJsonResponse(content);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to process resume with OpenAI"
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
    const openai = new OpenAI({ apiKey });

    const selectedModel = modelName || getDefaultModel("openai");

    const resumeText = await this.extractTextFromPdf(resumeBase64);
    console.log("RESUME TECT: ", resumeText);
    const finalPrompt = `${prompt}

Resume Text:
${resumeText}`;
    console.log("FINAL PROMPT EVALUATION: ", finalPrompt);
    const response = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical recruiter evaluating candidates. Provide honest, detailed evaluations.",
        },
        {
          role: "user",
          content: finalPrompt,
        },
      ],
      max_tokens: 2000,
      temperature: temperature !== undefined ? temperature : 0.1,
      response_format: { type: "json_object" },
    });

    if (!response.choices[0]?.message?.content) {
      throw new Error("No valid response from OpenAI");
    }

    return response.choices[0].message.content;
  }

  async validateApiKey(
    apiKey: string,
    modelName?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    const selectedModel = modelName || getDefaultModel("openai");

    try {
      const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: false, // This ensures server-side usage only
      });

      // Test API key with a simple chat completion
      const response = await openai.chat.completions.create({
        model: selectedModel,
        messages: [{ role: "user", content: "Test" }],
        max_tokens: 1,
        temperature: 0,
      });

      if (!response.id) {
        return { isValid: false, error: "No response received from OpenAI" };
      }

      return { isValid: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Check for common error patterns
      if (
        errorMessage.includes("Incorrect API key") ||
        errorMessage.includes("invalid_api_key")
      ) {
        return { isValid: false, error: "Invalid API key" };
      }
      if (
        errorMessage.includes("model") &&
        errorMessage.includes("does not exist")
      ) {
        return { isValid: false, error: `Model '${selectedModel}' not found` };
      }
      if (errorMessage.includes("insufficient_quota")) {
        return { isValid: false, error: "Insufficient quota or credits" };
      }

      return { isValid: false, error: errorMessage };
    }
  }
}
