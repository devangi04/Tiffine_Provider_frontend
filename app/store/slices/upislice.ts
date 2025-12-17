// store/slices/upislice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL} from '../../config/env';
const API_BASE_URL = `${API_URL}/api/providers`;

// Define State Interface
interface UpiState {
  upiId: string;
  loading: boolean;
  saving: boolean;
  validating: boolean;
  error: string | null;
  validationResult: {
    upiId: string;
    isFormatValid: boolean;
  } | null;
}

// Initial State with type
const initialState: UpiState = {
  upiId: '',
  loading: false,
  saving: false,
  validating: false,
  error: null,
  validationResult: null
};

// Get state type for async thunks
interface RootStateWithUpi {
  provider: {
    token: string;
    id: string;
  };
  upi: UpiState;
}

// Async Thunks with proper typing
// In your upislice.ts - ADD DEBUG LOGGING
export const fetchUpiId = createAsyncThunk(
  'upi/fetchUpiId',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootStateWithUpi;
      const token = state.provider.id;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const url = `${API_BASE_URL}/me/upi-id`;
      
      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
     
      return response.data.data;
    } catch (error: any) {
    
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch UPI ID'
      );
    }
  }
);

export const saveUpiId = createAsyncThunk(
  'upi/saveUpiId',
  async (upiId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootStateWithUpi;
      const token = state.provider.id;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const response = await axios.put(
        `${API_BASE_URL}/me/upi-id`,
        { upiId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to save UPI ID'
      );
    }
  }
);

export const removeUpiId = createAsyncThunk(
  'upi/removeUpiId',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootStateWithUpi;
      const token = state.provider.id;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const response = await axios.delete(`${API_BASE_URL}/me/upi-id`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to remove UPI ID'
      );
    }
  }
);

export const validateUpi = createAsyncThunk(
  'upi/validateUpi',
  async (upiId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootStateWithUpi;
      const token = state.provider.id;
      
      if (!token) {
        return rejectWithValue('No authentication token found');
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/me/upi-id/validate`,
        { upiId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 
        error.message || 
        'Failed to validate UPI ID'
      );
    }
  }
);

// Slice
const upiSlice = createSlice({
  name: 'upi',
  initialState,
  reducers: {
    clearUpiError: (state) => {
      state.error = null;
    },
    clearValidationResult: (state) => {
      state.validationResult = null;
    },
    setUpiId: (state, action: PayloadAction<string>) => {
      state.upiId = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Fetch UPI ID
    builder.addCase(fetchUpiId.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUpiId.fulfilled, (state, action) => {
      state.loading = false;
      state.upiId = action.payload.upiId || '';
    });
    builder.addCase(fetchUpiId.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Save UPI ID
    builder.addCase(saveUpiId.pending, (state) => {
      state.saving = true;
      state.error = null;
    });
    builder.addCase(saveUpiId.fulfilled, (state, action) => {
      state.saving = false;
      state.upiId = action.payload.upiId;
    });
    builder.addCase(saveUpiId.rejected, (state, action) => {
      state.saving = false;
      state.error = action.payload as string;
    });

    // Remove UPI ID
    builder.addCase(removeUpiId.pending, (state) => {
      state.saving = true;
      state.error = null;
    });
    builder.addCase(removeUpiId.fulfilled, (state) => {
      state.saving = false;
      state.upiId = '';
    });
    builder.addCase(removeUpiId.rejected, (state, action) => {
      state.saving = false;
      state.error = action.payload as string;
    });

    // Validate UPI
    builder.addCase(validateUpi.pending, (state) => {
      state.validating = true;
      state.error = null;
      state.validationResult = null;
    });
    builder.addCase(validateUpi.fulfilled, (state, action) => {
      state.validating = false;
      state.validationResult = action.payload;
    });
    builder.addCase(validateUpi.rejected, (state, action) => {
      state.validating = false;
      state.error = action.payload as string;
      state.validationResult = null;
    });
  }
});

export const { clearUpiError, clearValidationResult, setUpiId } = upiSlice.actions;
export default upiSlice.reducer;