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

export interface AIProvidersValues {
  activeProvider: AIProviderType;
  gemini_api_key: string;
  openai_api_key: string;
  anthropic_api_key: string;
  perplexity_api_key: string;
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

  const initialValues: AIProvidersValues = {
    activeProvider: data?.aiProviders?.activeProvider ?? "gemini",
    gemini_api_key: data?.aiProviders?.gemini?.api_key ?? "",
    openai_api_key: data?.aiProviders?.openai?.api_key ?? "",
    anthropic_api_key: data?.aiProviders?.anthropic?.api_key ?? "",
    perplexity_api_key: data?.aiProviders?.perplexity?.api_key ?? "",
  };

  const validationSchema = Yup.object({
    activeProvider: Yup.string().required("Please select an active provider"),
    gemini_api_key: Yup.string().max(200, "Max length 200 chars"),
    openai_api_key: Yup.string().max(200, "Max length 200 chars"),
    anthropic_api_key: Yup.string().max(200, "Max length 200 chars"),
    perplexity_api_key: Yup.string().max(200, "Max length 200 chars"),
  });

  const verifyApiKey = async (provider: AIProviderType, apiKey: string) => {
    if (!apiKey.trim()) {
      setVerificationStatus(prev => ({ ...prev, [provider]: 'error' }));
      setVerificationMessages(prev => ({ ...prev, [provider]: 'Please enter an API key before verifying' }));
      return;
    }

    setVerificationStatus(prev => ({ ...prev, [provider]: 'loading' }));
    setVerificationMessages(prev => ({ ...prev, [provider]: 'Verifying API key...' }));
    
    try {
      const response = await fetch('/api/settings/ai-providers/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Validation failed');
      }

      const isValid = result.isValid;
      setVerificationStatus(prev => ({ ...prev, [provider]: isValid ? 'success' : 'error' }));
      
      // Use the message from the server if available, otherwise use default messages
      const message = isValid 
        ? (result.message || `✅ API key is valid and working`)
        : (result.error || `❌ API key is invalid or expired`);
      
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
          },
          openai: {
            api_key: values.openai_api_key.trim(),
          },
          anthropic: {
            api_key: values.anthropic_api_key.trim(),
          },
          perplexity: {
            api_key: values.perplexity_api_key.trim(),
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
    name: FormFieldName;
    placeholder: string;
    provider: AIProviderType;
    description: string;
  }> = [
    {
      label: "Google Gemini",
      name: "gemini_api_key",
      placeholder: "Enter your Gemini API key",
      provider: "gemini",
      description: "Google's multimodal AI model with excellent vision capabilities",
    },
    {
      label: "OpenAI GPT",
      name: "openai_api_key",
      placeholder: "Enter your OpenAI API key",
      provider: "openai",
      description: "Advanced language model with strong reasoning capabilities",
    },
    {
      label: "Anthropic Claude",
      name: "anthropic_api_key",
      placeholder: "Enter your Anthropic API key",
      provider: "anthropic",
      description: "Constitutional AI with focus on safety and helpfulness",
    },
    {
      label: "Perplexity AI",
      name: "perplexity_api_key",
      placeholder: "Enter your Perplexity API key",
      provider: "perplexity",
      description: "AI-powered search and answer engine with real-time data",
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
              {formFields.map(({ label, name, placeholder, provider, description }) => {
                const isActive = values.activeProvider === provider;
                const fieldValue = values[name] || "";
                const isVisible = showApiKeys[provider];
                
                return (
                  <Card 
                    key={name} 
                    className={`transition-all duration-300 hover:shadow-lg ${
                      isActive 
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
                            className={`p-2 rounded-lg ${
                              isActive 
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
                      <div className="space-y-2">
                        <Label htmlFor={name} className="text-sm font-medium">
                          API Key
                        </Label>
                        <div className="relative">
                          <Input
                            id={name}
                            name={name}
                            type={isVisible ? "text" : "password"}
                            value={fieldValue}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={placeholder}
                            className={`pr-20 ${
                              errors[name] && touched[name] 
                                ? "border-destructive focus-visible:ring-destructive" 
                                : ""
                            }`}
                            style={isActive && !errors[name] ? {
                              borderColor: `${primaryColor}80`,
                              '--tw-ring-color': `${primaryColor}80`
                            } as React.CSSProperties : {}}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-8 w-8 px-0 hover:bg-muted"
                            onClick={() => toggleApiKeyVisibility(provider)}
                          >
                            {isVisible ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <ErrorMessage
                          name={name}
                          component="div"
                          className="text-destructive text-sm font-medium"
                        />
                      </div>
                      
                      {fieldValue && (
                        <div className="space-y-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => verifyApiKey(provider, fieldValue)}
                            disabled={verificationStatus[provider] === 'loading'}
                            className="w-full hover:bg-muted"
                          >
                            {verificationStatus[provider] === 'loading' ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <Shield className="mr-2 h-4 w-4" />
                                Verify API Key
                              </>
                            )}
                          </Button>
                          
                          {verificationMessages[provider] && (
                            <div 
                              className={`p-3 rounded-lg text-sm border transition-all duration-200 ${
                                verificationStatus[provider] === 'success' 
                                  ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-200'
                                  : verificationStatus[provider] === 'error'
                                    ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200'
                                    : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200'
                              }`}
                            >
                              {verificationMessages[provider]}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Information Card */}
            <Card 
              className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50"
              style={{
                borderColor: `${primaryColor}50`
              }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Security & Usage Information
                    </p>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• Only the active provider will be used for resume processing</li>
                      <li>• API keys are stored securely and encrypted in the database</li>
                      <li>• Verify your API keys to ensure they work before saving</li>
                      <li>• You can switch between providers at any time</li>
                    </ul>
                  </div>
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