'use client';

import React from 'react';
import type { FormikProps } from 'formik';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { PasswordToggleInput } from '../shared/password-toggle-input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getProviderModels } from '@/lib/ai-providers/models-config';
import type { DiscoveredProviderModel } from '@/lib/ai-providers/gemini-model-discovery';
import {
  PROVIDER_API_KEY_DOC_URLS,
  PROVIDER_MODEL_DOC_URLS,
} from '@/lib/ai-providers/provider-doc-links';
import type { BulkCvProviderId } from '@/lib/types/bulk-cv-ai';
import type {
  BulkCvAiFormValues,
  BulkCvProviderFormField,
} from './types';

export interface BulkProviderSlotCardProps {
  field: BulkCvProviderFormField;
  formik: FormikProps<BulkCvAiFormValues>;
  verified: boolean;
  isValidating: boolean;
  modelOptions?: DiscoveredProviderModel[];
  onApiKeyChange: () => void;
  onMarkUnverified: () => void;
  onOpenModelSelect?: () => void;
  onRemove: () => void;
  onVerify: (params: {
    provider: BulkCvProviderId;
    apiKey: string;
    model: string;
  }) => Promise<void>;
}

/**
 * Stateless card for a single bulk-CV-AI provider slot.
 *
 * Decoupled from the form's submit/save logic so the parent owns the
 * `verified` boolean per slot and the validate-API call: this card just
 * renders inputs and forwards events.
 */
export default function BulkProviderSlotCard({
  field,
  formik,
  verified,
  isValidating,
  modelOptions,
  onApiKeyChange,
  onMarkUnverified,
  onOpenModelSelect,
  onRemove,
  onVerify,
}: BulkProviderSlotCardProps) {
  const apiKeyValue = String(formik.values[field.apiKeyField] ?? '');
  const modelValue = String(formik.values[field.modelField] ?? '');
  const customModelValue = String(formik.values[field.customModelField] ?? '');
  const knownModels = getProviderModels(field.id);
  const models = modelOptions?.length
    ? modelOptions.map((modelOption) => ({
        id: modelOption.id,
        name: modelOption.name,
      }))
    : knownModels.map((modelInfo) => ({
        id: modelInfo.id,
        name: modelInfo.name,
      }));

  return (
    <Card className="h-[100%]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{field.label}</CardTitle>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <a
                href={PROVIDER_API_KEY_DOC_URLS[field.id] ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Get API key
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={PROVIDER_MODEL_DOC_URLS[field.id]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
              >
                View models
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {verified && apiKeyValue.trim() ? (
              <span className="rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Verified
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onRemove}
              aria-label={`Remove ${field.label} provider`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex flex-col justify-between">


        <div className="space-y-2">
          <Label htmlFor={`${field.id}-key`}>API key</Label>
          <PasswordToggleInput
            id={`${field.id}-key`}
            name={field.apiKeyField}
            value={apiKeyValue}
            onChange={(e) => {
              onApiKeyChange();
              formik.handleChange(e);
            }}
            placeholder={field.apiKeyPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={modelValue}
            onOpenChange={(open) => {
              if (open) {
                onOpenModelSelect?.();
              }
            }}
            onValueChange={(v) => {
              onMarkUnverified();
              formik.setFieldValue(field.modelField, v);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom model id…</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {modelValue === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor={`${field.id}-custom`}>Custom model id</Label>
            <Input
              id={`${field.id}-custom`}
              name={field.customModelField}
              value={customModelValue}
              onChange={(e) => {
                onMarkUnverified();
                formik.handleChange(e);
              }}
              placeholder={field.customModelPlaceholder}
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="">
        <Button
          type="button"
          variant="secondary"
          className="w-full bottom-0 left-0 right-0"
          disabled={isValidating || !apiKeyValue.trim()}
          onClick={() =>
            onVerify({
              provider: field.id,
              apiKey: apiKeyValue.trim(),
              model:
                modelValue === 'custom' ? customModelValue.trim() : modelValue,
            })
          }
        >
          {isValidating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Verify {field.label}
        </Button>

      </CardFooter>
    </Card>
  );
}
