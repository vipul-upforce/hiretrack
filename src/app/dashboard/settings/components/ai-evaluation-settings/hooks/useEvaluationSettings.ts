import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { EvaluationConfig, EvaluationConfigKey } from "./../types";
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_PAGES,
} from "./../constants";

export const useEvaluationSettings = (isOpen: boolean, onClose: () => void) => {
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [config, setConfig] = useState<EvaluationConfig>({
    temperature: DEFAULT_TEMPERATURE,
    customPrompt: "",
    autoEvaluateAllCandidates: false,
    maxPdfPages: DEFAULT_MAX_PAGES,
    useCustomPrompt: false,
    enableConfidenceScores: true,
    enableRedFlagsDetection: true,
    enableSkillsMatrix: true,
    enableComparativeRanking: false,
  });

  const updateConfig = useCallback(
    <K extends EvaluationConfigKey>(key: K, value: EvaluationConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const fetchSettings = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await fetch("/api/settings/evaluation");
      if (response.ok) {
        const data = await response.json();
        const apiConfig = data.evaluationConfig;

        setConfig({
          temperature: apiConfig.temperature || DEFAULT_TEMPERATURE,
          customPrompt: apiConfig.customPrompt || "",
          autoEvaluateAllCandidates:
            apiConfig.autoEvaluateAllCandidates || false,
          maxPdfPages: apiConfig.maxPdfPages || DEFAULT_MAX_PAGES,
          useCustomPrompt: !!apiConfig.customPrompt,
          enableConfidenceScores: apiConfig.enableConfidenceScores !== false,
          enableRedFlagsDetection: apiConfig.enableRedFlagsDetection !== false,
          enableSkillsMatrix: apiConfig.enableSkillsMatrix !== false,
          enableComparativeRanking: apiConfig.enableComparativeRanking || false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch evaluation settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFetching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen, fetchSettings]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings/evaluation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: config.temperature,
          customPrompt: config.useCustomPrompt ? config.customPrompt : null,
          autoEvaluateAllCandidates: config.autoEvaluateAllCandidates,
          maxPdfPages: config.maxPdfPages,
          enableConfidenceScores: config.enableConfidenceScores,
          enableRedFlagsDetection: config.enableRedFlagsDetection,
          enableSkillsMatrix: config.enableSkillsMatrix,
          enableComparativeRanking: config.enableComparativeRanking,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Evaluation settings updated successfully",
        });
        onClose();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetSettings = () => {
    setConfig({
      temperature: DEFAULT_TEMPERATURE,
      customPrompt: "",
      autoEvaluateAllCandidates: false,
      maxPdfPages: DEFAULT_MAX_PAGES,
      useCustomPrompt: false,
      enableConfidenceScores: true,
      enableRedFlagsDetection: true,
      enableSkillsMatrix: true,
      enableComparativeRanking: false,
    });
  };

  return {
    config,
    updateConfig,
    saveSettings,
    resetSettings,
    isFetching,
    isSaving,
  };
};
