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

// API Functions
export const onboardingApi = {
  // Get onboarding status
  async getStatus(): Promise<OnboardingStatus | null> {
    try {
      const response = await fetch('/api/onboarding/status', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const data: StatusResponse = await response.json();
      return data.onboardingStatus;
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
      return null;
    }
  },

  // Update onboarding status
  async updateStatus(updates: Partial<OnboardingStatus>): Promise<OnboardingStatus | null> {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (!response.ok) return null;
      const data: StatusResponse = await response.json();
      return data.onboardingStatus;
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      return null;
    }
  },

  // Validate onboarding steps
  async validate(): Promise<ValidateResponse | null> {
    try {
      const response = await fetch('/api/onboarding/validate', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const data: ValidateResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error validating onboarding:', error);
      return null;
    }
  },

  // Validate specific step
  async validateStep(stepId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/onboarding/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ step: stepId }),
      });
      if (!response.ok) return false;
      const data: { isValid: boolean } = await response.json();
      return data.isValid;
    } catch (error) {
      console.error('Error validating step:', error);
      return false;
    }
  },

  // Get current user
  async getCurrentUser(): Promise<{ user: any } | null> {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },
};
