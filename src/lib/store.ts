import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '@/lib/redux/authSlice';
import { authApi } from './features/auth/authApi';
import { jobApi } from './features/job/jobApi';
import { candidateApi } from './features/candidate/candidateApi';
import { userApi } from './features/user/userApi';
import { defaultLanesApi, laneApi } from './features/lane/laneApi';
import { apiSlice } from './features/api/apiSlice';
import { orgApi } from './features/org/orgApi';
import { settingsApi } from './features/settings/settingsApi';
import { organizationSlice } from './features/org/orgSlice';
import { checklistApi } from './features/checklist/checklistApi';
import { notificationsApi } from './features/notifications/notificationsApi';
import { analyticsApi } from './features/analytics/analyticsApi';
import { emailNotificationSettingsApi } from './features/notifications/emailNotificationSettingsApi';

// Persist config for auth slice
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'auth_token', 'token', 'isAuthenticated'], // only persist these fields
};

// Persist config for organization slice
const orgPersistConfig = {
  key: 'organization',
  storage,
};

const rootReducer = combineReducers({
  organization: persistReducer(orgPersistConfig, organizationSlice.reducer),
  auth: persistReducer(authPersistConfig, authReducer),
  [authApi.reducerPath]: authApi.reducer,
  [orgApi.reducerPath]: orgApi.reducer,
  [settingsApi.reducerPath]: settingsApi.reducer,
  [jobApi.reducerPath]: jobApi.reducer,
  [candidateApi.reducerPath]: candidateApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [laneApi.reducerPath]: laneApi.reducer,
  [defaultLanesApi.reducerPath]: defaultLanesApi.reducer,
  [apiSlice.reducerPath]: apiSlice.reducer,
  [checklistApi.reducerPath]: checklistApi.reducer,
  [notificationsApi.reducerPath]: notificationsApi.reducer,
  [analyticsApi.reducerPath]: analyticsApi.reducer,
  [emailNotificationSettingsApi.reducerPath]:
    emailNotificationSettingsApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(
      authApi.middleware,
      orgApi.middleware,
      settingsApi.middleware,
      jobApi.middleware,
      candidateApi.middleware,
      userApi.middleware,
      laneApi.middleware,
      apiSlice.middleware,
      checklistApi.middleware,
      notificationsApi.middleware,
      defaultLanesApi.middleware,
      analyticsApi.middleware,
      emailNotificationSettingsApi.middleware,
    ),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
