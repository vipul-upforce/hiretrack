export interface Assignment {
  interviewerId: string | { _id: string; name: string; email: string };
  deadline: string;
  assignedAt: string;
  status?: string;
  assignment?: {status: string;};
} 