'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikProps } from 'formik';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BulkCvProviderId,
  IBulkCvAi,
  IBulkCvAiProviderSlot,
} from '@/lib/types/bulk-cv-ai';
import {
  useUpdateBulkCvAiConfigsMutation,
  useValidateBulkCvAiMutation,
} from '@/lib/features/settings';
import {
  BULK_CV_PROVIDER_LABELS,
  CV_UPLOAD_POOL_DESCRIPTIONS,
  CV_UPLOAD_POOL_LABELS,
} from '@/lib/cv-processing/config';
import { getProviderModels } from '@/lib/ai-providers/models-config';
import type { CvUploadPool } from '@/lib/types/bulk-cv-ai';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { createBulkCvAiSchema } from './schema';
import {
  getConfiguredBulkCvProviderIds,
  MIN_BULK_CV_PROVIDERS_MESSAGE,
  meetsMinBulkCvProvidersConfigured,
} from './form-utils';
import { MIN_BULK_CV_PROVIDERS_CONFIGURED } from '@/lib/cv-processing/config';
import {
  BULK_CV_PROVIDER_FIELDS,
  type BulkCvAiFormValues,
} from './types';
import BulkProviderSlotCard from './provider-slot-card';
import { Info, Loader2 } from 'lucide-react';
import type { DiscoveredProviderModel } from '@/lib/ai-providers/gemini-model-discovery';

type ProviderVerifiedMap = Record<BulkCvProviderId, boolean>;
type CachedDiscoveredModels = {
  apiKey: string;
  models: DiscoveredProviderModel[];
};
type RetainFlagsKey =
  | 'retainGroqApiKey'
  | 'retainGeminiApiKey'
  | 'retainDeepseekApiKey'
  | 'retainOpenrouterApiKey'
  | 'retainCerebrasApiKey'
  | 'retainMistralApiKey';

const RETAIN_KEY_BY_PROVIDER: Record<BulkCvProviderId, RetainFlagsKey> = {
  groq: 'retainGroqApiKey',
  gemini: 'retainGeminiApiKey',
  deepseek: 'retainDeepseekApiKey',
  openrouter: 'retainOpenrouterApiKey',
  cerebras: 'retainCerebrasApiKey',
  mistral: 'retainMistralApiKey',
};

function formatSlot(
  apiKey: string,
  modelField: string,
  customModel: string,
): IBulkCvAiProviderSlot {
  if (modelField === 'custom') {
    return {
      api_key: apiKey.trim(),
      model: customModel.trim(),
      customModel: customModel.trim(),
    };
  }
  return {
    api_key: apiKey.trim(),
    model: modelField.trim(),
    customModel: '',
  };
}

interface BulkCvAiFormProps {
  initialValues: BulkCvAiFormValues;
  onClose: () => void;
  onRefetch: () => void;
  embedded?: boolean;
}

/** True if the initial form value's API key field is non-empty. */
function readInitialVerifiedMap(
  initialValues: BulkCvAiFormValues,
): ProviderVerifiedMap {
  const result: Partial<ProviderVerifiedMap> = {};
  for (const f of BULK_CV_PROVIDER_FIELDS) {
    const value = String(initialValues[f.apiKeyField] ?? '').trim();
    result[f.id] = Boolean(value);
  }
  return result as ProviderVerifiedMap;
}

function getInitiallyVisibleProviderIds(
  initialValues: BulkCvAiFormValues,
): BulkCvProviderId[] {
  return getConfiguredBulkCvProviderIds(initialValues, initialValues);
}

function isSaveBlocked(
  formik: FormikProps<BulkCvAiFormValues>,
  verified: ProviderVerifiedMap,
  initialValues: BulkCvAiFormValues,
): boolean {
  if (formik.values.cvUploadPool === 'premium') {
    return false;
  }
  if (!meetsMinBulkCvProvidersConfigured(formik.values, initialValues)) {
    return true;
  }
  const configured = getConfiguredBulkCvProviderIds(
    formik.values,
    initialValues,
  );
  const verifiedCount = configured.filter((id) => verified[id]).length;
  return verifiedCount < MIN_BULK_CV_PROVIDERS_CONFIGURED;
}

