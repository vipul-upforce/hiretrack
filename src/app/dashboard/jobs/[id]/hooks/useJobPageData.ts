import { useParams } from 'next/navigation';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import {
  useGetLanesQuery,
  useGetJobLanesQuery,
} from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { useSSE } from '@/hooks/useSSE';
import { Candidate } from '@/types/candidate';
import { CustomCalendarEvent } from '@/app/dashboard/calendar/page';
import { useNormalizedCandidates } from './useNormalizedCandidates';
import { useCandidateState } from './useCandidateState';

/**
 * Consolidates all data fetching and queries for the job progress page.
 * Reduces boilerplate in the main component.
 */
export function useJobPageData() {
  const id = useParams()?.id as string;
  const { user } = useAppSelector((state) => state.auth || {});

  // Job data
  const {
    data: job,
    isLoading: isJobLoading,
    error: jobError,
  } = useFetchJobByIdQuery(id as string);
  const [updateJob, { isLoading: isUpdatingJob }] = useUpdateJobMutation();

  // Lanes data
  const { data: jobLanes, isLoading: isJobLanesLoading } = useGetJobLanesQuery(
    id as string,
    { skip: !id },
  );
  const { data: userLanes, isLoading: isUserLanesLoading } = useGetLanesQuery(
    { userId: user?.id, jobId: id as string },
    { skip: !user?.id || !id },
  );
  const lanes = jobLanes || userLanes;
  const isLanesLoading = isJobLanesLoading || isUserLanesLoading;

  // Job lane configuration
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(id as string, {
    skip: !id,
  });

  // Candidates data
  const {
    candidates: normalizedCandidates,
    isLoading: isCandidatesLoading,
    refetch,
  } = useNormalizedCandidates({
    jobId: id,
    setSelectedCandidate: () => {},
    selectedCandidate: null,
  });

  // Candidate state
  const candidateState = useCandidateState({
    jobId: id,
    candidates: normalizedCandidates,
  });

  // SSE lanes
  const { lanes: updatedLanes } = useSSE(
    candidateState.setSelectedCandidate as (
      candidate: Candidate | CustomCalendarEvent | null,
    ) => void,
    candidateState.selectedCandidate,
    id,
  );

  return {
    id,
    user,
    job,
    isJobLoading,
    jobError,
    updateJob,
    isUpdatingJob,
    jobLanes,
    userLanes,
    lanes,
    isLanesLoading,
    jobLaneConfig,
    normalizedCandidates,
    mergedCandidates: normalizedCandidates,
    isCandidatesLoading,
    refetch,
    candidateState,
    updatedLanes,
  };
}
