import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  toggleCandidateSelection,
  clearSelectedCandidates as clearSelection,
} from '@/lib/redux/selectedCandidatesSlice';
import { Candidate } from '@/types/candidate';
import React from 'react';

type UseMultiSelectProps = {
  candidate?: Candidate;
  setLocalCandidate?: React.Dispatch<React.SetStateAction<Candidate>>;
};

const useMultiSelect = (props?: UseMultiSelectProps) => {
  const { candidate, setLocalCandidate } = props || {};
  const dispatch = useAppDispatch();

  const selectedCandidates = useAppSelector(
    (state) => state.selectedCandidates?.candidates ?? [],
  );

  /** Derived from Redux so clearing selection unchecks all cards */
  const isSelected = candidate
    ? selectedCandidates.some((c) => c._id === candidate._id)
    : false;

  const selectCandidate = () => {
    if (candidate) {
      const newIsSelected = !isSelected;
      setLocalCandidate?.({ ...candidate, isSelected: newIsSelected });
      dispatch(
        toggleCandidateSelection({ ...candidate, isSelected: newIsSelected }),
      );
    }
  };

  const clearSelectedCandidates = () => {
    dispatch(clearSelection());
  };

  const selectedCandidateIds = selectedCandidates.map((c) => c._id);

  return {
    selectCandidate,
    selectedCandidates,
    selectedCandidateIds,
    clearSelectedCandidates,
    isSelected,
  };
};

export default useMultiSelect;
