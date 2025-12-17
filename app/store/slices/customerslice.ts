// store/slices/customerslice.ts
import { API_URL } from '@/app/config/env';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE_URL = `${API_URL}/api`;

export interface Customer {
  _id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  preference: 'veg' | 'non-veg' | 'jain';
  isActive: boolean;
  providerId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerState {
  customers: Customer[];
  currentCustomer: Customer | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalItems: number;
  nextCursor: string | null; // Add cursor
  nextId: string | null; // Add cursor ID
}

const initialState: CustomerState = {
  customers: [],
  currentCustomer: null,
  loading: false,
  loadingMore: false,
  error: null,
  hasMore: true,
  totalItems: 0,
  nextCursor: null,
  nextId: null,
};

// Async thunks - Update for cursor-based pagination
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async ({ providerId }: { providerId: string }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customer/provider/${providerId}`, {
        params: { limit: 10 }
      });
      return {
        customers: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// customerslice.tsx - FIXED VERSION
export const fetchCustomerById = createAsyncThunk(
  'customer/fetchCustomerById',
  async (customerId: string, { rejectWithValue }) => {
    try {
      // Use the SAME pattern as your other customer thunks (no token)
      const response = await axios.get(
        `${API_BASE_URL}/customer/${customerId}`
      );
      
      // Check for success response (same as your other thunks)
      return response.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || err.message || 'Network error');
    }
  }
);
export const fetchMoreCustomers = createAsyncThunk(
  'customers/fetchMoreCustomers',
  async ({ 
    providerId, 
    lastCreatedAt, 
    lastId 
  }: { 
    providerId: string; 
    lastCreatedAt?: string; 
    lastId?: string 
  }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customer/provider/${providerId}`, {
        params: { 
          limit: 10,
          ...(lastCreatedAt && { lastCreatedAt }),
          ...(lastId && { lastId })
        }
      });
      return {
        customers: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (customerData: Omit<Customer, '_id'>, { rejectWithValue }) => {
    try {
      if(!customerData.providerId){
           throw new Error('provider Id is required')
      }
      const response = await axios.post(`${API_BASE_URL}/customer`, customerData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, customerData }: { id: string; customerData: Partial<Customer> }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/customer/${id}`, customerData);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await axios.delete(`${API_BASE_URL}/customer/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const toggleCustomerActive = createAsyncThunk(
  'customers/toggleCustomerActive',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await axios.patch(`${API_BASE_URL}/customer/${id}/toggle-active`);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);
// ... (rest of your thunks remain the same)

const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    setCurrentCustomer: (state, action) => {
      state.currentCustomer = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetCustomers: (state) => {
      state.customers = [];
      state.hasMore = true;
      state.totalItems = 0;
      state.nextCursor = null;
      state.nextId = null;
      state.loadingMore = false;
    },
    clearCustomers: (state) => {
      state.customers = [];
      state.hasMore = true;
      state.totalItems = 0;
      state.nextCursor = null;
      state.nextId = null;
      state.error = null;
      state.loadingMore = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customers (first page)
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload.customers;
        state.hasMore = action.payload.pagination.hasMore;
        state.totalItems = action.payload.pagination.totalItems;
        state.nextCursor = action.payload.pagination.nextCursor;
        state.nextId = action.payload.pagination.nextId;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch more customers (infinite scroll)
      .addCase(fetchMoreCustomers.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreCustomers.fulfilled, (state, action) => {
        state.loadingMore = false;
        
        // Filter out any duplicates just in case
        const existingIds = new Set(state.customers.map(c => c._id));
        const newCustomers = action.payload.customers.filter(
          (customer: Customer) => customer._id && !existingIds.has(customer._id)
        );
        
        state.customers = [...state.customers, ...newCustomers];
        state.hasMore = action.payload.pagination.hasMore;
        state.totalItems = action.payload.pagination.totalItems;
        state.nextCursor = action.payload.pagination.nextCursor;
        state.nextId = action.payload.pagination.nextId;
      })
      .addCase(fetchMoreCustomers.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload as string;
      })
                // Create customer
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = [action.payload, ...state.customers];
        state.totalItems += 1;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update customer
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customers.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.currentCustomer && state.currentCustomer._id === action.payload._id) {
          state.currentCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete customer
      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = state.customers.filter(c => c._id !== action.payload);
        state.totalItems -= 1;
        if (state.currentCustomer && state.currentCustomer._id === action.payload) {
          state.currentCustomer = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Toggle customer active status
      .addCase(toggleCustomerActive.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(toggleCustomerActive.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.customers.findIndex(c => c._id === action.payload._id);
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
        if (state.currentCustomer && state.currentCustomer._id === action.payload._id) {
          state.currentCustomer = action.payload;
        }
      })
      .addCase(toggleCustomerActive.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
      //fetch single customer
       builder
          .addCase(fetchCustomerById.pending, (state) => {
            state.loading = true;
            state.error = null;
          })
          .addCase(fetchCustomerById.fulfilled, (state, action) => {
            state.loading = false;
            // Add or update customer in the customers array
            const index = state.customers.findIndex(c => c._id === action.payload._id);
            if (index === -1) {
              state.customers.push(action.payload);
            } else {
              state.customers[index] = action.payload;
            }
            state.error = null;
          })
          .addCase(fetchCustomerById.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
          });
      // ... (rest of your reducers)
  },
});

export const { setCurrentCustomer, clearError, resetCustomers, clearCustomers } = customerSlice.actions;
export default customerSlice.reducer;