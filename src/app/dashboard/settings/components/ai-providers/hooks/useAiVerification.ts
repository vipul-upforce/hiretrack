import { useState } from 'react';
import { AIProviderType } from '@/lib/ai-providers';
import { getDefaultModel } from '@/lib/ai-providers/models-config';
import type { DiscoveredProviderModel } from '@/lib/ai-providers/gemini-model-discovery';
import { useValidateAiProviderMutation } from '@/lib/features/settings';

type VerifyApiKeyOptions = {
  onAvailableModels?: (models: DiscoveredProviderModel[]) => void;
  onValidatedModel?: (
    validatedModel: string,
    availableModels?: DiscoveredProviderModel[],
  ) => void;
};

export const useAiVerification = () => {
  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, 'idle' | 'loading' | 'success' | 'error'>
  >({});

  const [verificationMessages, setVerificationMessages] = useState<
    Record<string, string>
  >({});

  const [verifiedConfig, setVerifiedConfig] = useState<
    Record<string, { apiKey: string; model: string } | null>
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
    options?: VerifyApiKeyOptions,
  ) => {
    const trimmedApiKey = apiKey.trim();
    const finalModel = model || getDefaultModel(provider);

    if (!trimmedApiKey) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: 'Please enter an API key before verifying',
      }));
      setVerifiedConfig((prev) => ({ ...prev, [provider]: null }));
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
        apiKey: trimmedApiKey,
        model: finalModel,
      }).unwrap();

      const { isValid } = result;
      const validatedModel = result.model || finalModel;

      if (result.availableModels?.length) {
        options?.onAvailableModels?.(result.availableModels);
      }

      setVerificationStatus((prev) => ({
        ...prev,
        [provider]: isValid ? 'success' : 'error',
      }));

      setVerifiedConfig((prev) => ({
        ...prev,
        [provider]: isValid
          ? { apiKey: trimmedApiKey, model: validatedModel }
          : null,
      }));

      if (isValid && validatedModel !== finalModel) {
        options?.onValidatedModel?.(validatedModel, result.availableModels);
      }

      const message = isValid
        ? result.message || 'API key and model are valid'
        : result.error || 'API key or model is invalid';

      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: message,
      }));
    } catch (error: unknown) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: 'error' }));
      setVerifiedConfig((prev) => ({ ...prev, [provider]: null }));

      const errorMessage =
        (error as { data?: { error?: string; message?: string } }).data
          ?.error ||
        (error as { data?: { error?: string; message?: string } }).data
          ?.message ||
        (error instanceof Error ? error.message : 'Unknown error');

      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: `Verification failed: ${errorMessage}`,
      }));
    }
  };

  const getVerificationState = (
    provider: AIProviderType,
    apiKey: string,
    model: string,
  ) => {
    const trimmedApiKey = apiKey.trim();
    const finalModel = model || getDefaultModel(provider);
    const baseStatus = verificationStatus[provider] || 'idle';
    const baseMessage = verificationMessages[provider];
    const verified =
      baseStatus === 'success' &&
      verifiedConfig[provider]?.apiKey === trimmedApiKey &&
      verifiedConfig[provider]?.model === finalModel &&
      !!trimmedApiKey &&
      !!finalModel;

    if (verified) {
      return {
        status: 'success' as const,
        message: baseMessage,
        isVerified: true,
      };
    }

    if (baseStatus === 'loading') {
      return {
        status: 'loading' as const,
        message: baseMessage,
        isVerified: false,
      };
    }

    if (baseStatus === 'error') {
      return {
        status: 'error' as const,
        message: baseMessage,
        isVerified: false,
      };
    }

    const message = trimmedApiKey
      ? 'Please verify this API key and model.'
      : undefined;

    return {
      status: 'idle' as const,
      message,
      isVerified: false,
    };
  };

  return {
    verificationStatus,
    verificationMessages,
    showApiKeys,
    verifyApiKey,
    toggleApiKeyVisibility,
    getVerificationState,
  };
};
