import { OrgInfo } from '@/lib/models/user';

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
  tokenVersion?: number| undefined | null;
  fileStorage?: string| undefined | null;
  appliedApplications?: string[]| undefined | null;
}
export interface IAccessTokenPayload {
  id: string;
  name?: string;
  email: string;
  role: string;
  organizationId: string;
  tokenVersion?: number| undefined | null;
  fileStorage?: string| undefined | null;
  isCandidate?: boolean;
  appliedApplications?: string[]| undefined | null;

}
