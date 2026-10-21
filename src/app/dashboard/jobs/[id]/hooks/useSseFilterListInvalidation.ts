/**
 * Debounced grouped-kanban refetch trigger: fires when SSE changes filter-relevant
 * candidate fields (assignment, remarks, follow-up, etc.) for the current job.
 */

import { useEffect, useRef, useState } from 'react';
import type { Candidate } from '@/types/candidate';
import type { JobViewFilter } from '../utils/jobViewStorage';
import { hasActiveFilter } from '../utils/candidateViewFilter';
import {
  buildFilterListFingerprintForJob,
  isFilterListMembershipChange,
} from '../utils/sseFilterListInvalidation';

interface UseSseFilterListInvalidationProps {
  jobId: string;
  enabled?: boolean;
  viewFilter?: JobViewFilter | null;
  sseCandidates?: Candidate[] | null;
}

export function useSseFilterListInvalidation({
  jobId,
  enabled = true,
  viewFilter,
  sseCandidates,
}: UseSseFilterListInvalidationProps): string {
  const [invalidationSig, setInvalidationSig] = useState('');
  const fingerprintsRef = useRef<Map<string, string>>(new Map());
  const isSeededRef = useRef(false);
  const seqRef = useRef(0);

  const filtersActive = hasActiveFilter(viewFilter);

  useEffect(() => {
    fingerprintsRef.current.clear();
    isSeededRef.current = false;
  }, [jobId, viewFilter]);

  useEffect(() => {
    if (!enabled || !filtersActive) {
      isSeededRef.current = false;
      return;
    }

    const currentJobId = String(jobId ?? '');
    if (!currentJobId) return;

    if (!isSeededRef.current) {
      sseCandidates?.forEach((candidate) => {
        const fingerprint = buildFilterListFingerprintForJob(
          candidate,
          currentJobId,
          viewFilter,
        );
        if (fingerprint) {
          fingerprintsRef.current.set(candidate._id, fingerprint);
        }
      });
      isSeededRef.current = true;
      return;
    }

    const events: string[] = [];

    sseCandidates?.forEach((candidate) => {
      const fingerprint = buildFilterListFingerprintForJob(
        candidate,
        currentJobId,
        viewFilter,
      );
      if (!fingerprint) return;

      const previous = fingerprintsRef.current.get(candidate._id);
      if (previous === undefined) {
        // After seed: first time we see this id — refetch when it newly matches an active filter.
        const parts = fingerprint.split('|');
        const assignmentPart = parts.find((p) => p === 'a1' || p === 'a0');
        if (viewFilter?.assigned === true && assignmentPart === 'a1') {
          events.push(`new-visible:${fingerprint}`);
        } else if (viewFilter?.notAssigned === true && assignmentPart === 'a0') {
          events.push(`new-visible:${fingerprint}`);
        }
      } else if (isFilterListMembershipChange(previous, fingerprint)) {
        events.push(fingerprint);
      }
      fingerprintsRef.current.set(candidate._id, fingerprint);
    });

    if (events.length === 0) return;

    seqRef.current += 1;
    setInvalidationSig(`${seqRef.current}:${events.join(';')}`);
  }, [jobId, enabled, filtersActive, viewFilter, sseCandidates]);

  return invalidationSig;
}
