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
  pincode: string;       // Add this
  city: string;          // Add this
  state: string;         // Add this
  area?: string;
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
  nextCursor: string | null;
  nextId: string | null;
  lastRefreshed: number | null;
  location: {
    city: string;
    state: string;
    loading: boolean;
    error: string | null;
  };
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
  lastRefreshed: null,
  location: {
    city: '',
    state: '',
    loading: false,
    error: null,
  },
};

// Async thunks
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async ({ providerId, isRefresh = false }: { providerId: string; isRefresh?: boolean }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customer/provider/${providerId}`, {
        params: { limit: 10 },
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return {
        customers: response.data.data || [],
        pagination: response.data.pagination || { hasMore: false, totalItems: 0, nextCursor: null, nextId: null },
        isRefresh
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message || 'Failed to fetch customers');
    }
  }
);

export const fetchCustomerById = createAsyncThunk(
  'customer/fetchCustomerById',
  async (customerId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customer/${customerId}`);
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
        customers: response.data.data || [],
        pagination: response.data.pagination || { hasMore: false, totalItems: 0, nextCursor: null, nextId: null }
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
        throw new Error('Provider ID is required');
      }
      const response = await axios.post(`${API_BASE_URL}/customer`, {
        ...customerData,
        isActive: true // Ensure new customers are active by default
      });
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// Add this thunk to your existing customerSlice
export const fetchLocationFromPincode = createAsyncThunk(
  'customers/fetchLocationFromPincode',
  async (pincode: string, { rejectWithValue }) => {
    try {
      // Option 1: Use your existing API
      const response = await axios.get(`${API_BASE_URL}/location/pincode/${pincode}`);
      
      
      return response.data;
    } catch (error: any) {
      // Local fallback
      const localData = getLocalPincodeData(pincode);
      if (localData) {
        return {
          city: localData.city,
          state: localData.state,
          source: 'local'
        };
      }
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);
function getLocalPincodeData(pincode: string) {
  const localPincodes: Record<string, { city: string, state: string }> = {
    "110001": { city: "New Delhi", state: "Delhi" },
    "400001": { city: "Mumbai", state: "Maharashtra" },
    "560001": { city: "Bengaluru", state: "Karnataka" },
    "600001": { city: "Chennai", state: "Tamil Nadu" },
    "700001": { city: "Kolkata", state: "West Bengal" },
  };
  return localPincodes[pincode] || null;
}
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
      state.lastRefreshed = null;
    },
    clearCustomers: (state) => {
      state.customers = [];
      state.hasMore = true;
      state.totalItems = 0;
      state.nextCursor = null;
      state.nextId = null;
      state.error = null;
      state.loadingMore = false;
      state.lastRefreshed = null;
    },
    clearLocation: (state) => {
    state.location.city = '';
    state.location.state = '';
    state.location.error = null;
  },
    addCustomerToFront: (state, action) => {
      // Add customer to front and ensure no duplicates
      const existingIndex = state.customers.findIndex(c => c._id === action.payload._id);
      if (existingIndex === -1) {
        state.customers = [action.payload, ...state.customers];
        state.totalItems = Math.max(state.totalItems + 1, state.customers.length);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customers (first page)
      .addCase(fetchCustomers.pending, (state, action) => {
        const { isRefresh } = action.meta.arg;
        if (!isRefresh && state.customers.length === 0) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        const { customers, pagination, isRefresh } = action.payload;
        
        if (isRefresh) {
          // Replace all customers on refresh
          state.customers = customers;
        } else {
          // For initial load, set customers
          state.customers = customers;
        }
        
        state.hasMore = pagination.hasMore;
        state.totalItems = pagination.totalItems || customers.length;
        state.nextCursor = pagination.nextCursor;
        state.nextId = pagination.nextId;
        state.lastRefreshed = Date.now();
        state.error = null;
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
        
        // Filter out any duplicates
        const existingIds = new Set(state.customers.map(c => c._id));
        const newCustomers = action.payload.customers.filter(
          (customer: Customer) => customer._id && !existingIds.has(customer._id)
        );
        
        state.customers = [...state.customers, ...newCustomers];
        state.hasMore = action.payload.pagination.hasMore;
        state.totalItems = action.payload.pagination.totalItems || state.customers.length;
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
        
        // Ensure customer has isActive set to true
        const customer = { ...action.payload, isActive: action.payload.isActive ?? true };
        
        // Remove any existing customer with same ID and add to front
        const filteredCustomers = state.customers.filter(c => c._id !== customer._id);
        state.customers = [customer, ...filteredCustomers];
        
        state.totalItems = Math.max(state.totalItems + 1, state.customers.length);
        state.error = null;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Pincode lookup
    .addCase(fetchLocationFromPincode.pending, (state) => {
      state.location.loading = true;
      state.location.error = null;
    })
    .addCase(fetchLocationFromPincode.fulfilled, (state, action) => {
      state.location.loading = false;
      state.location.city = action.payload.city;
      state.location.state = action.payload.state;
      state.location.error = null;
    })
    .addCase(fetchLocationFromPincode.rejected, (state, action) => {
      state.location.loading = false;
      state.location.error = action.payload as string;
      state.location.city = '';
      state.location.state = '';
    })

      // Update customer
      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        const updatedCustomer = action.payload;
        const index = state.customers.findIndex(c => c._id === updatedCustomer._id);
        
        if (index !== -1) {
          state.customers[index] = updatedCustomer;
        } else {
          // If customer not found in list, add to front
          state.customers = [updatedCustomer, ...state.customers];
          state.totalItems = Math.max(state.totalItems + 1, state.customers.length);
        }
        
        if (state.currentCustomer && state.currentCustomer._id === updatedCustomer._id) {
          state.currentCustomer = updatedCustomer;
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
        state.totalItems = Math.max(0, state.totalItems - 1);
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
        const toggledCustomer = action.payload;
        const index = state.customers.findIndex(c => c._id === toggledCustomer._id);
        
        if (index !== -1) {
          state.customers[index] = toggledCustomer;
        }
        
        if (state.currentCustomer && state.currentCustomer._id === toggledCustomer._id) {
          state.currentCustomer = toggledCustomer;
        }
      })
      .addCase(toggleCustomerActive.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Fetch single customer
      .addCase(fetchCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        const customer = action.payload;
        const index = state.customers.findIndex(c => c._id === customer._id);
        
        if (index === -1) {
          state.customers.push(customer);
          state.totalItems = Math.max(state.totalItems + 1, state.customers.length);
        } else {
          state.customers[index] = customer;
        }
        
        state.error = null;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setCurrentCustomer, 
  clearError, 
  resetCustomers, 
  clearCustomers,
  addCustomerToFront 
} = customerSlice.actions;

export default customerSlice.reducer;