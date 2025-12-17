import { IAIProviders, ISettings } from '@/lib/models/settings';
import { decryptProviderKeys } from '@/lib/encryption';

/**
 * Handle backward compatibility for legacy Gemini-only installations
 */
export function handleLegacyGeminiSettings(
  settingsData: Pick<ISettings, 'aiProviders' | 'gemini'>
): IAIProviders | null {
  if (settingsData.aiProviders) {
    return settingsData.aiProviders;
  }

  if (settingsData.gemini?.gemini_key) {
    const legacyGeminiKey = settingsData.gemini.gemini_key;

    return {
      activeProvider: 'gemini',
      gemini: {
        api_key: legacyGeminiKey,
        model: 'gemini-1.5-flash',
        customModel: '',
      },
      openai: {
        api_key: '',
        model: 'gpt-4o-mini',
        customModel: '',
      },
      anthropic: {
        api_key: '',
        model: 'claude-3-5-sonnet-20241022',
        customModel: '',
      },
      perplexity: {
        api_key: '',
        model: 'sonar-pro',
        customModel: '',
      },
    };
  }

  return null;
}

/**
 * Get decrypted AI providers from settings
 */
export function getDecryptedAIProviders(
  settingsData: Pick<ISettings, 'aiProviders' | 'gemini'>,
  organizationId: string
): IAIProviders {
  const aiProviders = handleLegacyGeminiSettings(settingsData);

  if (!aiProviders) {
    throw new Error('AI providers not configured');
  }

  // Decrypt API keys from database
  return decryptProviderKeys(aiProviders, organizationId) as IAIProviders;
}

/**
 * Get API key for the active provider in a type-safe way
 */
export function getActiveProviderApiKey(aiProviders: IAIProviders): string | undefined {
  const { activeProvider } = aiProviders;
  
  switch (activeProvider) {
    case 'gemini':
      return aiProviders.gemini?.api_key;
    case 'openai':
      return aiProviders.openai?.api_key;
    case 'anthropic':
      return aiProviders.anthropic?.api_key;
    case 'perplexity':
      return aiProviders.perplexity?.api_key;
    default:
      return undefined;
  }
}

