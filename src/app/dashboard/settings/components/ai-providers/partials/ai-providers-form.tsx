import React from "react";
import { Form, Formik } from "formik";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUpdateAIProvidersMutation } from "@/lib/features/settings/settingsApi";
import { AIProvidersValues } from "./../types";
import { aiProvidersSchema } from "./../schema";
import { PROVIDER_CONFIGS } from "./../constants";
import { useAiVerification } from "../hooks/useAiVerification";
import { ProviderCard } from "./provider-card";

interface AIProvidersFormProps {
  initialValues: AIProvidersValues;
  primaryColor: string;
  onClose: () => void;
  onRefetch: () => void;
}

export default function AIProvidersForm({
  initialValues,
  primaryColor,
  onClose,
  onRefetch,
}: AIProvidersFormProps) {
  const { toast } = useToast();
  const [updateAIProviders, { isLoading: isUpdating }] =
    useUpdateAIProvidersMutation();
  const {
    verificationStatus,
    verificationMessages,
    showApiKeys,
    verifyApiKey,
    toggleApiKeyVisibility,
  } = useAiVerification();

  const handleSubmit = async (values: AIProvidersValues) => {
    try {
      const formatProviderData = (
        apiKey: string,
        model: string,
        customModel: string
      ) => ({
        api_key: apiKey.trim(),
        model: model === "custom" ? customModel.trim() : model,
        customModel: model === "custom" ? customModel.trim() : "",
      });

      const dataToSubmit = {
        activeProvider: values.activeProvider,
        gemini: formatProviderData(
          values.gemini_api_key,
          values.gemini_model,
          values.gemini_custom_model
        ),
        openai: formatProviderData(
          values.openai_api_key,
          values.openai_model,
          values.openai_custom_model
        ),
        anthropic: formatProviderData(
          values.anthropic_api_key,
          values.anthropic_model,
          values.anthropic_custom_model
        ),
        perplexity: formatProviderData(
          values.perplexity_api_key,
          values.perplexity_model,
          values.perplexity_custom_model
        ),
      };

      await updateAIProviders(dataToSubmit).unwrap();
      toast({
        title: "Success",
        description: "AI provider settings updated successfully",
      });
      onRefetch();
      onClose();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update AI provider settings",
        variant: "destructive",
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
      {(formik) => (
        <Form className="flex flex-col h-[calc(86vh-80px)] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 sticky top-0">
            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {PROVIDER_CONFIGS.map((config) => (
                <ProviderCard
                  key={config.provider}
                  config={config}
                  formik={formik}
                  primaryColor={primaryColor}
                  isUpdating={isUpdating}
                  verificationStatus={
                    verificationStatus[config.provider] || "idle"
                  }
                  verificationMessage={verificationMessages[config.provider]}
                  showApiKey={!!showApiKeys[config.provider]}
                  onVerify={(key, model) =>
                    verifyApiKey(config.provider, key, model)
                  }
                  onToggleVisibility={() =>
                    toggleApiKeyVisibility(config.provider)
                  }
                />
              ))}
            </div>

            {/* Info Card */}
            <Card className="mt-6" style={{ borderColor: `${primaryColor}33` }}>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Security & Usage Information
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>
                      • Only the active provider will be used for resume
                      processing
                    </li>
                    <li>
                      • API keys are stored securely and encrypted in the
                      database
                    </li>
                    <li>
                      • Verify your API keys to ensure they work before saving
                    </li>
                    <li>• You can switch between providers at any time</li>
                    <li>
                      • Custom models can be used to access newer or unlisted
                      models
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-2 border-t bg-background px-6 py-4 sticky bottom-0 z-10 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={formik.isSubmitting || isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={formik.isSubmitting || isUpdating}
            >
              {formik.isSubmitting || isUpdating
                ? "Saving..."
                : "Save Configuration"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
