'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X, Check, SkipForward } from 'lucide-react';
import ConfirmationDialog from '@/app/dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog';
import logger from '@/lib/logger';
import { useOnboarding } from './OnboardingProvider';
import ProgressIndicator from './ProgressIndicator';
import WelcomeStep from './steps/WelcomeStep';
import PortalConfigStep from './steps/PortalConfigStep';
import AIProviderStep from './steps/AIProviderStep';
import EmailConfigStep from './steps/EmailConfigStep';
import CalendarStep from './steps/CalendarStep';
import TimezoneStep from './steps/TimezoneStep';
import StorageStep from './steps/StorageStep';
import UsersStep from './steps/UsersStep';
import CustomFieldsStep from './steps/CustomFieldsStep';
import CompletionStep from './steps/CompletionStep';
import CaptchaConfigStep from './steps/CaptchaConfigStep';

function OnboardingWizard() {
  const {
    setIsOpen,
    currentStepIndex,
    setCurrentStepIndex,
    steps,
    progress,
    onboardingStatus,
    validateStep,
    doNotShowAgain,
    updateOnboardingStatus,
    invalidateStepCache,
  } = useOnboarding();
  const [isCurrentConfigured, setIsCurrentConfigured] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);
  const validationInProgressRef = useRef(false);
  const lastValidatedStepIdRef = useRef<string | null>(null);
  const previousConfiguredStateRef = useRef<boolean | null>(null);
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isManualNavigationRef = useRef(false);

  // Total steps including Welcome + Completion
  const totalSteps = steps.length + 2;

  const currentStep = currentStepIndex;
  const currentStepData =
    currentStep > 0 && currentStep < totalSteps - 1
      ? steps[currentStep - 1]
      : null;

  // Validate current step - optimized to prevent duplicate calls
  useEffect(() => {
    const validate = async () => {
      if (!currentStepData) {
        setIsCurrentConfigured(false);
        lastValidatedStepIdRef.current = null;
        previousConfiguredStateRef.current = null;
        return;
      }

      const stepId = currentStepData.id;

      // Skip if already validating this step
      if (validationInProgressRef.current) {
        return;
      }

      // If step ID changed, reset validation state and invalidate cache
      if (lastValidatedStepIdRef.current !== stepId) {
        lastValidatedStepIdRef.current = stepId;
        previousConfiguredStateRef.current = null;
        // Invalidate cache for the new step to ensure fresh validation
        invalidateStepCache(stepId);
      }

      validationInProgressRef.current = true;
      try {
        // Force refresh when step ID changes to get latest status
        const forceRefresh = lastValidatedStepIdRef.current !== stepId;
        const valid = await validateStep(stepId, forceRefresh);
        setIsCurrentConfigured(valid);
        lastValidatedStepIdRef.current = stepId;
      } catch (error) {
        logger.error('Validation error:', error);
        setIsCurrentConfigured(false);
      } finally {
        validationInProgressRef.current = false;
      }
    };

    // Validate when step ID changes
    const stepId = currentStepData?.id;
    if (stepId) {
      validate();
    } else {
      setIsCurrentConfigured(false);
      lastValidatedStepIdRef.current = null;
      previousConfiguredStateRef.current = null;
    }
  }, [currentStep, currentStepData?.id, validateStep, invalidateStepCache]);

  // Watch for changes in step completion status from the steps array
  // This catches updates when step components trigger validation and refreshProgress updates
  useEffect(() => {
    if (!currentStepData) return;

    const stepCompleted = currentStepData.isCompleted ?? false;
    const stepId = currentStepData.id;

    // Only update if:
    // - We're on this step (lastValidatedStepIdRef matches)
    // - The state actually changed
    // - Not currently validating (to avoid race conditions)
    if (
      lastValidatedStepIdRef.current === stepId &&
      isCurrentConfigured !== stepCompleted &&
      !validationInProgressRef.current
    ) {
      // Track previous state before updating (only if not already set)
      if (previousConfiguredStateRef.current === null) {
        previousConfiguredStateRef.current = isCurrentConfigured;
      }
      setIsCurrentConfigured(stepCompleted);

      // If step became configured, invalidate cache to ensure fresh validation
      if (stepCompleted && !isCurrentConfigured) {
        invalidateStepCache(stepId);
      }
    }
  }, [
    currentStepData?.isCompleted,
    currentStepData?.id,
    isCurrentConfigured,
    invalidateStepCache,
  ]);

  // Auto-advance when step becomes configured
  useEffect(() => {
    // Clear any pending auto-advance timeout
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    if (
      currentStep === 0 ||
      currentStep === totalSteps - 1 ||
      !isCurrentConfigured ||
      previousConfiguredStateRef.current === true ||
      previousConfiguredStateRef.current === null ||
      isManualNavigationRef.current ||
      validationInProgressRef.current ||
      !currentStepData ||
      !onboardingStatus
    ) {
      // Update previous state for next check
      if (previousConfiguredStateRef.current !== isCurrentConfigured) {
        previousConfiguredStateRef.current = isCurrentConfigured;
      }
      // Reset manual navigation flag after a short delay
      if (isManualNavigationRef.current) {
        setTimeout(() => {
          isManualNavigationRef.current = false;
        }, 500);
      }
      return;
    }

    // Only auto-advance if transitioning from false to true
    if (
      previousConfiguredStateRef.current === false &&
      isCurrentConfigured === true
    ) {
      logger.info(
        { stepId: currentStepData.id, stepIndex: currentStep },
        'Step configured, auto-advancing to next step',
      );

      // Auto-advance after a short delay for better UX
      autoAdvanceTimeoutRef.current = setTimeout(async () => {
        const nextStep = currentStep + 1;
        setCurrentStepIndex(nextStep);

        // Update onboarding status with completed step
        const updated = {
          ...onboardingStatus,
          completedSteps: Array.from(
            new Set([...onboardingStatus.completedSteps, currentStepData.id]),
          ),
          skippedSteps: onboardingStatus.skippedSteps.filter(
            (x) => x !== currentStepData.id,
          ),
          currentStep: nextStep,
        };
        await updateOnboardingStatus(updated);
        // Reset validation ref to allow re-validation on next step
        lastValidatedStepIdRef.current = null;
        previousConfiguredStateRef.current = null;
      }, 1500); // 1.5 second delay for user to see the success state
    } else {
      // Update previous state if no transition detected
      previousConfiguredStateRef.current = isCurrentConfigured;
    }
  }, [
    isCurrentConfigured,
    currentStep,
    totalSteps,
    currentStepData,
    onboardingStatus,
    updateOnboardingStatus,
  ]);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (autoAdvanceTimeoutRef.current) {
        clearTimeout(autoAdvanceTimeoutRef.current);
      }
    },
    [],
  );

  // Finish onboarding
  const handleFinish = async () => {
    await updateOnboardingStatus({ isCompleted: true });
    setIsOpen(false);
  };

  // Next button - optimized to reduce API calls
  const handleNext = useCallback(async () => {
    // Clear any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    // Mark as manual navigation to prevent auto-advance
    isManualNavigationRef.current = true;

    if (currentStep === 0) {
      setCurrentStepIndex(1);
      await updateOnboardingStatus({ currentStep: 1 });
      return;
    }

    if (currentStep === totalSteps - 1) {
      handleFinish();
      return;
    }

    // Use already validated state instead of calling validateStep again
    // The useEffect already validates and updates isCurrentConfigured
    const nextStep = currentStep + 1;
    setCurrentStepIndex(nextStep);

    if (currentStepData && onboardingStatus) {
      if (isCurrentConfigured) {
        // Batch completion and step update into a single API call
        const updated = {
          ...onboardingStatus,
          completedSteps: Array.from(
            new Set([...onboardingStatus.completedSteps, currentStepData.id]),
          ),
          skippedSteps: onboardingStatus.skippedSteps.filter(
            (x) => x !== currentStepData.id,
          ),
          currentStep: nextStep,
        };
        await updateOnboardingStatus(updated);
      } else {
        // If not configured, mark as skipped and move to next step
        const updated = {
          ...onboardingStatus,
          skippedSteps: Array.from(
            new Set([...onboardingStatus.skippedSteps, currentStepData.id]),
          ),
          completedSteps: onboardingStatus.completedSteps.filter(
            (x) => x !== currentStepData.id,
          ),
          currentStep: nextStep,
        };
        await updateOnboardingStatus(updated);
        // Reset validation ref to allow re-validation on next step
        lastValidatedStepIdRef.current = null;
      }
    } else {
      // If no current step data, just move to next step
      await updateOnboardingStatus({ currentStep: nextStep });
      // Reset validation ref to allow re-validation on next step
      lastValidatedStepIdRef.current = null;
    }

    // Reset previous state for next step
    previousConfiguredStateRef.current = null;
  }, [
    currentStep,
    totalSteps,
    currentStepData,
    isCurrentConfigured,
    onboardingStatus,
    updateOnboardingStatus,
    handleFinish,
  ]);

  // Previous button
  const handlePrevious = async () => {
    if (currentStep === 0) return;

    // Clear any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    // Mark as manual navigation to prevent auto-advance
    isManualNavigationRef.current = true;

    const prevStep = currentStep - 1;
    setCurrentStepIndex(prevStep);
    // Force immediate refresh when going back to show latest validation status
    await updateOnboardingStatus({ currentStep: prevStep }, true);
    // Reset validation ref to allow re-validation when navigating back
    lastValidatedStepIdRef.current = null;
    previousConfiguredStateRef.current = null;
  };

  // Skip button - optimized to batch updates
  const handleSkip = useCallback(async () => {
    if (!currentStepData || !onboardingStatus) return;

    // Clear any pending auto-advance
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }

    // Mark as manual navigation to prevent auto-advance
    isManualNavigationRef.current = true;

    const nextStep = currentStep + 1;
    setCurrentStepIndex(nextStep);

    // Batch skip and step update into a single API call
    const updated = {
      ...onboardingStatus,
      skippedSteps: Array.from(
        new Set([...onboardingStatus.skippedSteps, currentStepData.id]),
      ),
      completedSteps: onboardingStatus.completedSteps.filter(
        (x) => x !== currentStepData.id,
      ),
      currentStep: nextStep,
    };
    await updateOnboardingStatus(updated);
    // Reset validation ref to allow re-validation on next step
    lastValidatedStepIdRef.current = null;
    previousConfiguredStateRef.current = null;
  }, [currentStep, currentStepData, onboardingStatus, updateOnboardingStatus]);

  const renderStepContent = () => {
    if (currentStep === 0) return <WelcomeStep />;
    if (currentStep === totalSteps - 1) return <CompletionStep />;

    if (!currentStepData) return null;

    switch (currentStepData.id) {
      case 'portal':
        return <PortalConfigStep />;
      case 'captcha':
        return <CaptchaConfigStep />;
      case 'aiProviders':
        return <AIProviderStep />;
      case 'email':
        return <EmailConfigStep />;
      case 'calendar':
        return <CalendarStep />;
      case 'timezone':
        return <TimezoneStep />;
      case 'storage':
        return <StorageStep />;
      case 'users':
        return <UsersStep />;
      case 'customFields':
        return <CustomFieldsStep />;
      default:
        return <div>Step not implemented</div>;
    }
  };

  const getProgressPercentage = () => ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      <div className="flex h-full flex-col">
        {/* HEADER */}
        <div className="flex-shrink-0 border-b bg-muted/30 px-8 py-6 dark:bg-muted/20">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">
                Step {currentStep + 1} of {totalSteps}
              </span>

              <span className="rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
                {progress
                  ? `${progress.completed}/${progress.total} configured`
                  : '0/9 configured'}
              </span>
            </div>

            <Progress
              value={getProgressPercentage()}
              className="h-3 border bg-background"
            />
          </div>

          {currentStep > 0 && currentStep < totalSteps - 1 && (
            <div className="mt-6">
              <ProgressIndicator />
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderStepContent()}
        </div>

        {/* FOOTER */}
        <div className="flex-shrink-0 border-t bg-muted/30 px-8 py-6 dark:bg-muted/20">
          <div className="flex items-center justify-between">
            {/* LEFT BUTTONS */}
            {currentStep === 0 ? (
              <Button
                variant="outline"
                onClick={() => setShowDismissDialog(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Don&apos;t show again
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
            )}

            {/* RIGHT BUTTONS */}
            <div className="flex gap-3">
              {currentStep > 0 && currentStep < totalSteps - 1 && (
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  disabled={isCurrentConfigured}
                  className={
                    isCurrentConfigured ? 'cursor-not-allowed opacity-50' : ''
                  }
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip
                </Button>
              )}

              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={handleNext}
                  variant="primary"
                  className="text-white"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Finish Setup
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG: Don't show again */}
      <ConfirmationDialog
        isOpen={showDismissDialog}
        setIsOpen={setShowDismissDialog}
        title="Dismiss Onboarding"
        message="Are you sure you want to dismiss the onboarding guide?"
        onConfirm={() => {
          doNotShowAgain(); // Call the function to dismiss the onboarding
          setShowDismissDialog(false); // Close the dialog
        }}
        onCancel={() => setShowDismissDialog(false)} // Close the dialog without action
      />
    </>
  );
}

export default OnboardingWizard;