export default function BulkCvAiForm({
  initialValues,
  onClose,
  onRefetch,
  embedded = false,
}: BulkCvAiFormProps) {
  const { toast } = useToast();
  const [updateBulkCvAi, { isLoading: isSaving }] =
    useUpdateBulkCvAiConfigsMutation();
  const [validateBulkCvAi] = useValidateBulkCvAiMutation();

  const validationSchema = useMemo(
    () => createBulkCvAiSchema(initialValues),
    [initialValues],
  );

  // Saved keys are treated as already-verified. Editing the key/model resets
  // the matching entry to `false`, forcing a fresh Verify before Save.
  const [verified, setVerified] = useState<ProviderVerifiedMap>(() =>
    readInitialVerifiedMap(initialValues),
  );
  const [pendingProviderToAdd, setPendingProviderToAdd] = useState<
    BulkCvProviderId | ''
  >('');
  const [availableModelsByProvider, setAvailableModelsByProvider] = useState<
    Partial<Record<BulkCvProviderId, DiscoveredProviderModel[]>>
  >({});
  const [validatingProviderId, setValidatingProviderId] = useState<
    BulkCvProviderId | null
  >(null);
  const [visibleProviderIds, setVisibleProviderIds] = useState<BulkCvProviderId[]>(
    () => getInitiallyVisibleProviderIds(initialValues),
  );
  const discoveredModelsCacheRef = useRef<
    Partial<Record<BulkCvProviderId, CachedDiscoveredModels>>
  >({});

  // Re-seed when the parent refetches and Formik re-initializes.
  useEffect(() => {
    setVerified(readInitialVerifiedMap(initialValues));
    setVisibleProviderIds(getInitiallyVisibleProviderIds(initialValues));
    setPendingProviderToAdd('');
    setAvailableModelsByProvider({});
    discoveredModelsCacheRef.current = {};
  }, [
    initialValues.groq_api_key,
    initialValues.gemini_api_key,
    initialValues.deepseek_api_key,
    initialValues.openrouter_api_key,
    initialValues.cerebras_api_key,
    initialValues.mistral_api_key,
    initialValues,
  ]);

  const formikRef = useRef<FormikProps<BulkCvAiFormValues> | null>(null);

  const cacheDiscoveredModels = (
    id: BulkCvProviderId,
    apiKey: string,
    models: DiscoveredProviderModel[],
  ) => {
    discoveredModelsCacheRef.current[id] = {
      apiKey: apiKey.trim(),
      models,
    };
  };

  const getCachedDiscoveredModels = (
    id: BulkCvProviderId,
    apiKey: string,
  ): DiscoveredProviderModel[] | null => {
    const cacheEntry = discoveredModelsCacheRef.current[id];
    if (!cacheEntry || cacheEntry.apiKey !== apiKey.trim()) {
      return null;
    }

    return cacheEntry.models;
  };

  const clearProviderModelOptions = (id: BulkCvProviderId) =>
    setAvailableModelsByProvider((prev) => {
      if (!prev[id]) {
        return prev;
      }

      const next = { ...prev };
      delete next[id];
      return next;
    });

  const handleProviderApiKeyChange = (id: BulkCvProviderId) => {
    clearProviderModelOptions(id);
    setVerified((prev) => ({ ...prev, [id]: false }));
  };

  const markUnverified = (id: BulkCvProviderId) => {
    setVerified((prev) => ({ ...prev, [id]: false }));
  };

  const verifyProvider = async ({
    provider,
    apiKey,
    model,
  }: {
    provider: BulkCvProviderId;
    apiKey: string;
    model: string;
  }, options?: { silent?: boolean }) => {
    setValidatingProviderId(provider);

    try {
      const res = await validateBulkCvAi({ provider, apiKey, model }).unwrap();

      if (res.availableModels?.length) {
        cacheDiscoveredModels(provider, apiKey, res.availableModels);
        setAvailableModelsByProvider((prev) => ({
          ...prev,
          [provider]: res.availableModels,
        }));
      }

      if (res.isValid && res.model && res.model !== model) {
        const providerField = BULK_CV_PROVIDER_FIELDS.find(
          (field) => field.id === provider,
        );
        const isSelectableModel = Boolean(
          res.availableModels?.some((modelInfo) => modelInfo.id === res.model)
          || getProviderModels(provider).some(
            (modelInfo) => modelInfo.id === res.model,
          ),
        );

        if (providerField && formikRef.current) {
          void formikRef.current.setFieldValue(
            providerField.modelField,
            isSelectableModel ? res.model : 'custom',
          );
          void formikRef.current.setFieldValue(
            providerField.customModelField,
            isSelectableModel ? '' : res.model,
          );
        }
      }

      if (res.isValid) {
        setVerified((prev) => ({ ...prev, [provider]: true }));
        if (!options?.silent) {
          toast({
            title: `${BULK_CV_PROVIDER_LABELS[provider]} key OK`,
            description: res.message,
          });
        }
      } else {
        setVerified((prev) => ({ ...prev, [provider]: false }));
        if (!options?.silent) {
          toast({
            title: 'Invalid',
            description: res.error || 'Verification failed',
            variant: 'destructive',
          });
        }
      }
    } catch {
      setVerified((prev) => ({ ...prev, [provider]: false }));
      if (!options?.silent) {
        toast({
          title: 'Error',
          description: `Could not verify ${provider} key`,
          variant: 'destructive',
        });
      }
    } finally {
      setValidatingProviderId((currentProviderId) =>
        currentProviderId === provider ? null : currentProviderId,
      );
    }
  };

  return (
    <Formik<BulkCvAiFormValues>
      innerRef={formikRef}
      initialValues={initialValues}
      validationSchema={validationSchema}
      enableReinitialize
      validateOnChange
      validateOnBlur
      onSubmit={async (values) => {
        try {
          const retainFlags: Partial<Record<RetainFlagsKey, boolean>> = {};
          for (const f of BULK_CV_PROVIDER_FIELDS) {
            retainFlags[RETAIN_KEY_BY_PROVIDER[f.id]] =
              values[f.apiKeyField] === initialValues[f.apiKeyField];
          }

          const bulkCvAi: IBulkCvAi = {
            cvUploadPool: values.cvUploadPool,
            doclingParseUrl: values.doclingParseUrl.trim(),
            groq: formatSlot(
              values.groq_api_key,
              values.groq_model,
              values.groq_custom_model,
            ),
            gemini: formatSlot(
              values.gemini_api_key,
              values.gemini_model,
              values.gemini_custom_model,
            ),
            deepseek: formatSlot(
              values.deepseek_api_key,
              values.deepseek_model,
              values.deepseek_custom_model,
            ),
            openrouter: formatSlot(
              values.openrouter_api_key,
              values.openrouter_model,
              values.openrouter_custom_model,
            ),
            cerebras: formatSlot(
              values.cerebras_api_key,
              values.cerebras_model,
              values.cerebras_custom_model,
            ),
            mistral: formatSlot(
              values.mistral_api_key,
              values.mistral_model,
              values.mistral_custom_model,
            ),
          };

          await updateBulkCvAi({ bulkCvAi, ...retainFlags }).unwrap();
          toast({
            title: 'Saved',
            description: 'Bulk CV AI settings updated.',
          });
          onRefetch();
          onClose();
        } catch (e) {
          const msg =
            e && typeof e === 'object' && 'data' in e
              ? String(
                (e as { data?: { error?: string } }).data?.error ||
                'Failed to save',
              )
              : 'Failed to save';
          toast({
            title: 'Error',
            description: msg,
            variant: 'destructive',
          });
        }
      }}
    >
      {(formik) => {
        const saveBlocked = isSaveBlocked(formik, verified, initialValues);
        const isBulkPool = formik.values.cvUploadPool === 'bulk';
        const showMinProvidersHint =
          isBulkPool &&
          !meetsMinBulkCvProvidersConfigured(formik.values, initialValues);
        const visibleProviderFields = BULK_CV_PROVIDER_FIELDS.filter((field) =>
          visibleProviderIds.includes(field.id),
        );
        const availableProviderFields = BULK_CV_PROVIDER_FIELDS.filter(
          (field) => !visibleProviderIds.includes(field.id),
        );
        const canAddProvider =
          pendingProviderToAdd !== '' &&
          availableProviderFields.some((field) => field.id === pendingProviderToAdd);

        return (
          <Form
            className={`flex flex-col gap-4  h-full overflow-y-scroll ${embedded ? 'px-6 pb-6' : 'px-6 pb-6'}`}
          >
            <div className="flex flex-col gap-4 mb-[80px]">
              <div className="rounded-lg border border-border/80 bg-muted/20 p-4 space-y-3">
                <div>
                  <Label className="text-sm font-medium">
                    CV upload parsing mode
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick one approach for dashboard CV uploads. This is separate
                    from candidate evaluation AI under AI Providers.
                  </p>
                </div>
                <RadioGroup
                  value={formik.values.cvUploadPool}
                  onValueChange={(value) => {
                    void formik.setFieldValue('cvUploadPool', value as CvUploadPool);
                  }}
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {(['bulk', 'premium'] as const).map((pool) => (
                    <label
                      key={pool}
                      htmlFor={`cv-upload-pool-${pool}`}
                      className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 bg-background px-3 py-3 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary"
                    >
                      <RadioGroupItem
                        id={`cv-upload-pool-${pool}`}
                        value={pool}
                        className="mt-0.5 shrink-0"
                      />
                      <span className="flex min-w-0 flex-col gap-1 w-full">
                        <span className="flex items-center gap-1 text-sm font-medium leading-snug relative  w-full justify-between">
                          <p>
                            {CV_UPLOAD_POOL_LABELS[pool]}

                          </p>
                          <span className="relative flex items-center group">
                            <Info className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-primary focus:text-primary" />
                            <div className="absolute z-20  -translate-x-[210px] top-6 min-w-[270px] max-w-xs px-3 py-2 text-xs rounded bg-muted/90 text-foreground shadow-lg border border-border pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                              role="tooltip"
                            >
                              {CV_UPLOAD_POOL_DESCRIPTIONS[pool]}
                            </div>
                          </span>
                        </span>
                      </span>
                    </label>

                  ))}
                </RadioGroup>
              </div>

              {isBulkPool ? (
                <p className="text-muted-foreground text-sm">
                  {MIN_BULK_CV_PROVIDERS_MESSAGE} Uploads rotate across the keys
                  you configure below.
                </p>
              ) : null}
              {showMinProvidersHint && formik.submitCount > 0 && (
                <p className="text-destructive text-sm" role="alert">
                  {MIN_BULK_CV_PROVIDERS_MESSAGE}
                </p>
              )}

              {isBulkPool ? (
                <p className="text-sm font-medium text-foreground">
                  Provider API keys
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Provider API keys (optional — not used while Main AI provider is
                  selected)
                </p>
              )}

              <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="w-full sm:max-w-xs">
                    <Select
                      value={pendingProviderToAdd}
                      onValueChange={(value) =>
                        setPendingProviderToAdd(value as BulkCvProviderId)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select provider to add" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviderFields.map((field) => (
                          <SelectItem key={field.id} value={field.id}>
                            {field.label}
                          </SelectItem>
                        ))}
                        {
                          availableProviderFields.length === 0 && (
                            <SelectItem value="no-more-providers" disabled>
                              <div className="flex items-center gap-2">
                                No more providers available
                              </div>
                            </SelectItem>
                          )
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canAddProvider}
                    onClick={() => {
                      if (!canAddProvider) {
                        return;
                      }
                      setVisibleProviderIds((prev) => [...prev, pendingProviderToAdd]);
                      setPendingProviderToAdd('');
                    }}
                  >
                    Add provider
                  </Button>
                </div>
                {visibleProviderFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No verified providers in the pool yet. Add a provider to start
                    configuring the pool.
                  </p>
                ) : null}
              </div>

              <div
                className={`grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 ${isBulkPool ? '' : 'opacity-60'}`}
              >
                {visibleProviderFields.map((field) => (
                  <BulkProviderSlotCard
                    key={field.id}
                    field={field}
                    formik={formik}
                    verified={Boolean(verified[field.id])}
                    isValidating={validatingProviderId === field.id}
                    modelOptions={availableModelsByProvider[field.id]}
                    onApiKeyChange={() => handleProviderApiKeyChange(field.id)}
                    onMarkUnverified={() => markUnverified(field.id)}
                    onOpenModelSelect={() => {
                      if (field.id !== 'gemini') {
                        return;
                      }

                      const apiKey = String(
                        formik.values[field.apiKeyField] ?? '',
                      ).trim();

                      if (!apiKey) {
                        return;
                      }

                      const cachedModels = getCachedDiscoveredModels(
                        field.id,
                        apiKey,
                      );

                      if (cachedModels?.length) {
                        setAvailableModelsByProvider((prev) => ({
                          ...prev,
                          [field.id]: cachedModels,
                        }));
                        return;
                      }

                      clearProviderModelOptions(field.id);

                      void verifyProvider(
                        {
                          provider: field.id,
                          apiKey,
                          model:
                            String(formik.values[field.modelField] ?? '') === 'custom'
                              ? String(
                                formik.values[field.customModelField] ?? '',
                              ).trim()
                              : String(formik.values[field.modelField] ?? ''),
                        },
                        { silent: true },
                      );
                    }}
                    onRemove={() => {
                      const defaultModel = getProviderModels(field.id)[0]?.id ?? '';
                      setVisibleProviderIds((prev) =>
                        prev.filter((providerId) => providerId !== field.id),
                      );
                      setVerified((prev) => ({ ...prev, [field.id]: false }));
                      void formik.setValues({
                        ...formik.values,
                        [field.apiKeyField]: '',
                        [field.modelField]: defaultModel,
                        [field.customModelField]: '',
                      });
                    }}
                    onVerify={verifyProvider}
                  />
                ))}
              </div>

              <Card className="mt-2">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Pool Setup Guidance
                    </p>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>
                        Bulk CV uploads rotate across the configured providers in
                        this pool.
                      </li>
                      <li>
                        At least two configured providers are recommended so the
                        pool can continue when one key or model becomes
                        unavailable.
                      </li>
                      <li>
                        Verify each provider after changing its API key or model
                        before saving the pool.
                      </li>
                      <li>
                        Gemini models are discovered live from Google when you
                        open the model dropdown with a valid API key.
                      </li>
                      <li>
                        Use the provider links above each card to get API keys
                        and check the latest official model list.
                      </li>
                      <li>
                        When Main AI provider mode is selected, these pool keys
                        remain saved but are not used for CV uploads.
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex flex-row gap-2 pt-2 fixed left-0 p-4 border border-top w-full justify-between bottom-0 bg-background">
              <div></div>

              <div className='flex flex-row gap-2 mt-2'>
                {(
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isSaving || saveBlocked}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>

              </div>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
