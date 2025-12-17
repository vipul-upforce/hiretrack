'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from 'react';
import {
  useLazyGetOnboardingStatusQuery,
  useLazyValidateOnboardingQuery,
  useUpdateOnboardingStatusMutation,
  useValidateOnboardingStepMutation,
} from '@/lib/features/onboarding/onboardingApi';

import logger from '@/lib/logger';
import { useAppSelector } from '@/lib/redux/hooks';
import type {
  OnboardingProgress,
  OnboardingStatus,
  OnboardingStep,
} from './onboarding.constants';
import { getDefaultSteps } from './onboarding.constants';

interface OnboardingContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentStepIndex: number;
  setCurrentStepIndex: (index: number) => void;
  steps: OnboardingStep[];
  onboardingStatus: OnboardingStatus | null;
  progress: OnboardingProgress | null;
  isLoading: boolean;
  updateOnboardingStatus: (updates: Partial<OnboardingStatus>) => Promise<void>;
  completeStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  validateStep: (stepId: string) => Promise<boolean>;
  refreshProgress: (status: OnboardingStatus | null) => Promise<void>; // ← UPDATED
  doNotShowAgain: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);
interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAppSelector((state) => state.auth || {});

  const [fetchStatus] = useLazyGetOnboardingStatusQuery();
  const [fetchValidate] = useLazyValidateOnboardingQuery();
  const [updateStatusMutation] = useUpdateOnboardingStatusMutation();
  const [validateStepMutation] = useValidateOnboardingStepMutation();

  const refreshProgress = async (status: OnboardingStatus | null) => {
    try {
      const data = await fetchValidate().unwrap();

      setProgress(data.progress);

      // SAFELY MAP STEPS
      const updatedSteps = getDefaultSteps().map((step) => ({
        ...step,
        isCompleted: data.stepStatus[step.id] || false,
        isSkipped: status?.skippedSteps.includes(step.id) || false,
      }));

      setSteps(updatedSteps);
    } catch (error) {
      logger.error('Error refreshing progress:', error);
    }
  };

  const fetchOnboardingData = async () => {
    try {
      setIsLoading(true);

      // 1) Load STATUS first
      const statusResponse = await fetchStatus().unwrap();
      const status = statusResponse.onboardingStatus;
      if (status) {
        setOnboardingStatus(status);
        setCurrentStepIndex(status.currentStep ?? 0);

        // 2) Always refresh using the latest status
        await refreshProgress(status);
      }
    } catch (error) {
      logger.error('Error loading onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize onboarding data
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOnboardingData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && onboardingStatus && user?.role === 'admin') {
      const shouldShow =
        !onboardingStatus.isCompleted &&
        !onboardingStatus.doNotShowAgain &&
        (progress?.percentage || 0) < 50 &&
        onboardingStatus.currentStep === 0;

      if (shouldShow) {
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, [isLoading, onboardingStatus, progress, user?.role]);

  const updateOnboardingStatus = async (updates: Partial<OnboardingStatus>) => {
    try {
      const updatedStatusResponse =
        await updateStatusMutation(updates).unwrap();
      const updatedStatus = updatedStatusResponse.onboardingStatus;
      if (!updatedStatus) return;

      setOnboardingStatus(updatedStatus);

      // REFRESH WITH NEWEST STATUS
      await refreshProgress(updatedStatus);
    } catch (error) {
      logger.error('Error updating status:', error);
    }
  };

  const completeStep = async (stepId: string) => {
    if (!onboardingStatus) return;

    const updated = {
      ...onboardingStatus,
      completedSteps: Array.from(
        new Set([...onboardingStatus.completedSteps, stepId]),
      ),
      skippedSteps: onboardingStatus.skippedSteps.filter((x) => x !== stepId),
    };

    await updateOnboardingStatus(updated);
  };

  const skipStep = async (stepId: string) => {
    if (!onboardingStatus) return;

    const updated = {
      ...onboardingStatus,
      skippedSteps: Array.from(
        new Set([...onboardingStatus.skippedSteps, stepId]),
      ),
      completedSteps: onboardingStatus.completedSteps.filter(
        (x) => x !== stepId,
      ),
    };

    await updateOnboardingStatus(updated);
  };

  const validateStep = async (stepId: string): Promise<boolean> =>
    (await validateStepMutation({ stepId }).unwrap()).isValid;

  const doNotShowAgain = async () => {
    await updateOnboardingStatus({ doNotShowAgain: true });
    setIsOpen(false);
  };

  const contextValue: OnboardingContextType = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      currentStepIndex,
      setCurrentStepIndex,
      steps,
      onboardingStatus,
      progress,
      isLoading,
      updateOnboardingStatus,
      completeStep,
      skipStep,
      validateStep,
      refreshProgress,
      doNotShowAgain,
    }),
    [
      isOpen,
      currentStepIndex,
      steps,
      onboardingStatus,
      progress,
      isLoading,
      updateOnboardingStatus,
      completeStep,
      skipStep,
      validateStep,
      refreshProgress,
      doNotShowAgain,
    ],
  );

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within provider');
  return ctx;
};
