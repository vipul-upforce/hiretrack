export interface SignupFormValues {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  organizationInfo?: { name: string };
  termsAccepted?: boolean;
}

export interface PortalSettings {
  portalLogo: string | null;
  portalLogoDark: string | null;
  portalFavicon: string | null;
  portalName: string;
  primaryColor: string;
  secondaryColor: string;
  isLoading: boolean;
  hasError: boolean;
}
