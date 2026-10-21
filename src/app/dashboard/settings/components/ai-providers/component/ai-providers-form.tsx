import React, { useEffect, useState } from 'react';
import { Form, Formik } from 'formik';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useUpdateAIProvidersMutation } from '@/lib/features/settings';
import { getProviderModels } from '@/lib/ai-providers/models-config';
import type { DiscoveredProviderModel } from '@/lib/ai-providers/gemini-model-discovery';
import { AIProvidersValues } from '../types';
import { aiProvidersSchema } from '../schema';
import { PROVIDER_CONFIGS } from '../constants';
import { useAiVerification } from '../hooks/useAiVerification';
import { ProviderCard } from './provider-card';

interface AIProvidersFormProps {
  initialValues: AIProvidersValues;
  primaryColor: string;
  onClose: () => void;
  onRefetch: () => void;
  embedded?: boolean;
}

type CachedDiscoveredModels = {
  apiKey: string;
  models: DiscoveredProviderModel[];
};

function getProviderFormValue(
  values: AIProvidersValues,
  field: keyof AIProvidersValues,
) {
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
    default:
      return '';
  }
}

export default function AIProvidersForm({
  initialValues,
  primaryColor,
  onClose,
  onRefetch,
  embedded = false,
}: AIProvidersFormProps) {
  const { toast } = useToast();
  const [updateAIProviders, { isLoading: isUpdating }] =
    useUpdateAIProvidersMutation();
  const {
    showApiKeys,
    verifyApiKey,
    toggleApiKeyVisibility,
    getVerificationState,
  } = useAiVerification();
  const [showSaveHint, setShowSaveHint] = useState(false);
  const [availableModelsByProvider, setAvailableModelsByProvider] = useState<
    Partial<Record<(typeof PROVIDER_CONFIGS)[number]['provider'], DiscoveredProviderModel[]>>
  >({});
  const discoveredModelsCacheRef = React.useRef<
    Partial<Record<(typeof PROVIDER_CONFIGS)[number]['provider'], CachedDiscoveredModels>>
  >({});

  useEffect(() => {
    setAvailableModelsByProvider({});
    discoveredModelsCacheRef.current = {};
  }, [initialValues]);

  const cacheDiscoveredModels = (
    provider: (typeof PROVIDER_CONFIGS)[number]['provider'],
    apiKey: string,
    models: DiscoveredProviderModel[],
  ) => {
    discoveredModelsCacheRef.current[provider] = {
      apiKey: apiKey.trim(),
      models,
    };
  };

  const getCachedDiscoveredModels = (
    provider: (typeof PROVIDER_CONFIGS)[number]['provider'],
    apiKey: string,
  ): DiscoveredProviderModel[] | null => {
    const cacheEntry = discoveredModelsCacheRef.current[provider];
    if (!cacheEntry || cacheEntry.apiKey !== apiKey.trim()) {
      return null;
    }

    return cacheEntry.models;
  };

  const clearProviderModelOptions = (
    provider: (typeof PROVIDER_CONFIGS)[number]['provider'],
  ) =>
    setAvailableModelsByProvider((prev) => {
      if (!prev[provider]) {
        return prev;
      }

      const next = { ...prev };
      delete next[provider];
      return next;
    });

  const applyValidatedModel = (
    provider: (typeof PROVIDER_CONFIGS)[number]['provider'],
    validatedModel: string,
    availableModels: DiscoveredProviderModel[] | undefined,
    setFieldValue: (
      field: string,
      value: string,
      shouldValidate?: boolean,
    ) => Promise<unknown>,
  ) => {
    const config = PROVIDER_CONFIGS.find((item) => item.provider === provider);

    if (!config) {
      return;
    }

    const isKnownModel = Boolean(
      availableModels?.some((modelInfo) => modelInfo.id === validatedModel)
      || getProviderModels(provider).some(
        (modelInfo) => modelInfo.id === validatedModel,
      ),
    );

    void setFieldValue(
      config.modelField,
      isKnownModel ? validatedModel : 'custom',
    );
    void setFieldValue(
      config.customModelField,
      isKnownModel ? '' : validatedModel,
    );
  };

  const handleSubmit = async (values: AIProvidersValues) => {
    const activeConfig = PROVIDER_CONFIGS.find(
      (config) => config.provider === values.activeProvider,
    );
    if (activeConfig) {
      const apiKey = getProviderFormValue(values, activeConfig.apiKeyField);
      const model = getProviderFormValue(values, activeConfig.modelField);
      const customModel = getProviderFormValue(
        values,
        activeConfig.customModelField,
      );
      const finalModel = model === 'custom' ? customModel : model;
      const verificationState = getVerificationState(
        values.activeProvider,
        apiKey,
        finalModel,
      );
      if (!verificationState.isVerified) {
        toast({
          title: 'Verification Required',
          description: 'Please verify the active provider before saving.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      const formatProviderData = (
        apiKey: string,
        model: string,
        customModel: string,
      ) => ({
        api_key: apiKey.trim(),
        model: model === 'custom' ? customModel.trim() : model,
        customModel: model === 'custom' ? customModel.trim() : '',
      });

      const dataToSubmit = {
        activeProvider: values.activeProvider,
        gemini: formatProviderData(
          values.gemini_api_key,
          values.gemini_model,
          values.gemini_custom_model,
        ),
        openai: formatProviderData(
          values.openai_api_key,
          values.openai_model,
          values.openai_custom_model,
        ),
        anthropic: formatProviderData(
          values.anthropic_api_key,
          values.anthropic_model,
          values.anthropic_custom_model,
        ),
        perplexity: formatProviderData(
          values.perplexity_api_key,
          values.perplexity_model,
          values.perplexity_custom_model,
        ),
      };

      await updateAIProviders(dataToSubmit).unwrap();
      toast({
        title: 'Success',
        description: 'AI provider settings updated successfully',
      });
      onRefetch();
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update AI provider settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <Formik<AIProvidersValues>
      initialValues={initialValues}
      validationSchema={aiProvidersSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {(formik) => {
        const activeConfig = PROVIDER_CONFIGS.find(
          (config) => config.provider === formik.values.activeProvider,
        );
        const activeApiKey = activeConfig
          ? getProviderFormValue(formik.values, activeConfig.apiKeyField)
          : '';
        const activeModel = activeConfig
          ? getProviderFormValue(formik.values, activeConfig.modelField)
          : '';
        const activeCustomModel = activeConfig
          ? getProviderFormValue(formik.values, activeConfig.customModelField)
          : '';
        const activeFinalModel =
          activeModel === 'custom' ? activeCustomModel : activeModel;
        const activeVerification = activeConfig
          ? getVerificationState(
            formik.values.activeProvider,
            activeApiKey,
            activeFinalModel,
          )
          : { isVerified: false, status: 'idle', message: undefined };

        const saveDisabledReason = (() => {
          if (!activeConfig) return 'Please select an active provider.';
          if (!activeApiKey.trim()) {
            return 'Enter an API key and verify the provider before saving.';
          }
          if (!activeFinalModel?.trim()) {
            return 'Select a model and verify the provider before saving.';
          }
          if (activeVerification.status === 'loading') {
            return 'Verification in progress. Please wait.';
          }
          if (!activeVerification.isVerified) {
            return 'Verify the provider before saving.';
          }
          return '';
        })();

        const isSaveBlocked = Boolean(saveDisabledReason);

        return (
          <Form
            className={`flex flex-col overflow-hidden ${
              embedded ? 'h-full' : 'h-[calc(86vh-80px)]'
            }`}
          >
            <div className="sticky top-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
              {/* Provider Cards Grid */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {PROVIDER_CONFIGS.map((config) => {
                  const apiKeyValue = getProviderFormValue(
                    formik.values,
                    config.apiKeyField,
                  );
                  const modelValue = getProviderFormValue(
                    formik.values,
                    config.modelField,
                  );
                  const customModelValue = getProviderFormValue(
                    formik.values,
                    config.customModelField,
                  );
                  const finalModelForVerification =
                    modelValue === 'custom' ? customModelValue : modelValue;
                  const verificationState = getVerificationState(
                    config.provider,
                    apiKeyValue,
                    finalModelForVerification,
                  );
                  return (
                    <ProviderCard
                      key={config.provider}
                      config={config}
                      formik={formik}
                      primaryColor={primaryColor}
                      isUpdating={isUpdating}
                      verificationStatus={verificationState.status}
                      verificationMessage={verificationState.message}
                      showApiKey={!!showApiKeys[config.provider]}
                      modelOptions={availableModelsByProvider[config.provider]}
                      onOpenModelSelect={() => {
                        if (config.provider !== 'gemini' || !apiKeyValue.trim()) {
                          return;
                        }

                        const cachedModels = getCachedDiscoveredModels(
                          config.provider,
                          apiKeyValue,
                        );

                        if (cachedModels?.length) {
                          setAvailableModelsByProvider((prev) => ({
                            ...prev,
                            [config.provider]: cachedModels,
                          }));
                          return;
                        }

                        clearProviderModelOptions(config.provider);

                        void verifyApiKey(config.provider, apiKeyValue, finalModelForVerification, {
                          onAvailableModels: (availableModels) =>
                            {
                              cacheDiscoveredModels(
                                config.provider,
                                apiKeyValue,
                                availableModels,
                              );
                              setAvailableModelsByProvider((prev) => ({
                                ...prev,
                                [config.provider]: availableModels,
                              }));
                            },
                          onValidatedModel: (validatedModel, availableModels) =>
                            applyValidatedModel(
                              config.provider,
                              validatedModel,
                              availableModels,
                              formik.setFieldValue,
                            ),
                        });
                      }}
                      onVerify={(key, model) =>
                        verifyApiKey(config.provider, key, model, {
                          onAvailableModels: (availableModels) =>
                            {
                              cacheDiscoveredModels(
                                config.provider,
                                key,
                                availableModels,
                              );
                              setAvailableModelsByProvider((prev) => ({
                                ...prev,
                                [config.provider]: availableModels,
                              }));
                            },
                          onValidatedModel: (validatedModel, availableModels) =>
                            applyValidatedModel(
                              config.provider,
                              validatedModel,
                              availableModels,
                              formik.setFieldValue,
                            ),
                        })
                      }
                      onToggleVisibility={() =>
                        toggleApiKeyVisibility(config.provider)
                      }
                    />
                  );
                })}
              </div>

              {/* Info Card */}
              <Card className="mt-6" style={{ borderColor: `${primaryColor}33` }}>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Security & Usage Information
                    </p>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>
                        Only the active provider will be used for resume
                        processing
                      </li>
                      <li>
                        API keys are stored securely and encrypted in the database
                      </li>
                      <li>
                        Verify your API keys to ensure they work before saving
                      </li>
                      <li> You can switch between providers at any time</li>
                      <li>
                        Custom models can be used to access newer or unlisted
                        models
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 z-10 mt-auto flex justify-end space-x-2 border-t bg-background px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={formik.isSubmitting || isUpdating}
              >
                Cancel
              </Button>
              <Popover
                open={isSaveBlocked && showSaveHint}
                onOpenChange={(open) => setShowSaveHint(open)}
              >
                <PopoverTrigger asChild>
                  <span
                    className="inline-flex"
                    onMouseEnter={() => isSaveBlocked && setShowSaveHint(true)}
                    onMouseLeave={() => setShowSaveHint(false)}
                    onFocus={() => isSaveBlocked && setShowSaveHint(true)}
                    onBlur={() => setShowSaveHint(false)}
                  >
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={
                        formik.isSubmitting || isUpdating || isSaveBlocked
                      }
                    >
                      {formik.isSubmitting || isUpdating
                        ? 'Saving...'
                        : 'Save Configuration'}
                    </Button>
                  </span>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-64 text-sm p-2 py-1">
                  {saveDisabledReason || 'Verify the provider before saving.'}
                </PopoverContent>
              </Popover>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
