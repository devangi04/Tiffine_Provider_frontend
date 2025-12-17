import { API_URL } from '@/app/config/env';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = API_URL;

export const fetchSearchResults = createAsyncThunk(
  'search/fetchResults',
  async (query: string, { rejectWithValue }) => {
    try {
      // Use 'q' instead of 'query' to match your backend
      const response = await axios.get(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`);
      if (response.data.success) {
        return response.data.results;
      } else {
        return rejectWithValue(response.data.message || 'Search failed');
      }
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Network error');
    }
  }
);

// Define proper types for sedarch results
interface SearchResultItem {
  _id: string;
  name?: string;
  dishName?: string;
  menuName?: string;
  customerName?: string;
  type?: string;
  categoryName?: string;
  phone?: string;
  address?: string;
  tiffinType?: string;
  description?: string;
  day?: string;
  date?: string;
  reply?: string;
  status?: string;
  month?: string;
  quantity?: number;
  time?: string;
  // Add fields from your actual response
  totalPaid?: number;
  providerId?: string;
  area?: string;
  preference?: string;
  tiffinRate?: number;
  isActive?: boolean;
  totalDue?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface SearchResults {
  customers: SearchResultItem[];
  dishes: SearchResultItem[];
  menus: SearchResultItem[];
  responses: SearchResultItem[];
  bills: SearchResultItem[];
}

interface SearchState {
  query: string;
  results: SearchResults;
  loading: boolean;
  error: string | null;
}

const initialState: SearchState = {
  query: '',
  results: {
    customers: [],
    dishes: [],
    menus: [],
    responses: [],
    bills: []
  },
  loading: false,
  error: null,
};

const searchSlice = createSlice({  // FIXED: Remove the extra 'create.'
  name: 'search',
  initialState,
  reducers: {
    setSearchQuery: (state, action) => {
      state.query = action.payload;
    },
    clearSearchQuery: (state) => {
      state.query = '';
      state.results = {
        customers: [],
        dishes: [],
        menus: [],
        responses: [],
        bills: []
      };
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSearchResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.loading = false;
        state.results = action.payload;
        state.error = null;
      })
      .addCase(fetchSearchResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        // Clear results on error
        state.results = {
          customers: [],
          dishes: [],
          menus: [],
          responses: [],
          bills: []
        };
      });
  },
});

export const { setSearchQuery, clearSearchQuery } = searchSlice.actions;
export default searchSlice.reducer;