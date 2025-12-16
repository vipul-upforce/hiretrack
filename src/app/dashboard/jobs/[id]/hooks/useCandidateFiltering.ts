import { useEffect } from 'react';
import { Candidate, CandidateColumn, CandidateStatus } from '@/types/candidate';
import { initialCandidateColumns } from '../data/initial-data';

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

interface UseCandidateFilteringProps {
  normalizedCandidates: Candidate[];
  lanes: { lanes: string[] } | undefined;
  updatedLanes: string[] | undefined;
  jobLanes: { lanes: string[] } | undefined;
  userLanes: { lanes: string[] } | undefined;
  showArchived: boolean;
  filterConditions: FilterState | null;
  setColumns: (columns: CandidateColumn[]) => void;
}

export const useCandidateFiltering = ({
  normalizedCandidates,
  lanes,
  updatedLanes,
  jobLanes,
  userLanes,
  showArchived,
  filterConditions,
  setColumns,
}: UseCandidateFilteringProps) => {
  useEffect(() => {
    if (normalizedCandidates && lanes) {
      let currentCandidates = [...normalizedCandidates];

      // Apply filter conditions if they exist
      if (filterConditions) {
        currentCandidates = currentCandidates.filter((candidate) => {
          // Apply text search
          if (filterConditions.search) {
            const searchLower = filterConditions.search.toLowerCase();
            const interviewerName =
              typeof candidate.assignment?.interviewerId === 'object' &&
              candidate.assignment?.interviewerId !== null
                ? candidate.assignment.interviewerId.name
                : '';
            const matchesSearch =
              candidate.name.toLowerCase().includes(searchLower) ||
              candidate.skills.some((skill) =>
                skill.toLowerCase().includes(searchLower),
              ) ||
              candidate.experience.toString().includes(searchLower) ||
              interviewerName.toLowerCase().includes(searchLower) ||
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
                  new Date(c.tracking?.createdAt) >= today &&
                  new Date(c.tracking?.createdAt) < tomorrow
                );
              },
            },
            {
              key: 'appliedIn15Days',
              filter: (c: Candidate) => {
                if (!c.tracking?.createdAt) return false;
                const fifteenDaysAgo = new Date();
                fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
                return new Date(c.tracking?.createdAt) >= fifteenDaysAgo;
              },
            },
            {
              key: 'toFollowUp',
              filter: (c: Candidate) => c.followUp && c.followUp.note,
            },
            {
              key: 'assigned',
              filter: (c: Candidate) => c.assignment,
            },
            {
              key: 'notAssigned',
              filter: (c: Candidate) => !c.assignment,
            },
            {
              key: 'withRemarks',
              filter: (c: Candidate) => c.remarks && c.remarks.length > 0,
            },
            {
              key: 'withoutRemarks',
              filter: (c: Candidate) => !c.remarks || c.remarks.length === 0,
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
      // Apply archived filter
      currentCandidates = currentCandidates.filter(
        (candidate) => showArchived || !candidate.isDeleted,
      );

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
        const candidates = currentCandidates.filter(
          (candidate) =>
            candidate.status === lane &&
            (showArchived ? candidate.isDeleted : !candidate.isDeleted),
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
    updatedLanes,
    jobLanes,
    userLanes,
    showArchived,
    filterConditions,
    setColumns,
  ]);
};
