"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetAIProvidersConfigsQuery,
  useUpdateAIProvidersMutation,
  useGetPortalConfigsQuery,
} from "@/lib/features/settings/settingsApi";
import React, { useState, useEffect } from "react";
import { AIProviderFactory, AIProviderType } from "@/lib/ai-providers";
import { CheckCircle, XCircle, Loader2, Eye, EyeOff, Bot, Key, Shield } from "lucide-react";
import { getDefaultModel, getProviderModels } from "@/lib/ai-providers/models-config";

export interface AIProvidersValues {
  activeProvider: AIProviderType;
  gemini_api_key: string;
  gemini_model: string;
  gemini_custom_model: string;
  openai_api_key: string;
  openai_model: string;
  openai_custom_model: string;
  anthropic_api_key: string;
  anthropic_model: string;
  anthropic_custom_model: string;
  perplexity_api_key: string;
  perplexity_model: string;
  perplexity_custom_model: string;
}

type FormFieldName = keyof Omit<AIProvidersValues, 'activeProvider'>;

export default function AIProvidersConfigs({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useGetAIProvidersConfigsQuery(undefined);
  const { data: portalData } = useGetPortalConfigsQuery(undefined);
  const [updateAIProviders, { isLoading: isUpdating }] = useUpdateAIProvidersMutation();

  // State for API key verification
  const [verificationStatus, setVerificationStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [verificationMessages, setVerificationMessages] = useState<Record<string, string>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [primaryColor, setPrimaryColor] = useState<string>('#6366f1');

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  // Update primary color when portal data changes
  useEffect(() => {
    if (portalData?.primaryColor) {
      setPrimaryColor(portalData.primaryColor);
    }
  }, [portalData]);

  // Helper function to determine if a model is custom or predefined
  const getModelDisplayValue = (provider: string, modelValue: string, customValue: string) => {
    const providerModels = getProviderModels(provider);
    const isKnownModel = providerModels.some(m => m.id === modelValue);

    // If it's not a known model and there's a custom value, it means this is a custom model
    if (!isKnownModel && customValue) {
      return "custom";
    }

    return modelValue || getDefaultModel(provider);
  };

  const initialValues: AIProvidersValues = {
    activeProvider: data?.aiProviders?.activeProvider ?? "gemini",
    gemini_api_key: data?.aiProviders?.gemini?.api_key ?? "",
    gemini_model: getModelDisplayValue("gemini", data?.aiProviders?.gemini?.model ?? "", data?.aiProviders?.gemini?.customModel ?? ""),
    gemini_custom_model: data?.aiProviders?.gemini?.customModel ?? "",
    openai_api_key: data?.aiProviders?.openai?.api_key ?? "",
    openai_model: getModelDisplayValue("openai", data?.aiProviders?.openai?.model ?? "", data?.aiProviders?.openai?.customModel ?? ""),
    openai_custom_model: data?.aiProviders?.openai?.customModel ?? "",
    anthropic_api_key: data?.aiProviders?.anthropic?.api_key ?? "",
    anthropic_model: getModelDisplayValue("anthropic", data?.aiProviders?.anthropic?.model ?? "", data?.aiProviders?.anthropic?.customModel ?? ""),
    anthropic_custom_model: data?.aiProviders?.anthropic?.customModel ?? "",
    perplexity_api_key: data?.aiProviders?.perplexity?.api_key ?? "",
    perplexity_model: getModelDisplayValue("perplexity", data?.aiProviders?.perplexity?.model ?? "", data?.aiProviders?.perplexity?.customModel ?? ""),
    perplexity_custom_model: data?.aiProviders?.perplexity?.customModel ?? "",
  };

  const validationSchema = Yup.object({
    activeProvider: Yup.string().required("Please select an active provider"),
    gemini_api_key: Yup.string().max(200, "Max length 200 chars"),
    gemini_model: Yup.string().required("Model is required"),
    gemini_custom_model: Yup.string().when('gemini_model', {
      is: 'custom',
      then: (schema) => schema.required("Custom model name is required"),
      otherwise: (schema) => schema
    }),
    openai_api_key: Yup.string().max(200, "Max length 200 chars"),
    openai_model: Yup.string().required("Model is required"),
    openai_custom_model: Yup.string().when('openai_model', {
      is: 'custom',
      then: (schema) => schema.required("Custom model name is required"),
      otherwise: (schema) => schema
    }),
    anthropic_api_key: Yup.string().max(200, "Max length 200 chars"),
    anthropic_model: Yup.string().required("Model is required"),
    anthropic_custom_model: Yup.string().when('anthropic_model', {
      is: 'custom',
      then: (schema) => schema.required("Custom model name is required"),
      otherwise: (schema) => schema
    }),
    perplexity_api_key: Yup.string().max(200, "Max length 200 chars"),
    perplexity_model: Yup.string().required("Model is required"),
    perplexity_custom_model: Yup.string().when('perplexity_model', {
      is: 'custom',
      then: (schema) => schema.required("Custom model name is required"),
      otherwise: (schema) => schema
    }),
  });

  const verifyApiKey = async (provider: AIProviderType, apiKey: string, model: string) => {
    if (!apiKey.trim()) {
      setVerificationStatus(prev => ({ ...prev, [provider]: 'error' }));
      setVerificationMessages(prev => ({ ...prev, [provider]: 'Please enter an API key before verifying' }));
      return;
    }

    setVerificationStatus(prev => ({ ...prev, [provider]: 'loading' }));
    setVerificationMessages(prev => ({ ...prev, [provider]: 'Verifying API key and model...' }));

    try {
      const response = await fetch('/api/settings/ai-providers/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          model: model || getDefaultModel(provider),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      const isValid = result.isValid;
      setVerificationStatus(prev => ({ ...prev, [provider]: isValid ? 'success' : 'error' }));

      const message = isValid
        ? (result.message || `✅ API key and model are valid`)
        : (result.error || `❌ API key or model is invalid`);

      setVerificationMessages(prev => ({
        ...prev,
        [provider]: message
      }));
    } catch (error) {
      setVerificationStatus(prev => ({ ...prev, [provider]: 'error' }));
      setVerificationMessages(prev => ({
        ...prev,
        [provider]: `❌ Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      if (values) {
        const dataToSubmit = {
          activeProvider: values.activeProvider,
          gemini: {
            api_key: values.gemini_api_key.trim(),
            model: values.gemini_model === "custom" ? values.gemini_custom_model.trim() : values.gemini_model,
            customModel: values.gemini_model === "custom" ? values.gemini_custom_model.trim() : "",
          },
          openai: {
            api_key: values.openai_api_key.trim(),
            model: values.openai_model === "custom" ? values.openai_custom_model.trim() : values.openai_model,
            customModel: values.openai_model === "custom" ? values.openai_custom_model.trim() : "",
          },
          anthropic: {
            api_key: values.anthropic_api_key.trim(),
            model: values.anthropic_model === "custom" ? values.anthropic_custom_model.trim() : values.anthropic_model,
            customModel: values.anthropic_model === "custom" ? values.anthropic_custom_model.trim() : "",
          },
          perplexity: {
            api_key: values.perplexity_api_key.trim(),
            model: values.perplexity_model === "custom" ? values.perplexity_custom_model.trim() : values.perplexity_model,
            customModel: values.perplexity_model === "custom" ? values.perplexity_custom_model.trim() : "",
          },
        };

        await updateAIProviders(dataToSubmit).unwrap();
        toast({
          title: "Success",
          description: "AI provider settings updated successfully",
        });
        refetch();
        onClose();
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update AI provider settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div className="px-6 py-4">Loading...</div>;

  const supportedProviders = AIProviderFactory.getSupportedProviders();

  const getProviderIcon = (provider: AIProviderType) => {
    const iconProps = { className: "h-4 w-4" };
    switch (provider) {
      case "gemini": return <Bot {...iconProps} />;
      case "openai": return <Key {...iconProps} />;
      case "anthropic": return <Shield {...iconProps} />;
      case "perplexity": return <Bot {...iconProps} />;
      default: return <Bot {...iconProps} />;
    }
  };

  const getVerificationIcon = (provider: string) => {
    const status = verificationStatus[provider];
    switch (status) {
      case 'loading': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const formFields: Array<{
    label: string;
    apiKeyField: FormFieldName;
    modelField: FormFieldName;
    customModelField: FormFieldName;
    placeholder: string;
    provider: AIProviderType;
    description: string;
  }> = [
      {
        label: "Google Gemini",
        apiKeyField: "gemini_api_key",
        modelField: "gemini_model",
        customModelField: "gemini_custom_model",
        placeholder: "Enter your Gemini API key",
        provider: "gemini",
        description: "Google's multimodal AI model with excellent vision capabilities",
      },
      {
        label: "OpenAI GPT",
        apiKeyField: "openai_api_key",
        modelField: "openai_model",
        customModelField: "openai_custom_model",
        placeholder: "Enter your OpenAI API key",
        provider: "openai",
        description: "OpenAI's powerful language models for text processing",
      },
      {
        label: "Anthropic Claude",
        apiKeyField: "anthropic_api_key",
        modelField: "anthropic_model",
        customModelField: "anthropic_custom_model",
        placeholder: "Enter your Anthropic API key",
        provider: "anthropic",
        description: "Anthropic's Claude AI for detailed analysis and reasoning",
      },
      {
        label: "Perplexity AI",
        apiKeyField: "perplexity_api_key",
        modelField: "perplexity_model",
        customModelField: "perplexity_custom_model",
        placeholder: "Enter your Perplexity API key",
        provider: "perplexity",
        description: "Perplexity's search-augmented language models",
      },
    ];

  return (
    <Formik<AIProvidersValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        handleChange,
        handleBlur,
        handleSubmit,
        setFieldValue,
        isSubmitting,
        errors,
        touched,
      }) => (
        <Form className="flex flex-col h-[calc(90vh-80px)] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 sticky top-0">
            {/* AI Provider Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {formFields.map(({ label, apiKeyField, modelField, customModelField, placeholder, provider, description }) => {
                const isActive = values.activeProvider === provider;
                const apiKeyValue = values[apiKeyField] || "";
                const modelValue = values[modelField] || "";
                const customModelValue = values[customModelField] || "";
                const isVisible = showApiKeys[provider];
                const providerModels = getProviderModels(provider);

                return (
                  <Card
                    key={apiKeyField}
                    className={`transition-all duration-300 hover:shadow-lg ${isActive
                        ? 'border-2 shadow-md ring-1'
                        : 'border border-border hover:border-border/80 dark:hover:border-border/60'
                      }`}
                    style={isActive ? {
                      borderColor: `${primaryColor}80`,
                      backgroundColor: `${primaryColor}0D`,
                      '--tw-ring-color': `${primaryColor}33`
                    } as React.CSSProperties : {}}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${isActive
                                ? ''
                                : 'bg-muted text-muted-foreground'
                              }`}
                            style={isActive ? {
                              backgroundColor: `${primaryColor}33`,
                              color: primaryColor
                            } : {}}
                          >
                            {getProviderIcon(provider)}
                          </div>
                          <div className="space-y-1">
                            <CardTitle className="text-base">
                              {label}
                            </CardTitle>
                            <CardDescription className="text-sm">
                              {description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getVerificationIcon(provider)}
                          <Button
                            type="button"
                            variant={isActive ? "primary" : "outline"}
                            size="sm"
                            onClick={() => setFieldValue("activeProvider", provider)}
                            disabled={isSubmitting || isUpdating}
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
                            type={isVisible ? "text" : "password"}
                            value={apiKeyValue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={placeholder}
                            className={`pr-20 ${errors[apiKeyField] && touched[apiKeyField]
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                              }`}
                            style={isActive && !errors[apiKeyField] ? {
                              borderColor: `${primaryColor}80`,
                              '--tw-ring-color': `${primaryColor}33`
                            } as React.CSSProperties : {}}
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-transparent"
                              onClick={() => toggleApiKeyVisibility(provider)}
                            >
                              {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => {
                                const finalModel = modelValue === "custom" ? customModelValue : modelValue;
                                verifyApiKey(provider, apiKeyValue, finalModel);
                              }}
                              disabled={
                                verificationStatus[provider] === 'loading' ||
                                !apiKeyValue.trim() ||
                                (modelValue === "custom" && !customModelValue.trim())
                              }
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                        <ErrorMessage name={apiKeyField} component="div" className="text-sm text-red-500" />

                        {/* Verification Message */}
                        {verificationMessages[provider] && (
                          <p className={`text-xs ${verificationStatus[provider] === 'success'
                              ? 'text-green-600'
                              : verificationStatus[provider] === 'error'
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}>
                            {verificationMessages[provider]}
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
                              <SelectItem key={modelInfo.id} value={modelInfo.id} className="py-3">
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
                                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
                        <ErrorMessage name={modelField} component="div" className="text-sm text-red-500" />
                      </div>

                      {/* Custom Model Field - Only show when "custom" is selected */}
                      {modelValue === "custom" && (
                        <div className="space-y-2">
                          <Label htmlFor={customModelField} className="text-sm font-medium">
                            Custom Model Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={customModelField}
                            name={customModelField}
                            placeholder="Enter custom model name (e.g., gpt-4o, claude-3-opus-20240229)"
                            value={customModelValue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={
                              errors[customModelField] && touched[customModelField]
                                ? "border-destructive focus-visible:ring-destructive"
                                : ""
                            }
                          />
                          <p className="text-xs text-gray-500">
                            Enter the exact model name as specified by the AI provider's API documentation.
                          </p>
                          <ErrorMessage name={customModelField} component="div" className="text-sm text-red-500" />
                        </div>
                      )}

                      {/* Model Capabilities */}
                      {modelValue && modelValue !== "custom" && (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Model Capabilities</h4>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const modelInfo = providerModels.find(m => m.id === modelValue);
                              if (!modelInfo) return null;
                              const caps = modelInfo.capabilities;
                              return (
                                <>
                                  {caps.supportsPDF && <Badge variant="outline" className="text-xs">PDF Support</Badge>}
                                  {caps.supportsVision && <Badge variant="outline" className="text-xs">Vision</Badge>}
                                  {caps.supportsJSON && <Badge variant="outline" className="text-xs">JSON Mode</Badge>}
                                  <Badge variant="outline" className="text-xs">
                                    {caps.maxTokens.toLocaleString()} tokens
                                  </Badge>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Custom Model Info */}
                      {modelValue === "custom" && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <h4 className="text-sm font-medium mb-2 text-amber-800 dark:text-amber-200">Custom Model</h4>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            You're using a custom model. Please ensure the model name is correct and supported by the provider's API.
                            Capabilities and features may vary depending on the specific model you specify.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
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
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Only the active provider will be used for resume processing</li>
                    <li>• API keys are stored securely and encrypted in the database</li>
                    <li>• Verify your API keys to ensure they work before saving</li>
                    <li>• You can switch between providers at any time</li>
                    <li>• Custom models can be used to access newer or unlisted models</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting || isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isUpdating}
            >
              {isSubmitting || isUpdating ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}