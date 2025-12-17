import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  EmailNotificationSettings,
  Organization,
  OrgInfo,
} from "@/lib/models/user";
import Cookies from "js-cookie";
import logger from "../logger";

export interface ILocalUser {
  id: string;
  _id?: string;
  tokenVersion?: number;
  organizationId: Organization |string;
  organizationInfo?: OrgInfo;
  name: string;
  email: string;
  role: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
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
  const authState = Cookies.get("auth_state");
  return authState ? true : false;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: getIsAuthenticated() || false,
  loading: false,
  error: null,
};
export const fetchUserFromToken = createAsyncThunk(
  'auth/fetchUserFromToken',
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem("persist:auth");
      localStorage.removeItem("persist:organization");
      
      const authState = Cookies.get("auth_state");
      if (!authState || authState === "false") {
        const user = {
          id: "guest",
          name: "Guest",
          email: "",
          role: "",
          organizationId: "",
          organizationInfo: null,
          appliedApplications: [],
          fileStorage: null,
        };
        return user;
      }

      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        const errorData = await response.json();
        localStorage.removeItem('persist:auth');
        localStorage.removeItem('persist:organization');
        return rejectWithValue(
          errorData.message || 'Failed to fetch user data',
        );
      }
      const data = await response.json();
      return data.user;
    } catch (e) {
      logger.error('Error fetching user from token:', e);
      localStorage.removeItem('persist:auth');
      localStorage.removeItem('persist:organization');
      return rejectWithValue('Failed to connect to authentication server');
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
      localStorage.removeItem('persist:auth');
      localStorage.removeItem('persist:organization');
      localStorage.removeItem('user');
    },
    updateUser: (state, action: PayloadAction<any>) => {
      if (state.user && (state.user.id || state.user.email)) {
        state.user = { ...state.user, ...action.payload };
      } else {
        // If no user exists, set the payload as the new user
        state.user = action.payload;
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
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.isAuthenticated = true;
          state.user = action.payload;
        },
      )
      .addCase(fetchUserFromToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
