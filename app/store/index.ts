// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

// slices
import providerSlice from './slices/providerslice';
import customerSlice from './slices/customerslice';
import searchSlice from './slices/searchslice';
import mealPreferencesReducer from './slices/mealsslice';
import upiReducer from './slices/upislice'; 
import billReducer from './slices/billslice'; 
import appReducer from './slices/appslice'; // ✅ Fixed import path

// Persist config for provider slice
const providerPersistConfig = {
  key: 'provider',
  storage: AsyncStorage,
  whitelist: ['id', 'email', 'name', 'phone', 'token', 'subscription', 'upiId'],
  timeout: 0,
};

// Persist config for app slice
const appPersistConfig = {
  key: 'app',
  storage: AsyncStorage,
  whitelist: ['hasCompletedWelcome', 'isFirstLaunch'], // Persist these fields
  timeout: 0,
};

const persistedProviderReducer = persistReducer(providerPersistConfig, providerSlice);
const persistedAppReducer = persistReducer(appPersistConfig, appReducer); // ✅ Create persisted app reducer

export const store = configureStore({
  reducer: {
    provider: persistedProviderReducer,
    app: persistedAppReducer, // ✅ Add app reducer to store
    customer: customerSlice,
    search: searchSlice, 
    mealPreferences: mealPreferencesReducer,
    upi: upiReducer, 
    bills: billReducer, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;