'use client';

import { useCallback } from 'react';
import type { Candidate, Remark } from '@/types/candidate';
import type { Job } from '@/types/job';
import { Attachment } from '@/app/api/candidates/route';
import { IUser as User } from '@/lib/models/user';

export type LogEntry = {
  candidateId: string;
  jobId: string;
  candidateData: Candidate;
  jobData: Job;
  dateTime: string;
  assignmentBy: User | null;
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
  note: { description: string; date: string; rating: number; userId: string[] };
  attachments: Attachment[];
};

/**
 * Hook to render a log title string
 * for candidate/job activity logs.
 */
export function useRenderLogTitle() {
  const renderLogTitle = useCallback((log: LogEntry): string => {
    const noteDescription =
      typeof log?.note?.description === 'string' ? log.note.description : '';

    if (
      (log.title !== '' || !log.title) &&
      log.title !== 'Assigned to Job' &&
      !log.title?.includes('Followup') &&
      !log.title?.startsWith('Direct Email') &&
      !log.title?.startsWith('Email sent: ') &&
      !noteDescription.startsWith('Email sent')
    ) {
      // CASE 1: Assigned / Reassigned
      if (
        Array.isArray(log.currentInterviewer) &&
        log.currentInterviewer.length > 0
      ) {
        if (
          Array.isArray(log.previousInterviewer) &&
          log.previousInterviewer.length > 0
        ) {
          return `${log.previousInterviewer[0].name} → ${log.currentInterviewer[0].name}`;
        }
        return `Assigned to ${log.currentInterviewer[0].name}`;
      }

      // CASE 2: Remark Added
      if (log.remark && log.remark.description) {
        return log.title || 'Remark Added';
      }

      // CASE 3: Candidate Added
      if (log.title === 'Candidate Added' && log.assignmentBy) {
        return `${log.candidateData?.name || 'Candidate'} was added by ${
          log.assignmentBy?.name || 'someone'
        }`;
      }

      // CASE 4: Self Applied
      if (log.title === 'Self Applied') {
        return `${log.candidateData?.name || 'Candidate'} applied from portal`;
      }

      // CASE 5: Updated
      if (log.title?.includes('Updated')) {
        return log.title;
      }

      // CASE 6: Archived / Unarchived
      if (log.title === 'Archived') {
        return `${log.candidateData?.name || 'Candidate'} was Archived`;
      }
      if (log.title === 'Unarchived') {
        return `${log.candidateData?.name || 'Candidate'} was Unarchived`;
      }

      // CASE 7: Unassigned
      if (
        Array.isArray(log.previousInterviewer) &&
        log.previousInterviewer.length > 0
      ) {
        return `Unassigned from ${log.previousInterviewer[0].name}`;
      }

      // Fallback
      return log.title || '—';
    }

    return log.title || '—';
  }, []);

  return { renderLogTitle };
}
