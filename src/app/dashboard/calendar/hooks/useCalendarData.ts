import { useEffect, useMemo } from 'react';
import { useFetchAssignedCandidatesQuery } from '@/lib/features/candidate/candidateApi';
import { useSSE } from '@/hooks/useSSE';
import useRoles from '@/hooks/useRoles';
import { useSelector } from 'react-redux';
import { Candidate } from '@/types/candidate';
import { CandidateAssignment, CustomCalendarEvent } from '../types';

export function useCalendarData(
  setSelectedEvent: () => void,
  selectedEvent: unknown,
) {
  const {
    data: assignments,
    isLoading,
    refetch,
  } = useFetchAssignedCandidatesQuery();

  const { user } = useSelector(
    (state: { auth?: { user?: unknown } }) => state.auth || {},
  );
  const role = useRoles();
  const { candidates: sseCandidates } = useSSE(
    setSelectedEvent as (
      candidate: Candidate | CustomCalendarEvent | null,
    ) => void,
    selectedEvent as Candidate | CustomCalendarEvent | null,
  );

  useEffect(() => {
    refetch();
  }, [refetch]);

  const sseUpdatesMap = useMemo(
    () => new Map(sseCandidates.map((c: CandidateAssignment) => [c._id, c])),
    [sseCandidates],
  );

  const mergedAssignments = useMemo(() => {
    const baseAssignments =
      assignments && assignments[0]?.data ? [...assignments[0].data] : [];

    const merged = baseAssignments
      .map((assignment: CandidateAssignment) => {
        const sseUpdate = sseUpdatesMap.get(assignment._id);

        if (sseUpdate) {
          if (role === 'interviewer') {
            const interviewerId =
              typeof sseUpdate.assignment?.interviewerId === 'object'
                ? sseUpdate.assignment?.interviewerId?._id
                : sseUpdate.assignment?.interviewerId;

            if (interviewerId === (user as { id?: string })?.id) {
              return sseUpdate;
            }
            return null;
          }
          return sseUpdate;
        }

        return assignment;
      })
      .filter(Boolean) as CandidateAssignment[];

    sseCandidates.forEach((sseCandidate: CandidateAssignment) => {
      const existsInDb = baseAssignments.some(
        (a: CandidateAssignment) => a._id === sseCandidate._id,
      );

      if (!existsInDb) {
        if (role === 'interviewer') {
          const interviewerId =
            typeof sseCandidate.assignment?.interviewerId === 'object'
              ? sseCandidate.assignment?.interviewerId?._id
              : sseCandidate.assignment?.interviewerId;

          if (interviewerId === (user as { id?: string })?.id) {
            merged.push(sseCandidate);
          }
        } else {
          merged.push(sseCandidate);
        }
      }
    });

    return merged;
  }, [assignments, sseUpdatesMap, sseCandidates, role, user]);

  return {
    assignments: mergedAssignments,
    isLoading,
    refetch,
    user,
    role,
  };
}
