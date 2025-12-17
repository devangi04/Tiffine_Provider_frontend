// store/slices/providerSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/env';

interface Subscription {
  status: string;
  plan?: string;
  expiryDate?: string;
}

interface ProviderState {
  id: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  token: string | null;
  subscription: Subscription | null;
  upiId: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProviderState = {
  id: null,
  email: null,
  name: null,
  phone: null,
  token: null,
  subscription: null,
  upiId: '',
  isLoading: false,
  error: null,
};

// 🔥 CREATE LOGOUT ASYNC THUNK
export const logoutProvider = createAsyncThunk(
  'provider/logout',
  async (_, { rejectWithValue }) => {
    try {
      // Call logout API (non-blocking - don't wait too long)
      await Promise.race([
        axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          { 
            withCredentials: true,
            timeout: 2000 
          }
        ),
        new Promise(resolve => setTimeout(resolve, 1000)) // Max 1 second wait
      ]);
      
      // Return success - even if API fails, we clear local state
      return { success: true };
    } catch (error: any) {
      // We'll still clear local state even if API fails
      console.log('Logout API error (non-critical):', error.message);
      return rejectWithValue('Logged out locally');
    }
  }
);

const providerSlice = createSlice({
  name: 'provider',
  initialState,
  reducers: {
    setProvider: (state, action: PayloadAction<{
      id: string;
      email: string;
      name: string;
      phone: string;
      token: string;
      subscription: Subscription;
      upiId?: string;
    }>) => {
      state.id = action.payload.id;
      state.email = action.payload.email;
      state.name = action.payload.name;
      state.phone = action.payload.phone;
      state.token = action.payload.token;
      state.subscription = action.payload.subscription;
      state.upiId = action.payload.upiId || '';
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearProvider: (state) => {
      state.id = null;
      state.email = null;
      state.name = null;
      state.phone = null;
      state.token = null;
      state.subscription = null;
      state.upiId = '';
      state.error = null;
    },
    updateSubscription: (state, action: PayloadAction<Subscription>) => {
      if (state.subscription) {
        state.subscription = { ...state.subscription, ...action.payload };
      }
    },
    setUpiId: (state, action: PayloadAction<string>) => {
      state.upiId = action.payload;
    },
    clearUpiId: (state) => {
      state.upiId = '';
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
    },
  },
  // 🔥 ADD EXTRA REDUCERS FOR LOGOUT THUNK
  extraReducers: (builder) => {
    builder
      // Logout pending
      .addCase(logoutProvider.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      // Logout fulfilled (API succeeded)
      .addCase(logoutProvider.fulfilled, (state) => {
        state.isLoading = false;
        state.id = null;
        state.email = null;
        state.name = null;
        state.phone = null;
        state.token = null;
        state.subscription = null;
        state.upiId = '';
        state.error = null;
      })
      // Logout rejected (API failed but we still clear local state)
      .addCase(logoutProvider.rejected, (state, action) => {
        state.isLoading = false;
        // Still clear provider data even if API fails
        state.id = null;
        state.email = null;
        state.name = null;
        state.phone = null;
        state.token = null;
        state.subscription = null;
        state.upiId = '';
        state.error = action.payload as string || 'Logout completed locally';
      });
  },
});

export const { 
  setProvider, 
  setLoading, 
  setError, 
  clearProvider, 
  updateSubscription,
  setUpiId,
  clearUpiId,
  setToken
} = providerSlice.actions;

export default providerSlice.reducer;