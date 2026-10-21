import React from 'react';
import { FormikErrors, FormikProps, FormikTouched } from 'formik';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AIProvidersValues, FormFieldName, ProviderConfigItem } from '../types';
import { getProviderIcon } from '../utils';
import {
  ApiKeySection,
  CapabilitiesSection,
  CustomModelSection,
  ModelSelectSection,
} from './provider-card-sections';
import {
  CardHeaderActions,
  VerificationStatus,
} from './provider-card-header-actions';
import {
  PROVIDER_API_KEY_DOC_URLS,
  PROVIDER_MODEL_DOC_URLS,
} from '@/lib/ai-providers/provider-doc-links';
import { ExternalLink } from 'lucide-react';
import type { DiscoveredProviderModel } from '@/lib/ai-providers/gemini-model-discovery';

function getProviderFormValue(values: AIProvidersValues, field: FormFieldName) {
  // Avoid dynamic indexing to satisfy security lint rules.
  switch (field) {
    case 'gemini_api_key':
      return values.gemini_api_key;
    case 'gemini_model':
      return values.gemini_model;
    case 'gemini_custom_model':
      return values.gemini_custom_model;
    case 'openai_api_key':
      return values.openai_api_key;
    case 'openai_model':
      return values.openai_model;
    case 'openai_custom_model':
      return values.openai_custom_model;
    case 'anthropic_api_key':
      return values.anthropic_api_key;
    case 'anthropic_model':
      return values.anthropic_model;
    case 'anthropic_custom_model':
      return values.anthropic_custom_model;
    case 'perplexity_api_key':
      return values.perplexity_api_key;
    case 'perplexity_model':
      return values.perplexity_model;
    case 'perplexity_custom_model':
      return values.perplexity_custom_model;
    default: {
      const exhaustiveCheck: never = field;
      return exhaustiveCheck;
    }
  }
}

function hasProviderFieldError(
  errors: FormikErrors<AIProvidersValues>,
  touched: FormikTouched<AIProvidersValues>,
  field: FormFieldName,
) {
  // Avoid dynamic indexing to satisfy security lint rules.
  switch (field) {
    case 'gemini_api_key':
      return Boolean(errors.gemini_api_key && touched.gemini_api_key);
    case 'gemini_model':
      return Boolean(errors.gemini_model && touched.gemini_model);
    case 'gemini_custom_model':
      return Boolean(errors.gemini_custom_model && touched.gemini_custom_model);
    case 'openai_api_key':
      return Boolean(errors.openai_api_key && touched.openai_api_key);
    case 'openai_model':
      return Boolean(errors.openai_model && touched.openai_model);
    case 'openai_custom_model':
      return Boolean(errors.openai_custom_model && touched.openai_custom_model);
    case 'anthropic_api_key':
      return Boolean(errors.anthropic_api_key && touched.anthropic_api_key);
    case 'anthropic_model':
      return Boolean(errors.anthropic_model && touched.anthropic_model);
    case 'anthropic_custom_model':
      return Boolean(
        errors.anthropic_custom_model && touched.anthropic_custom_model,
      );
    case 'perplexity_api_key':
      return Boolean(errors.perplexity_api_key && touched.perplexity_api_key);
    case 'perplexity_model':
      return Boolean(errors.perplexity_model && touched.perplexity_model);
    case 'perplexity_custom_model':
      return Boolean(
        errors.perplexity_custom_model && touched.perplexity_custom_model,
      );
    default: {
      const exhaustiveCheck: never = field;
      return exhaustiveCheck;
    }
  }
}

interface ProviderCardProps {
  config: ProviderConfigItem;
  formik: FormikProps<AIProvidersValues>;
  primaryColor: string;
  isUpdating: boolean;
  verificationStatus: 'idle' | 'loading' | 'success' | 'error';
  verificationMessage?: string;
  showApiKey: boolean;
  modelOptions?: DiscoveredProviderModel[];
  onOpenModelSelect?: () => void;
  onVerify: (apiKey: string, model: string) => void;
  onToggleVisibility: () => void;
}

