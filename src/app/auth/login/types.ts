import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';

export interface LoginFormValues {
  email: string;
  password: string;
  rememberMe?: boolean;
  companyName?: string;
}

export interface BrandingConfig {
  portalName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export type { OneOfMulOrganization };
