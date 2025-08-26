"use client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { AIProviderType } from "@/lib/ai-providers";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Bot,
  Key,
  Shield,
  Settings,
} from "lucide-react";
import {
  AI_PROVIDER_MODELS,
  getDefaultModel,
  getProviderModels,
} from "@/lib/ai-providers/models-config";

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

type FormFieldName = keyof Omit<AIProvidersValues, "activeProvider">;

export default function AIProvidersConfigs({
  onClose,
}: {
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useGetAIProvidersConfigsQuery(undefined);
  const { data: portalData } = useGetPortalConfigsQuery(undefined);
  const [updateAIProviders, { isLoading: isUpdating }] =
    useUpdateAIProvidersMutation();

  // State for API key verification
  const [verificationStatus, setVerificationStatus] = useState<
    Record<string, "idle" | "loading" | "success" | "error">
  >({});
  const [verificationMessages, setVerificationMessages] = useState<
    Record<string, string>
  >({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [primaryColor, setPrimaryColor] = useState<string>("#6366f1");

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  // Update primary color when portal data changes
  useEffect(() => {
    if (portalData?.primaryColor) {
      setPrimaryColor(portalData.primaryColor);
    }
  }, [portalData]);

  const initialValues: AIProvidersValues = {
    activeProvider: data?.aiProviders?.activeProvider ?? "gemini",
    gemini_api_key: data?.aiProviders?.gemini?.api_key ?? "",
    gemini_model: data?.aiProviders?.gemini?.model ?? getDefaultModel("gemini"),
    gemini_custom_model: data?.aiProviders?.gemini?.customModel ?? "",
    openai_api_key: data?.aiProviders?.openai?.api_key ?? "",
    openai_model: data?.aiProviders?.openai?.model ?? getDefaultModel("openai"),
    openai_custom_model: data?.aiProviders?.openai?.customModel ?? "",
    anthropic_api_key: data?.aiProviders?.anthropic?.api_key ?? "",
    anthropic_model:
      data?.aiProviders?.anthropic?.model ?? getDefaultModel("anthropic"),
    anthropic_custom_model: data?.aiProviders?.anthropic?.customModel ?? "",
    perplexity_api_key: data?.aiProviders?.perplexity?.api_key ?? "",
    perplexity_model:
      data?.aiProviders?.perplexity?.model ?? getDefaultModel("perplexity"),
    perplexity_custom_model: data?.aiProviders?.perplexity?.customModel ?? "",
  };

  const validationSchema = Yup.object({
    activeProvider: Yup.string().required("Please select an active provider"),
    gemini_api_key: Yup.string().max(200, "Max length 200 chars"),
    gemini_model: Yup.string().required("Model is required"),
    openai_api_key: Yup.string().max(200, "Max length 200 chars"),
    openai_model: Yup.string().required("Model is required"),
    anthropic_api_key: Yup.string().max(200, "Max length 200 chars"),
    anthropic_model: Yup.string().required("Model is required"),
    perplexity_api_key: Yup.string().max(200, "Max length 200 chars"),
    perplexity_model: Yup.string().required("Model is required"),
  });

  const verifyApiKey = async (
    provider: AIProviderType,
    apiKey: string,
    model: string
  ) => {
    if (!apiKey.trim()) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: "error" }));
      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: "Please enter an API key before verifying",
      }));
      return;
    }

    setVerificationStatus((prev) => ({ ...prev, [provider]: "loading" }));
    setVerificationMessages((prev) => ({
      ...prev,
      [provider]: "Verifying API key and model...",
    }));

    try {
      const response = await fetch("/api/settings/ai-providers/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          model: model || getDefaultModel(provider),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Validation failed");
      }

      const isValid = result.isValid;
      setVerificationStatus((prev) => ({
        ...prev,
        [provider]: isValid ? "success" : "error",
      }));

      // Use the message from the server if available, otherwise use default messages
      const message = isValid
        ? result.message || `✅ API key and model are valid`
        : result.error || `❌ API key or model is invalid`;

      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: message,
      }));
    } catch (error) {
      setVerificationStatus((prev) => ({ ...prev, [provider]: "error" }));
      setVerificationMessages((prev) => ({
        ...prev,
        [provider]: `❌ Verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }));
    }
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleSubmit = async (values: typeof initialValues) => {
    try {
      if (values) {
        const dataToSubmit = {
          activeProvider: values.activeProvider,
          gemini: {
            api_key: values.gemini_api_key.trim(),
            model: values.gemini_custom_model.trim() || values.gemini_model,
            customModel: values.gemini_custom_model.trim(),
          },
          openai: {
            api_key: values.openai_api_key.trim(),
            model: values.openai_custom_model.trim() || values.openai_model,
            customModel: values.openai_custom_model.trim(),
          },
          anthropic: {
            api_key: values.anthropic_api_key.trim(),
            model:
              values.anthropic_custom_model.trim() || values.anthropic_model,
            customModel: values.anthropic_custom_model.trim(),
          },
          perplexity: {
            api_key: values.perplexity_api_key.trim(),
            model:
              values.perplexity_custom_model.trim() || values.perplexity_model,
            customModel: values.perplexity_custom_model.trim(),
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading AI provider settings...</span>
      </div>
    );
  }

  const providers = [
    {
      id: "gemini",
      name: "Google Gemini",
      description: "Google's Gemini AI with PDF and vision support",
      icon: Key,
      apiKeyField: "gemini_api_key",
      modelField: "gemini_model",
      customModelField: "gemini_custom_model",
    },
    {
      id: "openai",
      name: "OpenAI",
      description: "OpenAI's GPT models for text and vision processing",
      icon: Key,
      apiKeyField: "openai_api_key",
      modelField: "openai_model",
      customModelField: "openai_custom_model",
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      description: "Anthropic's Claude AI for advanced reasoning",
      icon: Shield,
      apiKeyField: "anthropic_api_key",
      modelField: "anthropic_model",
      customModelField: "anthropic_custom_model",
    },
    {
      id: "perplexity",
      name: "Perplexity AI",
      description: "Perplexity's search-augmented language models",
      icon: Settings,
      apiKeyField: "perplexity_api_key",
      modelField: "perplexity_model",
      customModelField: "perplexity_custom_model",
    },
  ];

  return (
    <div className="space-y-6">
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, errors, touched }) => (
          <Form className="space-y-6">
            {/* Active Provider Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Active AI Provider
                </CardTitle>
                <CardDescription>
                  Select which AI provider to use for resume processing and
                  candidate evaluation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Active Provider</Label>
                  <Select
                    value={values.activeProvider}
                    onValueChange={(value: AIProviderType) =>
                      setFieldValue("activeProvider", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select active provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <provider.icon className="h-4 w-4" />
                            {provider.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ErrorMessage
                    name="activeProvider"
                    component="div"
                    className="text-red-500 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Provider Configurations */}
            <div className="grid gap-6">
              {providers.map((provider) => {
                const isActive = values.activeProvider === provider.id;
                const apiKey = values[
                  provider.apiKeyField as keyof AIProvidersValues
                ] as string;
                const model = values[
                  provider.modelField as keyof AIProvidersValues
                ] as string;
                const customModel = values[
                  provider.customModelField as keyof AIProvidersValues
                ] as string;
                const providerModels = getProviderModels(provider.id);
                const status = verificationStatus[provider.id] || "idle";
                const message = verificationMessages[provider.id] || "";
                const showKey = showApiKeys[provider.id] || false;

                return (
                  <Card
                    key={provider.id}
                    className={`transition-all duration-200 ${
                      isActive
                        ? `ring-2 ring-offset-2 bg-gradient-to-r from-white to-gray-50 dark:from-black dark:to-gray-950`
                        : "hover:shadow-md"
                    }`}
                    style={
                      isActive
                        ? ({
                            "--tw-ring-color": primaryColor,
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-black">
                            <provider.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {provider.name}
                              {isActive && (
                                <Badge
                                  className="text-white font-medium"
                                  style={{ backgroundColor: primaryColor }}
                                >
                                  Active
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {provider.description}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* API Key Field */}
                      <div className="space-y-2">
                        <Label htmlFor={provider.apiKeyField}>API Key</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              id={provider.apiKeyField}
                              name={provider.apiKeyField}
                              type={showKey ? "text" : "password"}
                              placeholder={`Enter ${provider.name} API key`}
                              value={apiKey}
                              onChange={(e) =>
                                setFieldValue(
                                  provider.apiKeyField,
                                  e.target.value
                                )
                              }
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                toggleApiKeyVisibility(provider.id)
                              }
                            >
                              {showKey ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              verifyApiKey(
                                provider.id as AIProviderType,
                                apiKey,
                                customModel || model
                              )
                            }
                            disabled={status === "loading" || !apiKey.trim()}
                            className="flex items-center gap-2"
                          >
                            {status === "loading" ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : status === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : status === "error" ? (
                              <XCircle className="h-4 w-4 text-red-600" />
                            ) : null}
                            Verify
                          </Button>
                        </div>
                        <ErrorMessage
                          name={provider.apiKeyField}
                          component="div"
                          className="text-red-500 text-sm"
                        />
                        {message && (
                          <p
                            className={`text-sm ${status === "success" ? "text-green-600" : status === "error" ? "text-red-600" : "text-gray-600"}`}
                          >
                            {message}
                          </p>
                        )}
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <Label htmlFor={provider.modelField}>Model</Label>
                        <Select
                          value={model}
                          onValueChange={(value) =>
                            setFieldValue(provider.modelField, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            {providerModels.map((modelInfo) => (
                              <SelectItem
                                key={modelInfo.id}
                                value={modelInfo.id}
                              >
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    {modelInfo.name}
                                    {modelInfo.isDefault && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs"
                                      >
                                        Default
                                      </Badge>
                                    )}
                                    {modelInfo.isDeprecated && (
                                      <Badge
                                        variant="destructive"
                                        className="text-xs"
                                      >
                                        Deprecated
                                      </Badge>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {modelInfo.capabilities.costTier}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {modelInfo.capabilities.description}
                                  </p>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ErrorMessage
                          name={provider.modelField}
                          component="div"
                          className="text-red-500 text-sm"
                        />
                      </div>

                      {/* Custom Model Field */}
                      <div className="space-y-2">
                        <Label htmlFor={provider.customModelField}>
                          Custom Model (Optional)
                        </Label>
                        <Input
                          id={provider.customModelField}
                          name={provider.customModelField}
                          placeholder="Enter custom model name to override selection above"
                          value={customModel}
                          onChange={(e) =>
                            setFieldValue(
                              provider.customModelField,
                              e.target.value
                            )
                          }
                        />
                        <p className="text-xs text-gray-500">
                          Leave empty to use the selected model above. Enter a
                          custom model name to use a newer or unlisted model.
                        </p>
                      </div>

                      {/* Model Capabilities */}
                      {model && (
                        <div className="mt-4 p-3 bg-white dark:bg-black rounded-lg">
                          <h4 className="text-sm font-medium mb-2">
                            Model Capabilities
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const modelInfo = providerModels.find(
                                (m) => m.id === model
                              );
                              if (!modelInfo) return null;
                              const caps = modelInfo.capabilities;
                              return (
                                <>
                                  {caps.supportsPDF && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      PDF Support
                                    </Badge>
                                  )}
                                  {caps.supportsVision && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Vision
                                    </Badge>
                                  )}
                                  {caps.supportsJSON && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
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
              })}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdating}
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
