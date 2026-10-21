'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
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
  updateOnboardingStatus: (
    updates: Partial<OnboardingStatus>,
    immediateRefresh?: boolean,
  ) => Promise<void>;
  completeStep: (stepId: string) => Promise<void>;
  skipStep: (stepId: string) => Promise<void>;
  validateStep: (stepId: string, forceRefresh?: boolean) => Promise<boolean>;
  invalidateStepCache: (stepId: string) => void;
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
  const hasAutoOpenedRef = useRef(false);

  const { user } = useAppSelector((state) => state.auth || {});

  const [fetchStatus] = useLazyGetOnboardingStatusQuery();
  const [fetchValidate] = useLazyValidateOnboardingQuery();
  const [updateStatusMutation] = useUpdateOnboardingStatusMutation();
  const [validateStepMutation] = useValidateOnboardingStepMutation();
  const refreshProgressTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingRefreshStatusRef = useRef<OnboardingStatus | null>(null);

  // Cache for step validation results
  const stepValidationCache = useRef<
    Map<string, { isValid: boolean; timestamp: number }>
  >(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  const refreshProgress = useCallback(
    async (status: OnboardingStatus | null, immediate = false) => {
      // Debounce rapid refreshProgress calls
      if (!immediate) {
        pendingRefreshStatusRef.current = status;

        if (refreshProgressTimeoutRef.current) {
          clearTimeout(refreshProgressTimeoutRef.current);
        }

        refreshProgressTimeoutRef.current = setTimeout(async () => {
          const statusToUse = pendingRefreshStatusRef.current;
          pendingRefreshStatusRef.current = null;

          try {
            const data = await fetchValidate().unwrap();

            setProgress(data.progress);

            // SAFELY MAP STEPS
            const updatedSteps = getDefaultSteps().map((step) => {
              const isValid = data.stepStatus[step.id] || false;

              // Update cache with fresh validation results
              stepValidationCache.current.set(step.id, {
                isValid,
                timestamp: Date.now(),
              });

              return {
                ...step,
                isCompleted: isValid,
                isSkipped: statusToUse?.skippedSteps.includes(step.id) || false,
              };
            });

            setSteps(updatedSteps);
          } catch (error) {
            logger.error('Error refreshing progress:', error);
          }
        }, 300); // 300ms debounce
        return;
      }

      // Immediate refresh (for initial load)
      try {
        const data = await fetchValidate().unwrap();

        setProgress(data.progress);

        // SAFELY MAP STEPS
        const updatedSteps = getDefaultSteps().map((step) => {
          const isValid = data.stepStatus[step.id] || false;

          // Update cache with fresh validation results
          stepValidationCache.current.set(step.id, {
            isValid,
            timestamp: Date.now(),
          });

          return {
            ...step,
            isCompleted: isValid,
            isSkipped: status?.skippedSteps.includes(step.id) || false,
          };
        });

        setSteps(updatedSteps);
      } catch (error) {
        logger.error('Error refreshing progress:', error);
      }
    },
    [fetchValidate],
  );

  const fetchOnboardingData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1) Load STATUS first
      const statusResponse = await fetchStatus().unwrap();
      const status = statusResponse.onboardingStatus;
      if (status) {
        setOnboardingStatus(status);
        setCurrentStepIndex(status.currentStep ?? 0);

        // 2) Always refresh using the latest status (immediate for initial load)
        await refreshProgress(status, true);
      }
    } catch (error) {
      logger.error('Error loading onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus, refreshProgress]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (refreshProgressTimeoutRef.current) {
        clearTimeout(refreshProgressTimeoutRef.current);
      }
    },
    [],
  );

  // Initialize onboarding data
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOnboardingData();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchOnboardingData]);

  // Auto-open dialog only once on initial load, not when manually opened
  useEffect(() => {
    if (
      !isLoading &&
      onboardingStatus &&
      user?.role === 'admin' &&
      !isOpen &&
      !hasAutoOpenedRef.current
    ) {
      const shouldShow =
        !onboardingStatus.isCompleted &&
        !onboardingStatus.doNotShowAgain &&
        (progress?.percentage || 0) < 50 &&
        onboardingStatus.currentStep === 0;

      if (shouldShow) {
        hasAutoOpenedRef.current = true;
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, [isLoading, onboardingStatus, progress, user?.role, isOpen]);

  const updateOnboardingStatus = useCallback(
    async (updates: Partial<OnboardingStatus>, immediateRefresh = false) => {
      try {
        const updatedStatusResponse =
          await updateStatusMutation(updates).unwrap();
        const updatedStatus = updatedStatusResponse.onboardingStatus;
        if (!updatedStatus) return;

        setOnboardingStatus(updatedStatus);

        // REFRESH WITH NEWEST STATUS
        await refreshProgress(updatedStatus, immediateRefresh);
      } catch (error) {
        logger.error('Error updating status:', error);
      }
    },
    [updateStatusMutation, refreshProgress],
  );

  const completeStep = useCallback(
    async (stepId: string) => {
      if (!onboardingStatus) return;

      const updated = {
        ...onboardingStatus,
        completedSteps: Array.from(
          new Set([...onboardingStatus.completedSteps, stepId]),
        ),
        skippedSteps: onboardingStatus.skippedSteps.filter((x) => x !== stepId),
      };

      await updateOnboardingStatus(updated);
    },
    [onboardingStatus, updateOnboardingStatus],
  );

  const skipStep = useCallback(
    async (stepId: string) => {
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
    },
    [onboardingStatus, updateOnboardingStatus],
  );

  const validateStep = useCallback(
    async (stepId: string, forceRefresh = false): Promise<boolean> => {
      const cached = stepValidationCache.current.get(stepId);
      const now = Date.now();

      // Return cached result if valid and not forcing refresh
      if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
        return cached.isValid;
      }

      // Fetch from API
      try {
        const { isValid } = await validateStepMutation({ stepId }).unwrap();

        // Update cache
        stepValidationCache.current.set(stepId, {
          isValid,
          timestamp: now,
        });

        return isValid;
      } catch (error) {
        logger.error('Error validating step:', error);
        // Return cached value if available, even if stale
        if (cached) {
          return cached.isValid;
        }
        return false;
      }
    },
    [validateStepMutation],
  );

  // Invalidate cache for a specific step
  const invalidateStepCache = useCallback((stepId: string) => {
    stepValidationCache.current.delete(stepId);
  }, []);

  const doNotShowAgain = useCallback(async () => {
    await updateOnboardingStatus({ doNotShowAgain: true });
    setIsOpen(false);
  }, [updateOnboardingStatus]);

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
      invalidateStepCache,
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
      invalidateStepCache,
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