export function ProviderCard({
  config,
  formik,
  primaryColor,
  isUpdating,
  verificationStatus,
  verificationMessage,
  showApiKey,
  modelOptions,
  onOpenModelSelect,
  onVerify,
  onToggleVisibility,
}: ProviderCardProps) {
  const {
    label,
    apiKeyField,
    modelField,
    customModelField,
    placeholder,
    provider,
    description,
  } = config;
  const { values, handleChange, handleBlur, setFieldValue, errors, touched } =
    formik;

  const isActive = values.activeProvider === provider;
  const apiKeyValue = getProviderFormValue(values, apiKeyField) ?? '';
  const modelValue = getProviderFormValue(values, modelField) ?? '';
  const customModelValue = getProviderFormValue(values, customModelField) ?? '';
  const apiKeyHasError = hasProviderFieldError(errors, touched, apiKeyField);
  const customModelHasError = hasProviderFieldError(
    errors,
    touched,
    customModelField,
  );

  const activeStyle = isActive
    ? ({
        borderColor: `${primaryColor}80`,
        backgroundColor: `${primaryColor}0D`,
        '--tw-ring-color': `${primaryColor}33`,
      } as React.CSSProperties)
    : {};

  const finalModelForVerification =
    modelValue === 'custom' ? customModelValue : modelValue;

  const isVerifyingDisabled =
    !apiKeyValue.trim() ||
    (modelValue === 'custom' && !customModelValue.trim());

  return (
    <Card
      className={`transition-all duration-300 hover:shadow-lg ${
        isActive
          ? 'border-2 shadow-md ring-1'
          : 'border border-border hover:border-border/80 dark:hover:border-border/60'
      }`}
      style={activeStyle}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${isActive ? '' : 'bg-muted text-muted-foreground'}`}
              style={
                isActive
                  ? {
                      backgroundColor: `${primaryColor}33`,
                      color: primaryColor,
                    }
                  : {}
              }
            >
              {getProviderIcon(provider)}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription className="text-sm">
                {description}
              </CardDescription>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <a
                  href={PROVIDER_API_KEY_DOC_URLS[provider] ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Get API key
                  <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={PROVIDER_MODEL_DOC_URLS[provider]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                >
                  View models
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
          <CardHeaderActions
            status={verificationStatus as VerificationStatus}
            isActive={isActive}
            isDisabled={formik.isSubmitting || isUpdating}
            onMakeActive={() => setFieldValue('activeProvider', provider)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ApiKeySection
          apiKeyField={apiKeyField}
          apiKeyValue={apiKeyValue}
          placeholder={placeholder}
          showApiKey={showApiKey}
          onToggleVisibility={onToggleVisibility}
          onVerify={onVerify}
          verificationStatus={verificationStatus as VerificationStatus}
          verificationMessage={verificationMessage}
          isActive={isActive}
          activeStyle={activeStyle}
          isVerifyingDisabled={isVerifyingDisabled}
          finalModelForVerification={finalModelForVerification}
          hasError={apiKeyHasError}
          handleChange={handleChange}
          handleBlur={handleBlur}
        />

        <ModelSelectSection
          provider={provider}
          modelField={modelField}
          modelValue={modelValue}
          modelOptions={modelOptions}
          onOpenModelSelect={onOpenModelSelect}
          setFieldValue={setFieldValue}
        />

        {/* Custom Model Input */}
        {modelValue === 'custom' && (
          <CustomModelSection
            customModelField={customModelField}
            customModelValue={customModelValue}
            hasError={customModelHasError}
            handleChange={handleChange}
            handleBlur={handleBlur}
          />
        )}

        {/* Capabilities Display */}
        {modelValue && modelValue !== 'custom' && (
          <CapabilitiesSection provider={provider} modelValue={modelValue} />
        )}
      </CardContent>
    </Card>
  );
}
