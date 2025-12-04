'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { onboardingApi } from '@/lib/features/onboarding/onboardingApi';
import { useSelector } from 'react-redux';

import {
  Globe,
  Bot,
  Mail,
  Calendar,
  Clock,
  HardDrive,
  Users,
  Palette,
  ShieldCheck,
} from 'lucide-react';

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

export interface StepStatus {
  [stepId: string]: boolean;
}

export interface ValidateResponse {
  isValid: boolean;
  progress: OnboardingProgress;
  stepStatus: StepStatus;
}

export interface StatusResponse {
  onboardingStatus: OnboardingStatus;
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
  refreshProgress: (status: OnboardingStatus | null) => Promise<void>; // ← UPDATED
  doNotShowAgain: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);
interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);

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

  useEffect(() => {
    if (!isLoading && onboardingStatus && user?.role === 'admin') {
      const shouldShow = !onboardingStatus.isCompleted
        && !onboardingStatus.doNotShowAgain
        && (progress?.percentage || 0) < 50
        && onboardingStatus.currentStep === 0;

      if (shouldShow) {
        setTimeout(() => setIsOpen(true), 1000);
      }
    }
  }, [isLoading, onboardingStatus, progress, user?.role]);

  const fetchOnboardingData = async () => {
    try {
      setIsLoading(true);

      // 1) Load STATUS first
      const status = await onboardingApi.getStatus();
      if (status) {
        setOnboardingStatus(status);
        setCurrentStepIndex(status.currentStep || 0);

        // 2) Always refresh using the latest status
        await refreshProgress(status);
      }
    } catch (error) {
      console.error('Error loading onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProgress = async (status: OnboardingStatus | null) => {
    try {
      const data = await onboardingApi.validate();
      if (!data) return;

      setProgress(data.progress);
      console.log(data.progress, 'data.progress');

      // SAFELY MAP STEPS
      const updatedSteps = getDefaultSteps().map((step) => ({
        ...step,
        isCompleted: data.stepStatus[step.id] || false,
        isSkipped: status?.skippedSteps.includes(step.id) || false,
      }));

      setSteps(updatedSteps);
    } catch (error) {
      console.error('Error refreshing progress:', error);
    }
  };

  const updateOnboardingStatus = async (
    updates: Partial<OnboardingStatus>,
  ) => {
    try {
      const updatedStatus = await onboardingApi.updateStatus(updates);
      if (!updatedStatus) return;

      setOnboardingStatus(updatedStatus);

      // REFRESH WITH NEWEST STATUS
      await refreshProgress(updatedStatus);
    } catch (error) {
      console.error('Error updating status:', error);
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

  const validateStep = async (stepId: string): Promise<boolean> => await onboardingApi.validateStep(stepId);

  const doNotShowAgain = async () => {
    await updateOnboardingStatus({ doNotShowAgain: true });
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
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within provider');
  return ctx;
};

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
    id: 'captcha',
    title: 'Captcha Verification',
    description: 'Enable captcha for verifying user interactions',
    icon: ShieldCheck,
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
