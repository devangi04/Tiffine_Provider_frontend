import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { MealPreferencesState, ProviderMealPreferences, MealService } from '../types/meals';
import { API_URL } from '@/app/config/env';

// Use your actual API base URL - match your customer slice
const API_BASE_URL = `${API_URL}/api`;

export const fetchMealPreferences = createAsyncThunk(
  'mealPreferences/fetchMealPreferences',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.provider.id;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }      
      const response = await axios.get(
        `${API_BASE_URL}/Provider/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.error || 'Failed to fetch preferences');
      }

    } catch (error: any) {
      if (error.response) {
        return rejectWithValue(error.response.data?.error || error.response.data?.message || `Server error (${error.response.status})`);
      } else if (error.code === 'ECONNABORTED') {
        return rejectWithValue('Request timeout. Check your connection.');
      } else if (error.message.includes('Network Error')) {
        return rejectWithValue('Cannot connect to server. Please check your connection.');
      }
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

export const updateMealPreferences = createAsyncThunk(
  'mealPreferences/updateMealPreferences',
  async (mealService: MealService, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.provider.id;

      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      const response = await axios.post(
        `${API_BASE_URL}/Provider/preferences`,
        { mealService },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.data.success) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.error || 'Failed to update preferences');
      }

    } catch (error: any) {
      if (error.response) {
        return rejectWithValue(error.response.data?.error || error.response.data?.message || `Server error (${error.response.status})`);
      } else if (error.code === 'ECONNABORTED') {
        return rejectWithValue('Request timeout. Check your connection.');
      } else if (error.message.includes('Network Error')) {
        return rejectWithValue('Cannot connect to server. Please check your connection.');
      }
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const initialState: MealPreferencesState = {
  preferences: null,
  loading: false,
  saving: false,
  error: null,
};

const mealPreferencesSlice = createSlice({
  name: 'mealPreferences',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetMealPreferences: (state) => {
      state.preferences = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch preferences
      .addCase(fetchMealPreferences.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMealPreferences.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(fetchMealPreferences.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update preferences
      .addCase(updateMealPreferences.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateMealPreferences.fulfilled, (state, action) => {
        state.saving = false;
        state.preferences = action.payload;
      })
      .addCase(updateMealPreferences.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetMealPreferences } = mealPreferencesSlice.actions;
export default mealPreferencesSlice.reducer;