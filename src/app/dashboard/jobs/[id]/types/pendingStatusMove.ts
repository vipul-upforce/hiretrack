import type { Candidate } from '@/types/candidate';

/** Optimistic cross-lane move while grouped page-1 / SSE catches up. */
export interface PendingStatusMove {
  candidateId: string;
  status: string;
  /**
   * Full candidate from cursor pagination or drag resolution when not on grouped page-1.
   */
  candidateSnapshot?: Candidate;
}
