import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./features/auth/authApi";
import { jobApi } from "./features/job/jobApi";
import { candidateApi } from "./features/candidate/candidateApi";
import { userApi } from "./features/user/userApi";
import { laneApi } from "./features/lane/laneApi";
import { apiSlice } from "./features/api/apiSlice";
import { orgApi } from "./features/org/orgApi";
import { settingsApi } from "./features/settings/settingsApi";
import { organizationSlice } from "./features/org/orgSlice";
import { checklistApi } from "./features/checklist/checklistApi";

export const store = configureStore({
  reducer: {
    organization: organizationSlice.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [orgApi.reducerPath]: orgApi.reducer,
    [settingsApi.reducerPath]: settingsApi.reducer,
    [jobApi.reducerPath]: jobApi.reducer,
    [candidateApi.reducerPath]: candidateApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [laneApi.reducerPath]: laneApi.reducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    [checklistApi.reducerPath]: checklistApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      orgApi.middleware,
      settingsApi.middleware,
      jobApi.middleware,
      candidateApi.middleware,
      userApi.middleware,
      laneApi.middleware,
      apiSlice.middleware,
      checklistApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
