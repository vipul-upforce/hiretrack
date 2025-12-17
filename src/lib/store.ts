import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { baseApi } from './api/baseApi';
import { organizationSlice } from './features/org/orgSlice';
import { checklistApi } from './features/checklist/checklistApi';
import { notificationsApi } from './features/notifications/notificationsApi';
import { analyticsApi } from './features/analytics/analyticsApi';
import { emailNotificationSettingsApi } from './features/notifications/emailNotificationSettingsApi';
import { onboardingApi } from './features/onboarding/onboardingApi';
import authReducer from '@/lib/redux/authSlice';

// Import APIs to ensure they inject their endpoints into baseApi
import './features/auth/authApi';
import './features/job/jobApi';
import './features/candidate/candidateApi';
import './features/user/userApi';
import './features/lane/laneApi';
import './features/org/orgApi';
import './features/settings/settingsApi';
import './features/checklist/checklistApi';
import './features/notifications/notificationsApi';
import './features/analytics/analyticsApi';
import './features/users/usersApi';

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
  auth: authReducer,
  // All APIs extend from baseApi, so only need baseApi reducer
  [baseApi.reducerPath]: baseApi.reducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(
      // All APIs extend from baseApi, so only need baseApi middleware
      baseApi.middleware,
    ),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
