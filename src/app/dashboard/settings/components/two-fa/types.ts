export interface TwoFAValues {
  enable2FA: boolean;
}

export interface TwoFASettingsProps {
  onClose: () => void;
}

// Typing for the RTK Query error
export interface ApiError {
  status?: number;
  data?: {
    error?: string;
  };
}
