import { useParams } from 'next/navigation';
import { useAppSelector } from '@/lib/redux/hooks';
import {
  useFetchJobByIdQuery,
  useUpdateJobMutation,
} from '@/lib/features/job/jobApi';
import { useGetJobLanesQuery } from '@/lib/features/lane/laneApi';
import { useGetJobLaneConfigQuery } from '@/lib/features/checklist/checklistApi';
import { useSSE } from '@/hooks/useSSE';
import { useNormalizedCandidates } from './useNormalizedCandidates';
import { useCandidateState } from './useCandidateState';
import { useJobViewState } from './useJobViewState';

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

  // Lanes data - Use job-specific lanes API (GET /api/jobs/[id]/lanes)
  const { data: jobLanesData, isLoading: isJobLanesLoading } = useGetJobLanesQuery(
    id as string,
    { skip: !id },
  );

  // Extract lane names from jobLanesData (JobLanesResponse)
  // jobLanesData.lanes is Array<{name, _id}>
  const lanes = jobLanesData?.lanes?.map((lane) => lane.name) || [];
  const isLanesLoading = isJobLanesLoading;

  // Job lane configuration
  const { data: jobLaneConfig } = useGetJobLaneConfigQuery(id as string, {
    skip: !id,
  });

  const { viewState } = useJobViewState(id);

  // Candidates data (filter/sort from viewState as query params)
  const {
    candidates: normalizedCandidates,
    isLoading: isCandidatesLoading,
    refetch,
  } = useNormalizedCandidates({
    jobId: id,
    setSelectedCandidate: () => {},
    selectedCandidate: null,
    viewState,
  });

  // Candidate state
  const candidateState = useCandidateState({
    jobId: id,
    candidates: normalizedCandidates,
  });

  // SSE lanes
  const { lanes: updatedLanes } = useSSE(
    candidateState.setSelectedCandidate,
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
    jobLanes: jobLanesData,
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
