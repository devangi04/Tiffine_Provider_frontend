export type MealType = 'lunch' | 'dinner';

export interface MealPreferences {
  enabled: boolean;
  price: string; // Changed from separate half/full prices to single price
  cutoffTime: string;
}

export interface MealService {
  lunch?: MealPreferences;
  dinner?: MealPreferences;
}

export interface ProviderMealPreferences {
  mealService: MealService;
  hasMealPreferences: boolean;
}

export interface MealPreferencesState {
  preferences: ProviderMealPreferences | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  justSaved: boolean; 
  hasMealPreferences: boolean;
}