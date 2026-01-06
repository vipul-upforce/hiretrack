'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, X, Check, SkipForward } from 'lucide-react';
import ConfirmationDialog from '@/app/dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog';
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
    completeStep,
    skipStep,
    validateStep,
    doNotShowAgain,
    updateOnboardingStatus,
  } = useOnboarding();
  const [isCurrentConfigured, setIsCurrentConfigured] = useState(false);
  const [showDismissDialog, setShowDismissDialog] = useState(false);

  // Total steps including Welcome + Completion
  const totalSteps = steps.length + 2;

  const currentStep = currentStepIndex;
  const currentStepData =
    currentStep > 0 && currentStep < totalSteps - 1
      ? steps[currentStep - 1]
      : null;

  // Validate current step
  useEffect(() => {
    const validate = async () => {
      if (!currentStepData) {
        setIsCurrentConfigured(false);
        return;
      }
      const valid = await validateStep(currentStepData.id);
      setIsCurrentConfigured(valid);
    };
    validate();
  }, [currentStep, currentStepData, validateStep]);

  // Finish onboarding
  const handleFinish = async () => {
    await updateOnboardingStatus({ isCompleted: true });
    setIsOpen(false);
  };
  // Next button
  const handleNext = async () => {
    if (currentStep === 0) {
      setCurrentStepIndex(1);
      await updateOnboardingStatus({ currentStep: 1 });
      return;
    }

    if (currentStep === totalSteps - 1) {
      handleFinish();
      return;
    }

    if (currentStepData) {
      const valid = await validateStep(currentStepData.id);
      if (valid) await completeStep(currentStepData.id);
    }

    const nextStep = currentStep + 1;
    setCurrentStepIndex(nextStep);
    await updateOnboardingStatus({ currentStep: nextStep });
  };

  // Previous button
  const handlePrevious = async () => {
    if (currentStep === 0) return;

    const prevStep = currentStep - 1;
    setCurrentStepIndex(prevStep);
    await updateOnboardingStatus({ currentStep: prevStep });
  };

  // Skip button
  const handleSkip = async () => {
    if (currentStepData) await skipStep(currentStepData.id);

    const nextStep = currentStep + 1;
    setCurrentStepIndex(nextStep);
    await updateOnboardingStatus({ currentStep: nextStep });
  };

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
