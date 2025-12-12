import { OrgInfo } from "@/lib/models/user";

export interface LoginFormValues {
  email: string;
  password: string;
}
export interface UserWithoutCF {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
  organizationInfo?: OrgInfo;
  tokenVersion?: number;
}
