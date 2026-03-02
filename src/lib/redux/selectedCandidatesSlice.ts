import { Candidate } from '@/types/candidate';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SelectedCandidatesState {
  candidates: Candidate[];
}

const initialState: SelectedCandidatesState = {
  candidates: [],
};

const selectedCandidatesSlice = createSlice({
  name: 'selectedCandidates',
  initialState,
  reducers: {
    toggleCandidateSelection: (state, action: PayloadAction<Candidate>) => {
      const index = state.candidates.findIndex(
        (c) => c._id === action.payload._id,
      );
      if (index === -1) {
        // Only allow selecting from one lane: if new candidate is from a different lane, replace selection
        if (
          state.candidates.length > 0 &&
          action.payload.status !== state.candidates[0].status
        ) {
          state.candidates = [action.payload];
        } else {
          state.candidates.push(action.payload);
        }
      } else {
        state.candidates.splice(index, 1);
      }
    },
    clearSelectedCandidates: (state) => {
      state.candidates = [];
    },
    setSelectedCandidates: (state, action: PayloadAction<Candidate[]>) => {
      state.candidates = action.payload;
    },
  },
});

export const {
  toggleCandidateSelection,
  clearSelectedCandidates,
  setSelectedCandidates,
} = selectedCandidatesSlice.actions;

export default selectedCandidatesSlice.reducer;
