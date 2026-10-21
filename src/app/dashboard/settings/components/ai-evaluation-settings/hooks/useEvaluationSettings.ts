import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  useGetEvaluationConfigsQuery,
  useUpdateEvaluationConfigsMutation,
} from '@/lib/features/settings';
import { EvaluationConfig, EvaluationConfigKey } from '../types';
import {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_PAGES,
  DEFAULT_CUSTOM_FIELDS_PROMPT,
} from '../constants';

export const useEvaluationSettings = (isOpen: boolean, onClose: () => void) => {
  const { toast } = useToast();

  const [config, setConfig] = useState<EvaluationConfig>({
    temperature: DEFAULT_TEMPERATURE,
    customPrompt: '',
    autoEvaluateAllCandidates: false,
    maxPdfPages: DEFAULT_MAX_PAGES,
    useCustomPrompt: false,
    enableConfidenceScores: true,
    enableRedFlagsDetection: true,
    enableSkillsMatrix: true,
    enableComparativeRanking: false,
    useCustomFieldsPrompt: false,
    customFieldsPrompt: DEFAULT_CUSTOM_FIELDS_PROMPT,
    selectedCustomFields: [],
  });

  const {
    data,
    isLoading: isFetching,
    isError: isFetchError,
  } = useGetEvaluationConfigsQuery(undefined, {
    skip: !isOpen,
    refetchOnMountOrArgChange: true,
  });

  const [updateSettings, { isLoading: isSaving }] =
    useUpdateEvaluationConfigsMutation();

  useEffect(() => {
    if (data && data.evaluationConfig) {
      const apiConfig = data.evaluationConfig;

      setConfig({
        temperature: apiConfig.temperature || DEFAULT_TEMPERATURE,
        customPrompt: apiConfig.customPrompt || '',
        autoEvaluateAllCandidates: apiConfig.autoEvaluateAllCandidates || false,
        maxPdfPages: apiConfig.maxPdfPages || DEFAULT_MAX_PAGES,
        useCustomPrompt: !!apiConfig.customPrompt,
        enableConfidenceScores: apiConfig.enableConfidenceScores !== false,
        enableRedFlagsDetection: apiConfig.enableRedFlagsDetection !== false,
        enableSkillsMatrix: apiConfig.enableSkillsMatrix !== false,
        enableComparativeRanking: apiConfig.enableComparativeRanking || false,
        useCustomFieldsPrompt: apiConfig.useCustomFieldsPrompt || false,
        customFieldsPrompt:
          apiConfig.customFieldsPrompt || DEFAULT_CUSTOM_FIELDS_PROMPT,
        selectedCustomFields: Array.isArray(apiConfig.selectedCustomFields)
          ? apiConfig.selectedCustomFields
          : [],
      });
    }
  }, [data]);

  // Handle Fetch Error
  useEffect(() => {
    if (isFetchError) {
      toast({
        title: 'Error',
        description: 'Failed to load settings. Please try again.',
        variant: 'destructive',
      });
    }
  }, [isFetchError, toast]);

  const updateConfig = useCallback(
    <K extends EvaluationConfigKey>(key: K, value: EvaluationConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const saveSettings = async () => {
    try {
      const payload = {
        temperature: config.temperature,
        customPrompt: config.useCustomPrompt ? config.customPrompt : null,
        autoEvaluateAllCandidates: config.autoEvaluateAllCandidates,
        maxPdfPages: config.maxPdfPages,
        enableConfidenceScores: config.enableConfidenceScores,
        enableRedFlagsDetection: config.enableRedFlagsDetection,
        enableSkillsMatrix: config.enableSkillsMatrix,
        enableComparativeRanking: config.enableComparativeRanking,
        useCustomFieldsPrompt: config.useCustomFieldsPrompt,
        customFieldsPrompt: config.customFieldsPrompt,
        selectedCustomFields: config.selectedCustomFields,
      };

      await updateSettings(payload).unwrap();

      toast({
        title: 'Success',
        description: 'Evaluation settings updated successfully',
      });
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        (error as { data?: { error?: string } })?.data?.error ||
        'Failed to update settings';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const resetSettings = () => {
    setConfig({
      temperature: DEFAULT_TEMPERATURE,
      customPrompt: '',
      autoEvaluateAllCandidates: false,
      maxPdfPages: DEFAULT_MAX_PAGES,
      useCustomPrompt: false,
      enableConfidenceScores: true,
      enableRedFlagsDetection: true,
      enableSkillsMatrix: true,
      enableComparativeRanking: false,
      useCustomFieldsPrompt: false,
      customFieldsPrompt: DEFAULT_CUSTOM_FIELDS_PROMPT,
      selectedCustomFields: [],
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
