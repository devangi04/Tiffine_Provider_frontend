// app/store/appSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  hasCompletedWelcome: boolean;
  isFirstLaunch: boolean;
}

const initialState: AppState = {
  hasCompletedWelcome: false,
  isFirstLaunch: true,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setHasCompletedWelcome: (state, action: PayloadAction<boolean>) => {
      state.hasCompletedWelcome = action.payload;
    },
    setIsFirstLaunch: (state, action: PayloadAction<boolean>) => {
      state.isFirstLaunch = action.payload;
    },
    resetAppState: () => initialState,
  },
});

export const { setHasCompletedWelcome, setIsFirstLaunch, resetAppState } = appSlice.actions;
export default appSlice.reducer;