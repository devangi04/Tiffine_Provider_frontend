// store/slices/providerSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/env';

interface Subscription {
  status: string;
  plan?: string;
  expiryDate?: string;
  planName?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

// 🆓 Add Trial Status Interface
interface TrialStatus {
  hasTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  hoursLeft: number;
  startedAt: string | null;
  endsAt: string | null;
  requiresSubscription: boolean;
}

// ✅ ADD NOTIFICATION SETTINGS INTERFACE
interface NotificationSettings {
  notificationsEnabled: boolean;
  pushToken?: string;
  pushTokenUpdatedAt?: string;
}

interface ProviderState {
  id: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  token: string | null;
  subscription: Subscription | null;
  trialStatus: TrialStatus | null;
  upiId: string;
  // ✅ ADD NOTIFICATION SETTINGS TO STATE
  notificationSettings: NotificationSettings;
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
  trialStatus: null,
  upiId: '',
  // ✅ INITIALIZE NOTIFICATION SETTINGS
  notificationSettings: {
    notificationsEnabled: true,
    pushToken: undefined,
    pushTokenUpdatedAt: undefined
  },
  isLoading: false,
  error: null,
};

// 🆓 Add async thunk to fetch trial status
export const fetchTrialStatus = createAsyncThunk(
  'provider/fetchTrialStatus',
  async (providerId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/subscription/trial-status/${providerId}`,
        {
          timeout: 10000,
        }
      );
      
      if (response.data.success) {
        return response.data.trialStatus;
      } else {
        return rejectWithValue(response.data.error || 'Failed to fetch trial status');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// ✅ ADD ASYNC THUNK TO FETCH NOTIFICATION SETTINGS
export const fetchNotificationSettings = createAsyncThunk(
  'provider/fetchNotificationSettings',
  async (providerId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_URL}/api/providers/me/notification-settings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`, // You'll need to get token from state
          },
          timeout: 10000,
        }
      );
      
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.error || 'Failed to fetch notification settings');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

// 🔥 CREATE LOGOUT ASYNC THUNK
export const logoutProvider = createAsyncThunk(
  'provider/logout',
  async (_, { rejectWithValue }) => {
    try {
      await Promise.race([
        axios.post(
          `${API_URL}/api/auth/logout`,
          {},
          { 
            withCredentials: true,
            timeout: 2000 
          }
        ),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      
      return { success: true };
    } catch (error: any) {
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
      trialStatus?: TrialStatus;
      upiId?: string;
      notificationsEnabled?: boolean; // ✅ Add this
    }>) => {
      state.id = action.payload.id;
      state.email = action.payload.email;
      state.name = action.payload.name;
      state.phone = action.payload.phone;
      state.token = action.payload.token;
      state.subscription = action.payload.subscription;
      state.trialStatus = action.payload.trialStatus || null;
      state.upiId = action.payload.upiId || '';
      // ✅ SET NOTIFICATION SETTINGS FROM LOGIN
      state.notificationSettings.notificationsEnabled = action.payload.notificationsEnabled || true;
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
      state.trialStatus = null;
      state.upiId = '';
      // ✅ CLEAR NOTIFICATION SETTINGS
      state.notificationSettings = {
        notificationsEnabled: true,
        pushToken: undefined,
        pushTokenUpdatedAt: undefined
      };
      state.error = null;
    },
    updateSubscription: (state, action: PayloadAction<Subscription>) => {
      if (state.subscription) {
        state.subscription = { ...state.subscription, ...action.payload };
      } else {
        state.subscription = action.payload;
      }
    },
    setTrialStatus: (state, action: PayloadAction<TrialStatus>) => {
      state.trialStatus = action.payload;
    },
    clearTrialStatus: (state) => {
      state.trialStatus = null;
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
    // ✅ ADD NOTIFICATION SETTINGS REDUCERS
    setNotificationSettings: (state, action: PayloadAction<NotificationSettings>) => {
      state.notificationSettings = action.payload;
    },
    updateNotificationSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.notificationSettings = { ...state.notificationSettings, ...action.payload };
    },
    disableNotifications: (state) => {
      state.notificationSettings.notificationsEnabled = false;
      state.notificationSettings.pushToken = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTrialStatus.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTrialStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trialStatus = action.payload;
      })
      .addCase(fetchTrialStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch trial status';
      })
      // ✅ HANDLE NOTIFICATION SETTINGS FETCH
      .addCase(fetchNotificationSettings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotificationSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notificationSettings = action.payload;
      })
      .addCase(fetchNotificationSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to fetch notification settings';
      })
      .addCase(logoutProvider.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(logoutProvider.fulfilled, (state) => {
        state.isLoading = false;
        state.id = null;
        state.email = null;
        state.name = null;
        state.phone = null;
        state.token = null;
        state.subscription = null;
        state.trialStatus = null;
        state.upiId = '';
        state.notificationSettings = {
          notificationsEnabled: true,
          pushToken: undefined,
          pushTokenUpdatedAt: undefined
        };
        state.error = null;
      })
      .addCase(logoutProvider.rejected, (state, action) => {
        state.isLoading = false;
        state.id = null;
        state.email = null;
        state.name = null;
        state.phone = null;
        state.token = null;
        state.subscription = null;
        state.trialStatus = null;
        state.upiId = '';
        state.notificationSettings = {
          notificationsEnabled: true,
          pushToken: undefined,
          pushTokenUpdatedAt: undefined
        };
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
  setTrialStatus,
  clearTrialStatus,
  setUpiId,
  clearUpiId,
  setToken,
  // ✅ EXPORT NEW ACTIONS
  setNotificationSettings,
  updateNotificationSettings,
  disableNotifications
} = providerSlice.actions;

export default providerSlice.reducer;