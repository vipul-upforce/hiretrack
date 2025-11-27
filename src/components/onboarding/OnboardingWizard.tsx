"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useOnboarding } from "./OnboardingProvider";
import { ChevronLeft, ChevronRight, X, Check, SkipForward } from "lucide-react";
import ProgressIndicator from "./ProgressIndicator";
import WelcomeStep from "./steps/WelcomeStep";
import PortalConfigStep from "./steps/PortalConfigStep";
import AIProviderStep from "./steps/AIProviderStep";
import EmailConfigStep from "./steps/EmailConfigStep";
import CalendarStep from "./steps/CalendarStep";
import TimezoneStep from "./steps/TimezoneStep";
import StorageStep from "./steps/StorageStep";
import UsersStep from "./steps/UsersStep";
import CustomFieldsStep from "./steps/CustomFieldsStep";
import CompletionStep from "./steps/CompletionStep";
import CaptchaConfigStep from "./steps/CaptchaConfigStep";
import ConfirmationDialog from "@/app/dashboard/jobs/[id]/components/Dialogs/ConfirmationDialog";


const OnboardingWizard: React.FC = () => {
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
  }, [currentStep, currentStepData]);

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

  // Finish onboarding
  const handleFinish = async () => {
    await updateOnboardingStatus({ isCompleted: true });
    setIsOpen(false);
  };

  const renderStepContent = () => {
    if (currentStep === 0) return <WelcomeStep />;
    if (currentStep === totalSteps - 1) return <CompletionStep />;

    if (!currentStepData) return null;

    switch (currentStepData.id) {
      case "portal":
        return <PortalConfigStep />;
      case "captcha":
        return <CaptchaConfigStep />;
      case "aiProviders":
        return <AIProviderStep />;
      case "email":
        return <EmailConfigStep />;
      case "calendar":
        return <CalendarStep />;
      case "timezone":
        return <TimezoneStep />;
      case "storage":
        return <StorageStep />;
      case "users":
        return <UsersStep />;
      case "customFields":
        return <CustomFieldsStep />;
      default:
        return <div>Step not implemented</div>;
    }
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / totalSteps) * 100;
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* HEADER */}
        <div className="bg-muted/30 dark:bg-muted/20 px-8 py-6 border-b flex-shrink-0">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">
                Step {currentStep + 1} of {totalSteps}
              </span>

              <span className="text-sm text-muted-foreground bg-background px-3 py-1 rounded-full border">
                {progress
                  ? `${progress.completed}/${progress.total} configured`
                  : "0/9 configured"}
              </span>
            </div>

            <Progress
              value={getProgressPercentage()}
              className="h-3 bg-background border"
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
        <div className="bg-muted/30 dark:bg-muted/20 px-8 py-6 border-t flex-shrink-0">
          <div className="flex justify-between items-center">
            {/* LEFT BUTTONS */}
            {currentStep === 0 ? (
              <Button
                variant="outline"
                onClick={() => setShowDismissDialog(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4 mr-2" />
                Don't show again
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePrevious}>
                <ChevronLeft className="w-4 h-4 mr-2" />
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
                    isCurrentConfigured
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Skip
                </Button>
              )}

              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={handleNext}
                  variant="primary"
                  className=" text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
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
};

export default OnboardingWizard;
