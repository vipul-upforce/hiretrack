import { useState } from 'react';
import { AIProviderType } from '@/lib/ai-providers';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import { useValidateAiProviderMutation } from '@/lib/features/settings';

export const useAiVerification = () => {
  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, 'idle' | 'loading' | 'success' | 'error'>
  >({});

  const [verificationMessages, setVerificationMessages] = useState<
    Record<string, string>
  >({});

  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const [validateProvider] = useValidateAiProviderMutation();

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
      const result = await validateProvider({
        provider,
        apiKey: apiKey.trim(),
        model: model || getDefaultModel(provider),
      }).unwrap();

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
    } catch (error: unknown) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));

      const errorMessage =
        (error as { data?: { error?: string; message?: string } }).data
          ?.error ||
        (error as { data?: { error?: string; message?: string } }).data
          ?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: `❌ Verification failed: ${errorMessage}`,
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
