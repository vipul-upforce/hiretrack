import { Candidate, Remark } from '@/types/candidate';
import { Job } from '@/types/job';

export type LogEntry = {
  candidateId: string;
  jobId: string;
  candidateData: Candidate;
  jobData: Job;
  dateTime: string;
  assignmentBy: {
    _id: string;
    name: string;
    email: string;
  }[];
  currentInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  remark: Remark;
  previousInterviewer: {
    _id: string;
    name: string;
    email: string;
    role: string;
  }[];
  title: string;
  note: {
    description: string;
    date: string;
    rating: number;
    userId: string[];
  };
  attachments: any[];
};

export interface ServerHistoryLogsProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onError?: (msg: string | null) => void;
}
