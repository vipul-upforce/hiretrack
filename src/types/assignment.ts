import { Attachment } from '@/app/api/candidates/route';
import { Job } from './job';

export interface Assignment {
  interviewerId:
    | string
    | { _id: string; name: string; email: string; duration?: string };
  time: string;
  duration?: string;
  assignedAt: string;
  jobId?: string | Job;
  googleMeet?: {
    eventId: string;
    meetingLink: string;
    htmlLink: string;
    summary: string;
    description: string;
    meetingAttachments?: Attachment[];
    meetingNotes?: string;
    attendeeResponses?: Array<{
      email: string;
      name?: string;
      responseStatus: 'needsAction' | 'accepted' | 'declined' | 'tentative';
      comment?: string;
      lastUpdated: Date;
      notificationSent?: boolean;
    }>;
    lastSyncedAt?: Date;
  };
  zoomMeet?: {
    meetingId: string;
    meetingLink: string;
    startUrl?: string;
    eventId?: string;
    htmlLink?: string;
    summary?: string;
    description?: string;
    meetingAttachments?: Attachment[];
    meetingNotes?: string;
    lastSyncedAt?: Date;
  };
}
