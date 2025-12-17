import type React from 'react';
import {
  Bot,
  Calendar,
  Clock,
  Globe,
  HardDrive,
  Mail,
  Palette,
  ShieldCheck,
  Users,
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

export const getDefaultSteps = (): OnboardingStep[] => [
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
