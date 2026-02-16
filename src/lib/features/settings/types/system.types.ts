import { VersionListResponse } from '@/app/dashboard/settings/components/about/types';

export type { VersionListResponse };

export interface TakeSnapshotResponse {
  message: string;
  archive: string;
}

export interface DeleteBackupResponse {
  message: string;
}

export interface BackupFile {
  name: string;
  url: string;
  createdAt: string;
  size: number;
}

export interface GetBackupsResponse {
  files: BackupFile[];
}

export interface DiskFolderItem {
  name: string;
  relativePath: string;
  size: string;
  rawSize: number;
  type: 'file' | 'folder';
  childrenCount?: number;
}

export interface DiskFolder {
  name: string;
  path: string;
  size: string;
  type: 'folder';
}

export interface DiskStats {
  total: string;
  free: string;
  used: string;
  percentUsed: string;
  raw: { total: number; free: number; used: number };
}

export interface DiskSpaceResponse {
  success: boolean;
  diskStats?: DiskStats;
  folders: DiskFolder[];
}

export interface DiskFolderDetailResponse {
  success: boolean;
  root: string;
  currentPath: string;
  files: DiskFolderItem[];
}

export interface LogUser {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface LogCandidate {
  _id: string;
  name: string;
  email: string;
  location?: string;
  experience?: string | number;
  skills?: string[] | string;
  status?: string;
  expectedCTC?: string | number;
  currentCTC?: string | number;
  noticePeriod?: string | number;
  remarks?: {
    description?: string;
    date?: string;
    rating?: number;
    userId?: string;
  }[];
  scores?: {
    overall?: number;
    experience?: number;
    skills?: number;
    recommendation?: string;
  };
  resume?: {
    name?: string;
    url?: string;
    type?: string;
  };
}

export interface LogJob {
  _id: string;
  title: string;
  description?: string;
  skills?: string[] | string;
  experience?: string;
  status?: string;
  salary?: string;
  organizationId?: string;
}

export interface LogRemark {
  id?: string;
  isPrivate?: boolean;
  description?: string;
  date?: string;
  rating?: number;
  userId?: string;
}

export interface LogNote {
  userId: LogUser[];
  description?: string | string[];
}

export interface LogAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface LogEntry {
  candidateId: string;
  jobId: string;
  dateTime: string;
  title: string;
  candidateData?: LogCandidate;
  jobData?: LogJob;
  assignmentBy: LogUser[];
  currentInterviewer: LogUser[];
  previousInterviewer: LogUser[];
  remark?: LogRemark;
  note?: LogNote;
  attachments?: LogAttachment[];
}

export type SystemLogsResponse = {
  path: string;
  files: string[];
  sizeBytes: number;
  size: string;
};

export interface AutoUpdateResponse {
  autoUpdate: boolean;
  beta?: boolean;
}

export interface TriggerUpdateResponse {
  success: boolean;
  error?: string;
}
