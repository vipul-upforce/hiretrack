import { useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import { initialCandidateColumns } from '../data/initial-data';
import { isAssigned, getInterviewerName } from '../utils/candidateAccessors';

interface FilterState {
  search: string;
  logicalOperator: 'AND' | 'OR';
  topCandidates: boolean;
  appliedThisWeek: boolean;
  appliedToday: boolean;
  appliedIn15Days: boolean;
  toFollowUp: boolean;
  assigned: boolean;
  notAssigned: boolean;
  withRemarks: boolean;
  withoutRemarks: boolean;
}

interface UseJobPageEffectsParams {
  // Candidate state
  tempSelectedCandidate: Candidate | null;
  selectedCandidate: Candidate | null;
  setSelectedCandidate: (candidate: Candidate | null) => void;
  normalizedCandidates: Candidate[];
  mergedCandidates: Candidate[];

  // Lane state
  updatedLanes: string[] | undefined;
  jobLanes: { lanes: string[] } | undefined;
  userLanes: { lanes: string[] } | undefined;
  lanes: { lanes: string[] } | undefined;
  refetch: () => void;

  // Filter state
  filterConditions: FilterState | null;
  showArchived: boolean;

  // Column state
  setColumns: Dispatch<SetStateAction<CandidateColumn[]>>;

  // Dialog state
  isDialogOpen: boolean;
  setDroppedFileData: Dispatch<SetStateAction<File | null>>;
  isLaneEditOpen: boolean;
  laneToEdit: string | null;
  setLaneToEdit: Dispatch<SetStateAction<string | null>>;
  initialLaneToEdit: string | null;
  setInitialLaneToEdit: Dispatch<SetStateAction<string | null>>;
}

/**
 * Custom hook to manage all side effects for the job progress page.
 * Consolidates candidate syncing, lane updates, filtering, and column management.
 *
 * @param params - All necessary state and setters for side effect management
 */
export function useJobPageEffects({
  tempSelectedCandidate,
  selectedCandidate,
  setSelectedCandidate,
  normalizedCandidates,
  mergedCandidates,
  updatedLanes,
  jobLanes,
  userLanes,
  lanes,
  refetch,
  filterConditions,
  showArchived,
  setColumns,
  isDialogOpen,
  setDroppedFileData,
  isLaneEditOpen,
  laneToEdit,
  setLaneToEdit,
  setInitialLaneToEdit,
}: UseJobPageEffectsParams): void {
  const prevLanesSigRef = useRef<string>('');
  const prevIsLaneEditOpenRef = useRef<boolean>(false);

  // Effect 1: Sync temp selected candidate with state hook
  useEffect(() => {
    if (
      tempSelectedCandidate &&
      tempSelectedCandidate._id !== selectedCandidate?._id
    ) {
      setSelectedCandidate(tempSelectedCandidate);
    }
  }, [tempSelectedCandidate, selectedCandidate, setSelectedCandidate]);

  // Effect 2: Refetch candidates when lanes changed from SSE
  useEffect(() => {
    if (!updatedLanes || updatedLanes.length === 0) return;

    const sig = updatedLanes.join('|');
    if (sig === prevLanesSigRef.current) return;
    prevLanesSigRef.current = sig;

    refetch();
  }, [updatedLanes, refetch]);

  // Effect 3: Clear dropped file data when dialog closes
  useEffect(() => {
    if (!isDialogOpen) {
      setDroppedFileData(null);
    }
  }, [isDialogOpen, setDroppedFileData]);

  // Effect 4: Filter candidates and update columns based on filters, lanes, etc.
  useEffect(() => {
    if (normalizedCandidates && lanes) {
      let currentCandidates = [...mergedCandidates];

      // Apply archived filter first (consistent with QuickSelectAndFilter)
      // When showArchived is true, show ONLY archived candidates
      // When showArchived is false, show ONLY non-archived candidates
      currentCandidates = currentCandidates.filter(
        (candidate) => showArchived ? candidate.isDeleted : !candidate.isDeleted,
      );

      // Apply filter conditions if they exist
      if (filterConditions) {
        currentCandidates = currentCandidates.filter((candidate) => {
          // Apply text search
          if (filterConditions.search) {
            const searchLower = filterConditions.search.toLowerCase();
            const matchesSearch =
              candidate.name.toLowerCase().includes(searchLower) ||
              candidate.skills.some((skill) =>
                skill.toLowerCase().includes(searchLower),
              ) ||
              candidate.experience.toString().includes(searchLower) ||
              getInterviewerName(candidate)?.toLowerCase().includes(searchLower) ||
              candidate.location.toLowerCase().includes(searchLower);
            if (!matchesSearch) return false;
          }

          // Apply other filters
          const activeFilters = [
            {
              key: 'topCandidates',
              filter: (c: Candidate) =>
                c.scores?.overall && c.scores.overall >= 7,
            },
            {
              key: 'appliedThisWeek',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                return new Date(c.tracking.createdAt) >= oneWeekAgo;
              },
            },
            {
              key: 'appliedToday',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return (
                  new Date(c.tracking.createdAt) >= today &&
                  new Date(c.tracking.createdAt) < tomorrow
                );
              },
            },
            {
              key: 'appliedIn15Days',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                return new Date(c.tracking.createdAt) >= fifteenDaysAgo;
              },
            },
            {
              key: 'toFollowUp',
              filter: (c: Candidate) => c.followUp && c.followUp.note,
            },
            {
              key: 'assigned',
              filter: (c: Candidate) => isAssigned(c),
            },
            {
              key: 'notAssigned',
              filter: (c: Candidate) => !isAssigned(c),
            },
            {
              key: 'withRemarks',
              filter: (c: Candidate) => c.remarksCount && c.remarksCount > 0,
            },
            {
              key: 'withoutRemarks',
              filter: (c: Candidate) => !c.remarksCount || c.remarksCount === 0,
            },
          ].filter(
            (filter) =>
              filterConditions[filter.key as keyof FilterState] === true,
          );

          if (activeFilters.length > 0) {
            if (filterConditions.logicalOperator === 'AND') {
              return activeFilters.every(({ filter }) => filter(candidate));
            }
            return activeFilters.some(({ filter }) => filter(candidate));
          }

          return true;
        });
      }

      // Handle different lane data structures
      let lanesArray: string[];
      if (updatedLanes) {
        lanesArray = updatedLanes;
      } else if (jobLanes?.lanes) {
        lanesArray = [...jobLanes.lanes];
      } else if (userLanes?.lanes) {
        lanesArray = [...userLanes.lanes];
      } else {
        lanesArray = [
          'applied',
          'screening',
          'shortlisted',
          'processing',
          'accepted',
          'rejected',
        ];
      }

      lanesArray.forEach((lane) => {
        if (!initialCandidateColumns.find((item) => item.id === lane)) {
          initialCandidateColumns.push({
            id: lane as CandidateStatus,
            title: lane,
            candidates: [],
          });
        }
      });

      const updatedColumns = lanesArray.map((lane) => {
        const column = initialCandidateColumns.find((item) => item.id === lane);
        // Filter by status only - archived filter already applied above
        const candidates = currentCandidates.filter(
          (candidate) => candidate.status === lane,
        );

        return {
          id: lane as CandidateStatus,
          title: column?.title || lane,
          candidates,
        } as CandidateColumn;
      });

      setColumns(updatedColumns);
    }
  }, [
    normalizedCandidates,
    lanes,
    mergedCandidates,
    updatedLanes,
    showArchived,
    filterConditions,
    jobLanes,
    userLanes,
    setColumns,
  ]);

  // Effect 5: Set initial lane to edit when dialog opens
  // This ensures we capture the original lane name before any edits
  useEffect(() => {
    const wasClosed = prevIsLaneEditOpenRef.current === false;
    const isNowOpen = isLaneEditOpen === true;
    
    // When dialog transitions from closed to open, capture the original lane name
    if (wasClosed && isNowOpen && laneToEdit) {
      // Capture the original lane name immediately when dialog opens
      setInitialLaneToEdit(laneToEdit);
    }
    
    // Update ref for next render
    prevIsLaneEditOpenRef.current = isLaneEditOpen;
  }, [isLaneEditOpen, laneToEdit, setInitialLaneToEdit]);

  // Effect 6: Clear lane edit state when dialog closes
  useEffect(() => {
    if (!isLaneEditOpen) {
      setInitialLaneToEdit(null);
      setLaneToEdit(null);
    }
  }, [isLaneEditOpen, setInitialLaneToEdit, setLaneToEdit]);
}
