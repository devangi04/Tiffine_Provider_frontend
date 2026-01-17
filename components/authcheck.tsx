// app/components/AuthChecker.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../app/store';
import axios from 'axios';
import { API_URL } from '@/app/config/env';
import { fetchMealPreferences } from '@/app/store/slices/mealsslice';
import { View, ActivityIndicator, Text, AppState, AppStateStatus } from 'react-native';

export default function AuthChecker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const hasNavigatedRef = useRef(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const isAuthenticated = useSelector(
    (state: RootState) => state.provider.token !== null
  );

  const hasCompletedWelcome = useSelector(
    (state: RootState) => state.app.hasCompletedWelcome
  );

  const subscription = useSelector(
    (state: RootState) => state.provider.subscription
  );

  const provider = useSelector((state: RootState) => state.provider);

  // Get meal preferences state
  const mealPreferences = useSelector((state: RootState) => state.mealPreferences.preferences);
  const mealPreferencesLoading = useSelector((state: RootState) => state.mealPreferences.loading);

  // Track app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      
      // When app comes to foreground, reset navigation flag
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        hasNavigatedRef.current = false;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Fetch meal preferences when authenticated
  useEffect(() => {
    if (isAuthenticated && provider?.token && !mealPreferences) {
      console.log('Fetching meal preferences...');
      dispatch(fetchMealPreferences());
    }
  }, [isAuthenticated, provider?.token, mealPreferences, dispatch]);

  // Background subscription sync
  useEffect(() => {
    const syncSubscription = async () => {
      if (provider?.id && provider?.token && isAuthenticated) {
        try {
          await axios.get(
            `${API_URL}/api/subscription/sync-status/${provider.id}`,
            {
              headers: {
                'Authorization': `Bearer ${provider.token}`
              },
              timeout: 10000
            }
          );
        } catch (error) {
          console.log('Background sync failed, continuing...');
        }
      }
    };

    if (isAuthenticated && appState === 'active') {
      syncSubscription();
    }
  }, [isAuthenticated, provider, appState]);

  // Main auth check logic
  const checkAccess = useCallback(async () => {
    if (isCheckingAuth) return;
    
    setIsCheckingAuth(true);
    try {
      console.log('AuthChecker: Starting check', {
        pathname,
        isAuthenticated,
        hasMealPreferences: mealPreferences ? 'loaded' : 'not loaded'
      });

      // 🚪 Unauthenticated flow
      if (!isAuthenticated) {
        const protectedRoutes = [
          '/dashboard', '/schedule', '/response', 
          '/subscription', '/settings', '/profile',
          '/custmorelist', '/dishmaster', '/payment'
        ];

        if (protectedRoutes.some(route => pathname.startsWith(route))) {
          console.log('AuthChecker: Unauthenticated, redirecting to login');
          hasNavigatedRef.current = true;
          
          if (!hasCompletedWelcome) {
            router.replace('/welcome');
          } else {
            router.replace('/login');
          }
          return;
        }

        // Allow access to public routes
        if (pathname === '/welcome' || pathname === '/login' || pathname === '/forgotpassword') {
          return;
        }

        // Default for unauthenticated
        if (!hasCompletedWelcome) {
          router.replace('/welcome');
        } else {
          router.replace('/login');
        }
        return;
      }

      // ✅ AUTHENTICATED USER FLOW
      
      // Wait for meal preferences to load if we're still loading
      if (mealPreferencesLoading && !mealPreferences) {
        console.log('AuthChecker: Waiting for meal preferences to load...');
        return;
      }

      // Check if meal preferences are set
      const hasMealPreferences = mealPreferences?.mealService && 
        (mealPreferences.mealService.lunch?.enabled === true || 
         mealPreferences.mealService.dinner?.enabled === true);
      
      console.log('AuthChecker: Meal preferences check', {
        hasMealPreferences,
        pathname
      });

      // Define routes that require meal preferences
      const routesRequiringPreferences = [
        '/dashboard',
        '/schedule',
        '/response',
        '/custmorelist',
        '/payment'
      ];

      const isOnMealPreferencesScreen = pathname === '/providerseetingscreen';
      const isOnProtectedRoute = routesRequiringPreferences.some(route => pathname.startsWith(route));

      // 🍽️ Handle meal preferences access
      if (mealPreferences !== undefined) {
        // Case 1: No preferences and trying to access protected routes
        if (!hasMealPreferences && isOnProtectedRoute) {
          console.log('AuthChecker: No meal preferences, redirecting to setup');
          hasNavigatedRef.current = true;
          router.replace({
            pathname: '/providerseetingscreen',
            params: { 
              requireSetup: 'true',
              redirectFrom: pathname
            }
          });
          return;
        }

        // Case 2: Has preferences and on preferences screen (OK for updates)
        // Case 3: No preferences and on preferences screen (OK for setup)
        // Both cases are allowed - no redirect needed
      }

      // Check subscription/trial status
      let trialStatus = provider.trialStatus;
      let hasActiveSubscription = subscription?.status === 'active';
      
      // Fetch trial status if not available
      if (!trialStatus && provider?.id && provider?.token) {
        try {
          const trialResponse = await axios.get(
            `${API_URL}/api/subscription/trial-status/${provider.id}`,
            {
              headers: {
                'Authorization': `Bearer ${provider.token}`
              },
              timeout: 5000
            }
          );
          
          if (trialResponse.data.success) {
            trialStatus = trialResponse.data.trialStatus;
            hasActiveSubscription = trialResponse.data.hasActiveSubscription;
          }
        } catch (trialError) {
          console.error('AuthChecker: Failed to fetch trial status:', trialError);
        }
      }

      // Determine access rights
      const canAccess = hasActiveSubscription || trialStatus?.isActive;
      const requiresSubscription = trialStatus?.requiresSubscription && !hasActiveSubscription;
      
      console.log('AuthChecker: Access check', {
        canAccess,
        requiresSubscription,
        hasActiveSubscription,
        trialActive: trialStatus?.isActive
      });

      // 🚫 Trial expired, redirect to subscription
      if (requiresSubscription) {
        const allowedRoutes = ['/subscription', '/login', '/providerseetingscreen'];
        if (!allowedRoutes.some(route => pathname === route)) {
          console.log('AuthChecker: Trial expired, redirecting to subscription');
          hasNavigatedRef.current = true;
          router.replace({
            pathname: '/subscription',
            params: { 
              providerId: provider.id, 
              providerEmail: provider.email,
              trialExpired: 'true'
            }
          });
          return;
        }
      }
      
      // ✅ User can access (has subscription OR active trial)
      if (canAccess) {
        // Redirect from auth screens to dashboard
        if (pathname === '/login' || pathname === '/welcome' || pathname === '/') {
          console.log('AuthChecker: Authenticated, redirecting to dashboard');
          hasNavigatedRef.current = true;
          router.replace('/dashboard');
          return;
        }
        // Allow access to all other pages
        return;
      }
      
      // ⚠️ No subscription, no active trial - redirect to subscription
      if (pathname !== '/subscription' && pathname !== '/login' && pathname !== '/providerseetingscreen') {
        console.log('AuthChecker: No active subscription/trial, redirecting');
        hasNavigatedRef.current = true;
        router.replace({
          pathname: '/subscription',
          params: { 
            providerId: provider.id, 
            providerEmail: provider.email 
          }
        });
        return;
      }

    } catch (error) {
      console.error('AuthChecker: Error during auth check:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [
    pathname, 
    isAuthenticated, 
    hasCompletedWelcome, 
    mealPreferences, 
    mealPreferencesLoading,
    subscription,
    provider,
    router,
    isCheckingAuth
  ]);

  // Run auth check on relevant changes
  useEffect(() => {
    // Reset navigation flag on pathname change
    hasNavigatedRef.current = false;
    
    // Skip if already navigating
    if (hasNavigatedRef.current) return;
    
    // Add small delay to ensure state is updated
    const timer = setTimeout(() => {
      checkAccess();
    }, 100);

    return () => clearTimeout(timer);
  }, [
    pathname, 
    isAuthenticated, 
    hasCompletedWelcome, 
    mealPreferences,
    mealPreferencesLoading
  ]);

  // Show loading while checking preferences for first time
  if (isAuthenticated && mealPreferencesLoading && !mealPreferences) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#4B5563' }}>
          Loading your preferences...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}