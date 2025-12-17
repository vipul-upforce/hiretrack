'use client';

import React, { useState, useEffect } from 'react';
import {
  useGetAIProvidersConfigsQuery,
  useGetPortalConfigsQuery,
} from '@/lib/features/settings/settingsApi';
import AIProvidersForm from './component/ai-providers-form';
import { AIProvidersValues } from './types';
import { getModelDisplayValue } from './utils';
import AiProviderSkeleton from './component/ai-provider-loading-skeleton';

export default function AIProvidersConfigs({
  onClose,
}: {
  onClose: () => void;
}) {
  const { data, isLoading, refetch } = useGetAIProvidersConfigsQuery(undefined);
  const { data: portalData } = useGetPortalConfigsQuery(undefined);
  const [primaryColor, setPrimaryColor] = useState<string>('#6366f1');

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (portalData?.primaryColor) {
      setPrimaryColor(portalData.primaryColor);
    }
  }, [portalData]);

  if (isLoading) return <AiProviderSkeleton />;

  if (!data && !isLoading) return <div>No Data Available</div>;

  // Prepare initial values
  const initialValues: AIProvidersValues = {
    activeProvider: data.aiProviders?.activeProvider ?? 'gemini',
    gemini_api_key: data.aiProviders?.gemini?.api_key ?? '',
    gemini_model: getModelDisplayValue(
      'gemini',
      data.aiProviders?.gemini?.model ?? '',
      data.aiProviders?.gemini?.customModel ?? '',
    ),
    gemini_custom_model: data.aiProviders?.gemini?.customModel ?? '',

    openai_api_key: data.aiProviders?.openai?.api_key ?? '',
    openai_model: getModelDisplayValue(
      'openai',
      data.aiProviders?.openai?.model ?? '',
      data.aiProviders?.openai?.customModel ?? '',
    ),
    openai_custom_model: data.aiProviders?.openai?.customModel ?? '',

    anthropic_api_key: data.aiProviders?.anthropic?.api_key ?? '',
    anthropic_model: getModelDisplayValue(
      'anthropic',
      data.aiProviders?.anthropic?.model ?? '',
      data.aiProviders?.anthropic?.customModel ?? '',
    ),
    anthropic_custom_model: data.aiProviders?.anthropic?.customModel ?? '',

    perplexity_api_key: data.aiProviders?.perplexity?.api_key ?? '',
    perplexity_model: getModelDisplayValue(
      'perplexity',
      data.aiProviders?.perplexity?.model ?? '',
      data.aiProviders?.perplexity?.customModel ?? '',
    ),
    perplexity_custom_model: data.aiProviders?.perplexity?.customModel ?? '',
  };

  return (
    <AIProvidersForm
      initialValues={initialValues}
      primaryColor={primaryColor}
      onClose={onClose}
      onRefetch={refetch}
    />
  );
}
