'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Form, Formik, type FormikProps } from 'formik';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import type {
  BulkCvProviderId,
  IBulkCvAi,
  IBulkCvAiProviderSlot,
} from '@/lib/types/bulk-cv-ai';
import {
  useUpdateBulkCvAiConfigsMutation,
  useValidateBulkCvAiMutation,
} from '@/lib/features/settings';
import { BULK_CV_PROVIDER_LABELS } from '@/lib/cv-processing/config';
import { createBulkCvAiSchema } from './schema';
import {
  getConfiguredBulkCvProviderIds,
  MIN_BULK_CV_PROVIDERS_MESSAGE,
  meetsMinBulkCvProvidersConfigured,
} from './form-utils';
import {
  BULK_CV_PROVIDER_FIELDS,
  type BulkCvAiFormValues,
} from './types';
import BulkProviderSlotCard from './provider-slot-card';
import { Loader2 } from 'lucide-react';

type ProviderVerifiedMap = Record<BulkCvProviderId, boolean>;
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

function isSaveBlocked(
  formik: FormikProps<BulkCvAiFormValues>,
  verified: ProviderVerifiedMap,
  initialValues: BulkCvAiFormValues,
): boolean {
  if (!meetsMinBulkCvProvidersConfigured(formik.values, initialValues)) {
    return true;
  }
  const configured = getConfiguredBulkCvProviderIds(
    formik.values,
    initialValues,
  );
  return configured.some((id) => !verified[id]);
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
  const [validateBulkCvAi, { isLoading: isValidatingKey }] =
    useValidateBulkCvAiMutation();

  const validationSchema = useMemo(
    () => createBulkCvAiSchema(initialValues),
    [initialValues],
  );

  // Saved keys are treated as already-verified. Editing the key/model resets
  // the matching entry to `false`, forcing a fresh Verify before Save.
  const [verified, setVerified] = useState<ProviderVerifiedMap>(() =>
    readInitialVerifiedMap(initialValues),
  );

  // Re-seed when the parent refetches and Formik re-initializes.
  useEffect(() => {
    setVerified(readInitialVerifiedMap(initialValues));
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

  const markUnverified = (id: BulkCvProviderId) =>
    setVerified((prev) => ({ ...prev, [id]: false }));

  const verifyProvider = async ({
    provider,
    apiKey,
    model,
  }: {
    provider: BulkCvProviderId;
    apiKey: string;
    model: string;
  }) => {
    try {
      const res = await validateBulkCvAi({ provider, apiKey, model }).unwrap();
      if (res.isValid) {
        setVerified((prev) => ({ ...prev, [provider]: true }));
        toast({
          title: `${BULK_CV_PROVIDER_LABELS[provider]} key OK`,
          description: res.message,
        });
      } else {
        setVerified((prev) => ({ ...prev, [provider]: false }));
        toast({
          title: 'Invalid',
          description: res.error || 'Verification failed',
          variant: 'destructive',
        });
      }
    } catch {
      setVerified((prev) => ({ ...prev, [provider]: false }));
      toast({
        title: 'Error',
        description: `Could not verify ${provider} key`,
        variant: 'destructive',
      });
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
        const showMinProvidersHint =
          !meetsMinBulkCvProvidersConfigured(formik.values, initialValues);

        return (
          <Form
            className={`flex flex-col gap-4  h-full overflow-y-scroll ${embedded ? 'px-6 pb-6' : 'px-6 pb-6'}`}
          >
            <div className="flex flex-col gap-4 mb-[80px]">
              <p className="text-muted-foreground text-sm">
                {MIN_BULK_CV_PROVIDERS_MESSAGE} Bulk uploads round-robin across
                configured providers.
              </p>
              {showMinProvidersHint && formik.submitCount > 0 && (
                <p className="text-destructive text-sm" role="alert">
                  {MIN_BULK_CV_PROVIDERS_MESSAGE}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {BULK_CV_PROVIDER_FIELDS.map((field) => (
                  <BulkProviderSlotCard
                    key={field.id}
                    field={field}
                    formik={formik}
                    verified={Boolean(verified[field.id])}
                    isValidating={isValidatingKey}
                    onMarkUnverified={() => markUnverified(field.id)}
                    onVerify={verifyProvider}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-row gap-2 pt-2 fixed left-0 p-6 border border-top w-full justify-between bottom-0 bg-background">
              <div />

              {!embedded && (
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
          </Form>
        );
      }}
    </Formik>
  );
}
