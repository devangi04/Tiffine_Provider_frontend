import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../api/api';
import { MealPreferencesState, MealService } from '../types/meals';
import { API_URL } from '@/app/config/env';
import { setHasMealPreferences } from './providerslice';

const API_BASE_URL = `${API_URL}/api`;

export const fetchMealPreferences = createAsyncThunk(
  'mealPreferences/fetchMealPreferences',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.provider.token;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }      
      
      const response = await api.get(
        `${API_BASE_URL}/Provider/preferences`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.data.success) {
        // ✅ Extract hasMealPreferences from backend response
        const hasMealPrefs = response.data.data?.hasMealPreferences || false;
        
        // ✅ Dispatch to provider slice (this is in a thunk, so dispatch is available)
        dispatch(setHasMealPreferences(hasMealPrefs));
        
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
  async (mealService: MealService, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.provider.token;

      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const response = await api.post(
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
        // ✅ Extract hasMealPreferences from backend response
        const hasMealPrefs = response.data.hasMealPreferences || false;
        
        // ✅ Dispatch to provider slice (this is in a thunk, so dispatch is available)
        dispatch(setHasMealPreferences(hasMealPrefs));
        
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
  justSaved: false,
  hasMealPreferences: false,
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
      state.hasMealPreferences = false;
    },
    resetJustSaved: (state) => {
      state.justSaved = false;
    },
    // ✅ This is just a regular reducer - NO dispatch here
    setMealPreferencesStatus: (state, action: PayloadAction<boolean>) => {
      state.hasMealPreferences = action.payload;
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
        // ✅ Update hasMealPreferences in THIS slice (no dispatch needed)
        state.hasMealPreferences = action.payload?.hasMealPreferences || false;
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
        state.justSaved = true;
        // ✅ Note: hasMealPreferences is already updated via dispatch in the thunk above
        // So we don't need to update it here in the meals slice
      })
      .addCase(updateMealPreferences.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  clearError, 
  resetMealPreferences,
  resetJustSaved,
  setMealPreferencesStatus
} = mealPreferencesSlice.actions;

export default mealPreferencesSlice.reducer;