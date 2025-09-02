"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSelector } from 'react-redux';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isCompleted: boolean;
  isSkipped: boolean;
  isRequired: boolean;
}

export interface OnboardingStatus {
  isCompleted: boolean;
  completedSteps: string[];
  skippedSteps: string[];
  doNotShowAgain: boolean;
  currentStep: number;
  lastUpdated: Date;
}

export interface OnboardingProgress {
  completed: number;
  total: number;
  percentage: number;
}

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
  refreshProgress: () => Promise<void>;
  doNotShowAgain: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log("OnboardingProvider - isOpen changed to:", isOpen);
  }, [isOpen]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useSelector((state: any) => state.auth || {});

  // Initialize onboarding data
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOnboardingData();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-open onboarding for new admins
  useEffect(() => {
    if (!isLoading && onboardingStatus && user?.role === 'admin') {
      // Show onboarding if:
      // 1. Not completed
      // 2. User hasn't chosen "do not show again"
      // 3. Progress is low (less than 50%)
      const shouldShowOnboarding =
        !onboardingStatus.isCompleted &&
        !onboardingStatus.doNotShowAgain &&
        (progress?.percentage || 0) < 50 &&
        onboardingStatus.currentStep === 0; // Only on first visit

      if (shouldShowOnboarding) {
        // Small delay to let the UI settle
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, [isLoading, onboardingStatus, progress, user?.role]);

  const fetchOnboardingData = async () => {
    try {
      setIsLoading(true);

      // Fetch onboarding status
      const statusResponse = await fetch('/api/onboarding/status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setOnboardingStatus(statusData.onboardingStatus);
        setCurrentStepIndex(statusData.onboardingStatus.currentStep || 0);
      }

      // Fetch validation progress
      await refreshProgress();

    } catch (error) {
      console.error('Error fetching onboarding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProgress = async () => {
    try {
      const validateResponse = await fetch('/api/onboarding/validate');
      if (validateResponse.ok) {
        const validateData = await validateResponse.json();
        setProgress(validateData.progress);

        // Update steps with validation status
        const updatedSteps = getDefaultSteps().map(step => ({
          ...step,
          isCompleted: validateData.stepStatus[step.id] || false,
          isSkipped: onboardingStatus?.skippedSteps.includes(step.id) || false,
        }));
        setSteps(updatedSteps);
      }
    } catch (error) {
      console.error('Error refreshing progress:', error);
    }
  };

  const updateOnboardingStatus = async (updates: Partial<OnboardingStatus>) => {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setOnboardingStatus(data.onboardingStatus);
        await refreshProgress();
      }
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    }
  };

  const completeStep = async (stepId: string) => {
    if (!onboardingStatus) return;

    const updatedCompletedSteps = [...onboardingStatus.completedSteps];
    if (!updatedCompletedSteps.includes(stepId)) {
      updatedCompletedSteps.push(stepId);
    }

    const updatedSkippedSteps = onboardingStatus.skippedSteps.filter(id => id !== stepId);

    await updateOnboardingStatus({
      completedSteps: updatedCompletedSteps,
      skippedSteps: updatedSkippedSteps,
    });
  };

  const skipStep = async (stepId: string) => {
    if (!onboardingStatus) return;

    const updatedSkippedSteps = [...onboardingStatus.skippedSteps];
    if (!updatedSkippedSteps.includes(stepId)) {
      updatedSkippedSteps.push(stepId);
    }

    const updatedCompletedSteps = onboardingStatus.completedSteps.filter(id => id !== stepId);

    await updateOnboardingStatus({
      completedSteps: updatedCompletedSteps,
      skippedSteps: updatedSkippedSteps,
    });
  };

  const validateStep = async (stepId: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarding/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: stepId }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.isValid;
      }
      return false;
    } catch (error) {
      console.error('Error validating step:', error);
      return false;
    }
  };

  const doNotShowAgain = async () => {
    await updateOnboardingStatus({
      doNotShowAgain: true,
    });
    setIsOpen(false);
  };

  const contextValue: OnboardingContextType = {
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
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// Define default steps - you can import these from a separate file
import { Globe, Bot, Mail, Calendar, Clock, HardDrive, Users, Palette } from 'lucide-react';

const getDefaultSteps = (): OnboardingStep[] => [
  {
    id: 'portal',
    title: 'Portal Configuration',
    description: 'Customize your portal branding and appearance',
    icon: Globe,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'aiProviders',
    title: 'AI Providers',
    description: 'Configure AI providers for resume processing',
    icon: Bot,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'email',
    title: 'Email Configuration',
    description: 'Set up email delivery for notifications',
    icon: Mail,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'calendar',
    title: 'Google Calendar',
    description: 'Connect Google Calendar for interview scheduling',
    icon: Calendar,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'timezone',
    title: 'Timezone',
    description: 'Set your organization timezone',
    icon: Clock,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'storage',
    title: 'File Storage',
    description: 'Configure cloud storage for files',
    icon: HardDrive,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'users',
    title: 'Add Users',
    description: 'Invite team members to your organization',
    icon: Users,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
  {
    id: 'customFields',
    title: 'Custom Fields',
    description: 'Create custom form fields for jobs and candidates',
    icon: Palette,
    isCompleted: false,
    isSkipped: false,
    isRequired: false,
  },
];