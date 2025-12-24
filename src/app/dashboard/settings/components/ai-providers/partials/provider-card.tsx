import React from 'react';
import { FormikProps, ErrorMessage } from 'formik';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { getProviderModels } from '@/lib/ai-providers/models-config';
import { AIProvidersValues, ProviderConfigItem } from '../types';
import { getProviderIcon } from '../utils';

interface ProviderCardProps {
  config: ProviderConfigItem;
  formik: FormikProps<AIProvidersValues>;
  primaryColor: string;
  isUpdating: boolean;
  verificationStatus: 'idle' | 'loading' | 'success' | 'error';
  verificationMessage?: string;
  showApiKey: boolean;
  onVerify: (apiKey: string, model: string) => void;
  onToggleVisibility: () => void;
}
/* eslint-disable max-lines */
export function ProviderCard({
  config,
  formik,
  primaryColor,
  isUpdating,
  verificationStatus,
  verificationMessage,
  showApiKey,
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
  const apiKeyValue = values[apiKeyField] || '';
  const modelValue = values[modelField] || '';
  const customModelValue = values[customModelField] || '';
  const providerModels = getProviderModels(provider);

  const getVerificationIcon = () => {
    switch (verificationStatus) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getVerificationStatusColor = () => {
    switch (verificationStatus) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const activeStyle = isActive
    ? ({
        borderColor: `${primaryColor}80`,
        backgroundColor: `${primaryColor}0D`,
        '--tw-ring-color': `${primaryColor}33`,
      } as React.CSSProperties)
    : {};

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
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getVerificationIcon()}
            <Button
              type="button"
              variant={isActive ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFieldValue('activeProvider', provider)}
              disabled={formik.isSubmitting || isUpdating}
            >
              {isActive ? 'Active' : 'Make Active'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* API Key Field */}
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
                errors[apiKeyField] && touched[apiKeyField]
                  ? 'border-destructive focus-visible:ring-destructive'
                  : ''
              }`}
              style={isActive && !errors[apiKeyField] ? activeStyle : {}}
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
                onClick={() => {
                  const finalModel =
                    modelValue === 'custom' ? customModelValue : modelValue;
                  onVerify(apiKeyValue, finalModel);
                }}
                disabled={
                  verificationStatus === 'loading' ||
                  !apiKeyValue.trim() ||
                  (modelValue === 'custom' && !customModelValue.trim())
                }
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
            <p className={`text-xs ${getVerificationStatusColor()}`}>
              {verificationMessage}
            </p>
          )}
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label htmlFor={modelField} className="text-sm font-medium">
            Model
          </Label>
          <Select
            value={modelValue}
            onValueChange={(value) => setFieldValue(modelField, value)}
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

        {/* Custom Model Input */}
        {modelValue === 'custom' && (
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
              className={
                errors[customModelField] && touched[customModelField]
                  ? 'border-destructive'
                  : ''
              }
            />
            <p className="text-xs text-gray-500">
              Enter the exact model name as specified by the AI provider&apos;s
              API documentation.
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
                You&apos;re using a custom model. Please ensure the model name
                is correct and supported by the provider&apos;s API.
                Capabilities and features may vary depending on the specific
                model you specify.
              </p>
            </div>
          </div>
        )}

        {/* Capabilities Display */}
        {modelValue && modelValue !== 'custom' && (
          <div className="mt-4 rounded-lg bg-white p-3 dark:bg-black">
            <h4 className="mb-2 text-sm font-medium">Model Capabilities</h4>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const modelInfo = providerModels.find(
                  (m) => m.id === modelValue,
                );
                if (!modelInfo) return null;
                const caps = modelInfo.capabilities;
                return (
                  <>
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
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
