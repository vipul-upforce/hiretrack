import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  allowMultipleOrgs: false,
};

export const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    setAllowMultipleOrgs: (state, action) => {
      // eslint-disable-next-line no-param-reassign
      state.allowMultipleOrgs = action.payload;
    },
  },
});

export const { setAllowMultipleOrgs } = organizationSlice.actions;
export default organizationSlice.reducer;
