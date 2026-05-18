import * as Yup from 'yup';
import { MIN_BULK_CV_PROVIDERS_CONFIGURED } from '@/lib/cv-processing/config';
import {
  getConfiguredBulkCvProviderIds,
  MIN_BULK_CV_PROVIDERS_MESSAGE,
} from './form-utils';
import type { BulkCvAiFormValues } from './types';

const customModelRule = (modelField: string, label: string) =>
  Yup.string().when(modelField, {
    is: 'custom',
    then: (schema) => schema.required(`Custom ${label} model id is required`),
    otherwise: (schema) => schema,
  });

const bulkCvAiBaseSchema = Yup.object({
  doclingParseUrl: Yup.string().max(2048),

  groq_api_key: Yup.string().max(500),
  groq_model: Yup.string().required(),
  groq_custom_model: customModelRule('groq_model', 'Groq'),

  gemini_api_key: Yup.string().max(500),
  gemini_model: Yup.string().required(),
  gemini_custom_model: customModelRule('gemini_model', 'Gemini'),

  deepseek_api_key: Yup.string().max(500),
  deepseek_model: Yup.string().required(),
  deepseek_custom_model: customModelRule('deepseek_model', 'DeepSeek'),

  openrouter_api_key: Yup.string().max(500),
  openrouter_model: Yup.string().required(),
  openrouter_custom_model: customModelRule('openrouter_model', 'OpenRouter'),

  cerebras_api_key: Yup.string().max(500),
  cerebras_model: Yup.string().required(),
  cerebras_custom_model: customModelRule('cerebras_model', 'Cerebras'),

  mistral_api_key: Yup.string().max(500),
  mistral_model: Yup.string().required(),
  mistral_custom_model: customModelRule('mistral_model', 'Mistral'),
});

export function createBulkCvAiSchema(initialValues: BulkCvAiFormValues) {
  return bulkCvAiBaseSchema.test(
    'min-providers',
    MIN_BULK_CV_PROVIDERS_MESSAGE,
    (values) => {
      if (!values) return false;
      return (
        getConfiguredBulkCvProviderIds(
          values as BulkCvAiFormValues,
          initialValues,
        ).length >= MIN_BULK_CV_PROVIDERS_CONFIGURED
      );
    },
  );
}
