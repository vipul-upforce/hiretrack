import { AIProviderType } from "@/lib/ai-providers";
import { Bot, Key, Shield } from "lucide-react";
import {
  getDefaultModel,
  getProviderModels,
} from "@/lib/ai-providers/models-config";
import React from "react";

export const getModelDisplayValue = (
  provider: string,
  modelValue: string,
  customValue: string
) => {
  const providerModels = getProviderModels(provider);
  const isKnownModel = providerModels.some((m) => m.id === modelValue);

  if (!isKnownModel && customValue) {
    return "custom";
  }

  return modelValue || getDefaultModel(provider);
};

export const getProviderIcon = (provider: AIProviderType) => {
  const iconProps = { className: "h-4 w-4" };
  switch (provider) {
    case "gemini":
      return <Bot {...iconProps} />;
    case "openai":
      return <Key {...iconProps} />;
    case "anthropic":
      return <Shield {...iconProps} />;
    case "perplexity":
      return <Bot {...iconProps} />;
    default:
      return <Bot {...iconProps} />;
  }
};
