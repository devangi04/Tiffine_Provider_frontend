// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// slices
import providerSlice from './slices/providerslice';
import customerSlice from './slices/customerslice';
import searchSlice from './slices/searchslice';
import mealPreferencesReducer from './slices/mealsslice';
import upiReducer from './slices/upislice'; 
import billReducer from './slices/billslice'; 
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['provider'],
};

const persistedProviderReducer = persistReducer(persistConfig, providerSlice);

export const store = configureStore({
  reducer: {
    provider: persistedProviderReducer,
    customer: customerSlice,
    search: searchSlice, 
    mealPreferences: mealPreferencesReducer,
    upi: upiReducer, 
    bills: billReducer, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/FLUSH', 'persist/PAUSE', 'persist/PURGE', 'persist/REGISTER'],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'], // Add this line
        ignoredPaths: ['some.path.to.ignore'], // Add this if needed
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;