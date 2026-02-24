import {
  LogAttachment,
  LogCandidate,
  LogJob,
  LogNote,
  LogRemark,
  LogUser,
} from '@/lib/features/settings';

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

export interface ServerHistoryLogsProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
}
