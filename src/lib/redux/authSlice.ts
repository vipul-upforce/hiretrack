import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { verifyAndDecryptToken } from '@/app/actions/auth';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const fetchUserFromToken = createAsyncThunk(
  'auth/fetchUserFromToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        const errorData = await response.json();
        return rejectWithValue(errorData.message || 'Failed to fetch user data');
      }
      const data = await response.json();
      return data.user;
    } catch (error) {
      return rejectWithValue('Failed to connect to authentication server');
    }
  }
);

// Simple async thunk to call logout API - no response handling needed
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async () => {
    try {
      // Just ping the server to clear cookies - don't care about response
      await fetch('/api/auth/logout');
    } catch (error) {
      // Ignore errors - we'll clear local state anyway
      console.log('Logout API call failed, but continuing with local cleanup');
    }
    
    // Always return success since we don't care about the API response
    return true;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserFromToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserFromToken.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(fetchUserFromToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Handle logout API call
      .addCase(logoutUser.fulfilled, (state) => {
        // Clear state after API call
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;