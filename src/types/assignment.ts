import { Job } from "./job";

export interface Assignment {
  interviewerId: string | { _id: string; name: string; email: string };
  time: string;
  assignedAt: string;
  status?: string;
  assignment?: { status: string };
  jobId?: string | Job;
}
