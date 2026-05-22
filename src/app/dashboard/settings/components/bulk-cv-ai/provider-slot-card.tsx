'use client';

import React from 'react';
import type { FormikProps } from 'formik';
import { Loader2 } from 'lucide-react';
import { PasswordToggleInput } from '../shared/password-toggle-input';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
  onMarkUnverified: () => void;
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
  onMarkUnverified,
  onVerify,
}: BulkProviderSlotCardProps) {
  const apiKeyValue = String(formik.values[field.apiKeyField] ?? '');
  const modelValue = String(formik.values[field.modelField] ?? '');
  const customModelValue = String(formik.values[field.customModelField] ?? '');
  const models = getProviderModels(field.id);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{field.label}</span>
          {verified && apiKeyValue.trim() ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              Verified
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`${field.id}-key`}>API key</Label>
          <PasswordToggleInput
            id={`${field.id}-key`}
            name={field.apiKeyField}
            value={apiKeyValue}
            onChange={(e) => {
              onMarkUnverified();
              formik.handleChange(e);
            }}
            placeholder={field.apiKeyPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label>Model</Label>
          <Select
            value={modelValue}
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
              onChange={formik.handleChange}
              placeholder={field.customModelPlaceholder}
            />
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
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
      </CardContent>
    </Card>
  );
}
