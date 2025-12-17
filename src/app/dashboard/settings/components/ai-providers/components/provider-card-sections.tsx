import React from 'react';
import { ErrorMessage } from 'formik';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { getProviderModels } from '@/lib/ai-providers/models-config';
import { FormFieldName } from '../types';
import { VerificationStatus } from './provider-card-header-actions';

function getVerificationStatusColor(status: VerificationStatus) {
  switch (status) {
    case 'success':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

type ApiKeySectionProps = {
  apiKeyField: FormFieldName;
  apiKeyValue: string;
  placeholder: string;
  showApiKey: boolean;
  onToggleVisibility: () => void;
  onVerify: (apiKey: string, model: string) => void;
  verificationStatus: VerificationStatus;
  verificationMessage?: string;
  isActive: boolean;
  activeStyle: React.CSSProperties;
  isVerifyingDisabled: boolean;
  finalModelForVerification: string;
  hasError: boolean;
  handleChange: React.ChangeEventHandler<HTMLInputElement>;
  handleBlur: React.FocusEventHandler<HTMLInputElement>;
};

export function ApiKeySection({
  apiKeyField,
  apiKeyValue,
  placeholder,
  showApiKey,
  onToggleVisibility,
  onVerify,
  verificationStatus,
  verificationMessage,
  isActive,
  activeStyle,
  isVerifyingDisabled,
  finalModelForVerification,
  hasError,
  handleChange,
  handleBlur,
}: ApiKeySectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={apiKeyField} className="text-sm font-medium">
        API Key
      </Label>
      <div className="relative">
        <Input
          id={apiKeyField}
          name={apiKeyField}
          type={showApiKey ? 'text' : 'password'}
          value={apiKeyValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`pr-20 ${
            hasError ? 'border-destructive focus-visible:ring-destructive' : ''
          }`}
          style={isActive && !hasError ? activeStyle : {}}
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={onToggleVisibility}
          >
            {showApiKey ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onVerify(apiKeyValue, finalModelForVerification)}
            disabled={verificationStatus === 'loading' || isVerifyingDisabled}
          >
            Verify
          </Button>
        </div>
      </div>
      <ErrorMessage
        name={apiKeyField}
        component="div"
        className="text-sm text-red-500"
      />
      {verificationMessage && (
        <p
          className={`text-xs ${getVerificationStatusColor(verificationStatus)}`}
        >
          {verificationMessage}
        </p>
      )}
    </div>
  );
}

type ModelSelectSectionProps = {
  provider: string;
  modelField: FormFieldName;
  modelValue: string;
  setFieldValue: (field: string, value: string) => void;
};

export function ModelSelectSection({
  provider,
  modelField,
  modelValue,
  setFieldValue,
}: ModelSelectSectionProps) {
  const providerModels = getProviderModels(provider);

  return (
    <div className="space-y-2">
      <Label htmlFor={modelField} className="text-sm font-medium">
        Model
      </Label>
      <Select
        value={modelValue}
        onValueChange={(v) => setFieldValue(modelField, v)}
      >
        <SelectTrigger className="h-[60px]">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="max-h-96">
          {providerModels.map((modelInfo) => (
            <SelectItem
              key={modelInfo.id}
              value={modelInfo.id}
              className="py-3"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  {modelInfo.name}
                  {modelInfo.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {modelInfo.isDeprecated && (
                    <Badge variant="destructive" className="text-xs">
                      Deprecated
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {modelInfo.capabilities.costTier}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">
                  {modelInfo.capabilities.description}
                </p>
              </div>
            </SelectItem>
          ))}
          <SelectItem value="custom" className="py-3">
            <div className="flex items-center gap-2">
              Custom
              <Badge variant="outline" className="text-xs">
                Advanced
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <ErrorMessage
        name={modelField}
        component="div"
        className="text-sm text-red-500"
      />
    </div>
  );
}

type CustomModelSectionProps = {
  customModelField: FormFieldName;
  customModelValue: string;
  hasError: boolean;
  handleChange: React.ChangeEventHandler<HTMLInputElement>;
  handleBlur: React.FocusEventHandler<HTMLInputElement>;
};

export function CustomModelSection({
  customModelField,
  customModelValue,
  hasError,
  handleChange,
  handleBlur,
}: CustomModelSectionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={customModelField} className="text-sm font-medium">
        Custom Model Name <span className="text-red-500">*</span>
      </Label>
      <Input
        id={customModelField}
        name={customModelField}
        placeholder="Enter custom model name..."
        value={customModelValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={hasError ? 'border-destructive' : ''}
      />
      <p className="text-xs text-gray-500">
        Enter the exact model name as specified by the AI provider&apos;s API
        documentation.
      </p>
      <ErrorMessage
        name={customModelField}
        component="div"
        className="text-sm text-red-500"
      />

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
        <h4 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
          Custom Model
        </h4>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          You&apos;re using a custom model. Please ensure the model name is
          correct and supported by the provider&apos;s API. Capabilities and
          features may vary depending on the specific model you specify.
        </p>
      </div>
    </div>
  );
}

export function CapabilitiesSection({
  provider,
  modelValue,
}: {
  provider: string;
  modelValue: string;
}) {
  const providerModels = getProviderModels(provider);
  const modelInfo = providerModels.find((m) => m.id === modelValue);
  if (!modelInfo) return null;

  const caps = modelInfo.capabilities;
  return (
    <div className="mt-4 rounded-lg bg-white p-3 dark:bg-black">
      <h4 className="mb-2 text-sm font-medium">Model Capabilities</h4>
      <div className="flex flex-wrap gap-2">
        {caps.supportsPDF && (
          <Badge variant="outline" className="text-xs">
            PDF Support
          </Badge>
        )}
        {caps.supportsVision && (
          <Badge variant="outline" className="text-xs">
            Vision
          </Badge>
        )}
        {caps.supportsJSON && (
          <Badge variant="outline" className="text-xs">
            JSON Mode
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {caps.maxTokens.toLocaleString()} tokens
        </Badge>
      </div>
    </div>
  );
}
