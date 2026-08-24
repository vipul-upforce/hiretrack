import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  WritableDraft,
} from '@reduxjs/toolkit';
import {
  EmailNotificationSettings,
  Organization,
  OrgInfo,
} from '@/lib/models/user';
import Cookies from 'js-cookie';
import logger from '../logger';
import { authApi } from '../features/auth/authApi';
import { clearClientAuthCookies } from '../clearClientAuthCookies';

export interface ILocalUser {
  id: string;
  _id?: string;
  tokenVersion?: number;
  organizationId: Organization | string;
  organizationInfo?: OrgInfo;
  name: string;
  email: string;
  role: string;
  password: string;
  createdAt: string;
  updatedAt: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  isDeleted?: boolean;
  otpExpires?: Date;
  otp?: number;
  emailNotificationSettings?: EmailNotificationSettings;
  fileStorage?: string;
}

interface AuthState {
  user: ILocalUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const getIsAuthenticated = () => {
  const authState = Cookies.get('auth_state');
  return authState === 'true';
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: getIsAuthenticated() || false,
  loading: false,
  error: null,
};

export const fetchUserFromToken = createAsyncThunk(
  'auth/fetchUserFromToken',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      localStorage.removeItem('persist:auth');
      localStorage.removeItem('persist:organization');

      const authState = Cookies.get('auth_state');

      if (!authState || authState === 'false') {
        return rejectWithValue('Not authenticated');
      }

      const result = await dispatch(
        authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
      ).unwrap();

      return result.user;
    } catch (e: unknown) {
      logger.error('Error fetching user from token:', e);
      localStorage.removeItem('persist:auth');
      localStorage.removeItem('persist:organization');

      const errorMessage =
        (e as { data?: { message?: string } })?.data?.message ||
        (e as { message?: string })?.message ||
        'Failed to connect to authentication server';
      return rejectWithValue(errorMessage);
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      clearClientAuthCookies();
      localStorage.removeItem('persist:auth');
      localStorage.removeItem('persist:organization');
      localStorage.removeItem('user');
    },
    /**
     * Updates the authenticated user in the Redux state.
     * Handles immutability and type issues around organizationId/organizationInfo by assigning fields instead of replacing the user object,
     * to satisfy Immer's WritableDraft typing and prevent assignment errors on union types.
     * Ensures idempotency and minimizes impact on drafts.
     */
    updateUser: (state, action: PayloadAction<ILocalUser>) => {
      if (state.user && (state.user.id || state.user.email)) {
        // Only update the fields from the payload explicitly to avoid Immer typing issues
        Object.entries(action.payload).forEach(([key, value]) => {
          // @ts-expect-error Index signature for spreading Zoned types not available
          // This mutation is safe within Immer's draft
          state.user![key as keyof ILocalUser] =
            value as WritableDraft<ILocalUser>[keyof ILocalUser];
        });
      } else {
        // Create user from payload without replacing full object, to keep Immer draft intact
        state.user = { ...action.payload } as WritableDraft<ILocalUser>;
        state.isAuthenticated = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserFromToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchUserFromToken.fulfilled,
        (state, action: PayloadAction<ILocalUser>) => {
          state.loading = false;
          state.error = null;
          state.isAuthenticated = true;

          state.user = action.payload as unknown as WritableDraft<ILocalUser>;
        },
      )
      .addCase(fetchUserFromToken.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = (action.payload as string) || 'Authentication failed';
        if (action.payload === 'Not authenticated') {
          clearClientAuthCookies();
        }
      });
  },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
