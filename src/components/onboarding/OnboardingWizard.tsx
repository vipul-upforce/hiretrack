"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOnboarding } from './OnboardingProvider';
import { ChevronLeft, ChevronRight, X, Check, SkipForward } from 'lucide-react';
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

  const totalSteps = steps.length + 2; // +2 for welcome and completion steps
  const currentStep = currentStepIndex;
  const currentStepData = steps[currentStepIndex - 1]; // -1 because first step is welcome

  const handleNext = async () => {
    if (currentStep === 0) {
      // Welcome step
      setCurrentStepIndex(1);
      return;
    }
    
    if (currentStep === totalSteps - 1) {
      // Completion step
      handleFinish();
      return;
    }

    // Regular step
    if (currentStepData) {
      const isValid = await validateStep(currentStepData.id);
      if (isValid) {
        await completeStep(currentStepData.id);
      }
    }

    const nextStep = currentStep + 1;
    setCurrentStepIndex(nextStep);
    await updateOnboardingStatus({ currentStep: nextStep });
  };

  const handlePrevious = async () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStepIndex(prevStep);
      await updateOnboardingStatus({ currentStep: prevStep });
    }
  };

  const handleSkip = async () => {
    if (currentStepData) {
      await skipStep(currentStepData.id);
    }
    
    const nextStep = currentStep + 1;
    setCurrentStepIndex(nextStep);
    await updateOnboardingStatus({ currentStep: nextStep });
  };

  const handleFinish = async () => {
    await updateOnboardingStatus({ isCompleted: true });
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep />;
      case totalSteps - 1:
        return <CompletionStep />;
      default:
        const stepData = steps[currentStep - 1];
        if (!stepData) return null;
        
        switch (stepData.id) {
          case 'portal':
            return <PortalConfigStep />;
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
    }
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / totalSteps) * 100;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Progress Bar Section */}
      <div className="bg-muted/30 dark:bg-muted/20 px-8 py-6 border-b border-border/40 flex-shrink-0">
        <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-foreground">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-sm text-muted-foreground bg-background px-3 py-1 rounded-full border">
                {progress ? `${progress.completed}/${progress.total} configured` : '0/8 configured'}
              </span>
            </div>
            <Progress 
              value={getProgressPercentage()} 
              className="h-3 bg-background border"
            />
          </div>

        {/* Progress Indicator */}
        {currentStep > 0 && currentStep < totalSteps - 1 && (
          <div className="mt-6">
            <ProgressIndicator />
          </div>
        )}
      </div>

      {/* Scrollable Step Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 min-h-0">
        {renderStepContent()}
      </div>

      {/* Fixed Navigation Footer */}
      <div className="bg-muted/30 dark:bg-muted/20 px-8 py-6 border-t border-border/40 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            {currentStep === 0 ? (
              <Button
                variant="outline"
                onClick={doNotShowAgain}
                className="text-muted-foreground hover:text-destructive hover:border-destructive/50"
              >
                <X className="w-4 h-4 mr-2" />
                Don't show again
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && currentStep < totalSteps - 1 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip
              </Button>
            )}
            
            {currentStep < totalSteps - 1 ? (
              <Button 
                onClick={handleNext}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleFinish} 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
              >
                <Check className="w-4 h-4 mr-2" />
                Finish Setup
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;