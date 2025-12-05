import { useState } from 'react';
import { AIProviderType } from '@/lib/ai-providers';
import { getDefaultModel } from '@/lib/ai-providers/models-config';

export const useAiVerification = () => {
  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, 'idle' | 'loading' | 'success' | 'error'>
  >({});
  const [verificationMessages, setVerificationMessages] = useState<
    Record<string, string>
  >({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const verifyApiKey = async (
    provider: AIProviderType,
    apiKey: string,
    model: string,
  ) => {
    if (!apiKey.trim()) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: 'Please enter an API key before verifying',
      }));
      return;
    }

    setVerificationStatus((prev) => ({ ...prev, [provider]: 'loading' }));
    setVerificationMessages((prev) => ({
      ...prev,
      [provider]: 'Verifying API key and model...',
    }));

    try {
      const response = await fetch('/api/settings/ai-providers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          model: model || getDefaultModel(provider),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      const { isValid } = result;
      setVerificationStatus((prev) => ({
        ...prev,
        [provider]: isValid ? 'success' : 'error',
      }));

      const message = isValid
        ? result.message || '✅ API key and model are valid'
        : result.error || '❌ API key or model is invalid';

      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: message,
      }));
    } catch (error) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: `❌ Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));
    }
  };

  return {
    verificationStatus,
    verificationMessages,
    showApiKeys,
    verifyApiKey,
    toggleApiKeyVisibility,
  };
};
