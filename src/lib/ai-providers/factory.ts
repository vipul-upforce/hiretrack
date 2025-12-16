import { AIProvider, AIProviderType } from './types';
import { GeminiProvider } from './gemini-provider';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';
import { PerplexityProvider } from './perplexity-provider';

export class AIProviderFactory {
  private static providers: Map<AIProviderType, AIProvider> = new Map([
    ['gemini', new GeminiProvider()],
    ['openai', new OpenAIProvider()],
    ['anthropic', new AnthropicProvider()],
    ['perplexity', new PerplexityProvider()],
  ]);

  static getProvider(type: AIProviderType): AIProvider {
    const provider = this.providers.get(type);
    if (!provider) {
      throw new Error(`AI provider '${type}' not found`);
    }
    return provider;
  }

  static getSupportedProviders(): AIProviderType[] {
    return Array.from(this.providers.keys());
  }

  static getProviderDisplayName(type: AIProviderType): string {
    const displayNames: Record<AIProviderType, string> = {
      gemini: 'Google Gemini',
      openai: 'OpenAI GPT',
      anthropic: 'Anthropic Claude',
      perplexity: 'Perplexity AI',
    };
    return displayNames[type as keyof typeof displayNames];
  }
}
