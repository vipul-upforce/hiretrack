/**
 * Debounced counts refetch trigger: fires only on SSE events that can change
 * lane totals for the current job (status move, archive, job switch, removal).
 * Seeds fingerprints on mount so the org-wide SSE buffer does not mass-invalidate.
 */

import { useEffect, useRef, useState } from 'react';
import {
  buildMembershipFingerprint,
  buildRemovalFingerprint,
  isCountMembershipChange,
  type SseCandidateWithMeta,
  type SseRemovedCandidate,
} from '../utils/sseCountInvalidation';

interface UseSseCountInvalidationProps {
  jobId: string;
  enabled?: boolean;
  sseCandidates?: SseCandidateWithMeta[] | null;
  removedCandidates?: SseRemovedCandidate[] | null;
  laneIdToName?: Record<string, string>;
}

export function useSseCountInvalidation({
  jobId,
  enabled = true,
  sseCandidates,
  removedCandidates,
  laneIdToName,
}: UseSseCountInvalidationProps): string {
  const [invalidationSig, setInvalidationSig] = useState('');
  const memberFingerprintsRef = useRef<Map<string, string>>(new Map());
  const processedRemovalsRef = useRef<Set<string>>(new Set());
  const isSeededRef = useRef(false);
  const invalidationSeqRef = useRef(0);

  useEffect(() => {
    memberFingerprintsRef.current.clear();
    processedRemovalsRef.current.clear();
    isSeededRef.current = false;
  }, [jobId]);

  useEffect(() => {
    if (!enabled) {
      isSeededRef.current = false;
      return;
    }

    const currentJobId = String(jobId ?? '');
    if (!currentJobId) return;

    if (!isSeededRef.current) {
      sseCandidates?.forEach((candidate) => {
        const fingerprint = buildMembershipFingerprint(
          candidate,
          currentJobId,
          laneIdToName,
        );
        if (fingerprint) {
          memberFingerprintsRef.current.set(candidate._id, fingerprint);
        }
      });
      removedCandidates?.forEach((removed) => {
        const removalFp = buildRemovalFingerprint(removed, currentJobId);
        if (removalFp) processedRemovalsRef.current.add(removalFp);
      });
      isSeededRef.current = true;
      return;
    }

    const events: string[] = [];

    sseCandidates?.forEach((candidate) => {
      const fingerprint = buildMembershipFingerprint(
        candidate,
        currentJobId,
        laneIdToName,
      );
      if (!fingerprint) return;

      const previous = memberFingerprintsRef.current.get(candidate._id);
      if (isCountMembershipChange(previous, fingerprint)) {
        events.push(fingerprint);
      }
      memberFingerprintsRef.current.set(candidate._id, fingerprint);
    });

    removedCandidates?.forEach((removed) => {
      const removalFp = buildRemovalFingerprint(removed, currentJobId);
      if (!removalFp || processedRemovalsRef.current.has(removalFp)) return;
      processedRemovalsRef.current.add(removalFp);
      events.push(removalFp);
    });

    if (events.length === 0) return;

    invalidationSeqRef.current += 1;
    setInvalidationSig(
      `${invalidationSeqRef.current}:${events.join(';')}`,
    );
  }, [
    jobId,
    enabled,
    sseCandidates,
    removedCandidates,
    laneIdToName,
  ]);

  return invalidationSig;
}
