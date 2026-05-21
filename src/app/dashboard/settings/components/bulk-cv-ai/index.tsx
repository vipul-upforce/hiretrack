'use client';

import React, { useEffect } from 'react';
import { useGetBulkCvAiConfigsQuery } from '@/lib/features/settings';
import { getProviderModels } from '@/lib/ai-providers/models-config';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';
import BulkCvAiForm from './bulk-cv-ai-form';
import type { BulkCvAiFormValues } from './types';
import { Skeleton } from '@/components/ui/skeleton';

function resolveModelFields(
  provider: BulkCvProviderId,
  model: string,
  customModel: string,
): { modelField: string; customField: string } {
  const models = getProviderModels(provider);
  const m = model?.trim() || '';
  const c = customModel?.trim() || '';
  const known = m && models.some((x) => x.id === m);
  if (known) {
    return { modelField: m, customField: c };
  }
  if (m) {
    return { modelField: 'custom', customField: m };
  }
  return { modelField: models[0]?.id ?? '', customField: c };
}

export default function BulkCvAiSettings({
  onClose,
  embedded = false,
}: {
  onClose: () => void;
  embedded?: boolean;
}) {
  const { data, isLoading, refetch } = useGetBulkCvAiConfigsQuery(undefined);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4 px-6 py-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!data?.bulkCvAi) {
    return <div className="px-6 py-4">No data available</div>;
  }

  const b = data.bulkCvAi;

  const groqFields = resolveModelFields(
    'groq',
    b.groq?.model ?? '',
    b.groq?.customModel ?? '',
  );
  const geminiFields = resolveModelFields(
    'gemini',
    b.gemini?.model ?? '',
    b.gemini?.customModel ?? '',
  );
  const deepseekFields = resolveModelFields(
    'deepseek',
    b.deepseek?.model ?? '',
    b.deepseek?.customModel ?? '',
  );
  const openrouterFields = resolveModelFields(
    'openrouter',
    b.openrouter?.model ?? '',
    b.openrouter?.customModel ?? '',
  );
  const cerebrasFields = resolveModelFields(
    'cerebras',
    b.cerebras?.model ?? '',
    b.cerebras?.customModel ?? '',
  );
  const mistralFields = resolveModelFields(
    'mistral',
    b.mistral?.model ?? '',
    b.mistral?.customModel ?? '',
  );

  const initialValues: BulkCvAiFormValues = {
    cvUploadPool: b.cvUploadPool === 'premium' ? 'premium' : 'bulk',
    doclingParseUrl: b.doclingParseUrl ?? '',
    groq_api_key: b.groq?.api_key ?? '',
    groq_model: groqFields.modelField,
    groq_custom_model: groqFields.customField,
    gemini_api_key: b.gemini?.api_key ?? '',
    gemini_model: geminiFields.modelField,
    gemini_custom_model: geminiFields.customField,
    deepseek_api_key: b.deepseek?.api_key ?? '',
    deepseek_model: deepseekFields.modelField,
    deepseek_custom_model: deepseekFields.customField,
    openrouter_api_key: b.openrouter?.api_key ?? '',
    openrouter_model: openrouterFields.modelField,
    openrouter_custom_model: openrouterFields.customField,
    cerebras_api_key: b.cerebras?.api_key ?? '',
    cerebras_model: cerebrasFields.modelField,
    cerebras_custom_model: cerebrasFields.customField,
    mistral_api_key: b.mistral?.api_key ?? '',
    mistral_model: mistralFields.modelField,
    mistral_custom_model: mistralFields.customField,
  };

  return (
    <BulkCvAiForm
      initialValues={initialValues}
      onClose={onClose}
      onRefetch={refetch}
      embedded={embedded}
    />
  );
}
