// app/components/AuthChecker.tsx

import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, usePathname } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';

import { RootState, AppDispatch } from '@/app/store';
import { fetchMealPreferences, resetJustSaved } from '@/app/store/slices/mealsslice';
import { fetchTrialStatus } from '@/app/store/slices/providerslice';

export default function AuthChecker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch<AppDispatch>();
  const redirectedRef = useRef(false);
const trialPopupShownRef = useRef(false);

  // =========================
  // 🔐 AUTH STATE
  // =========================
  const isAuthenticated = useSelector(
    (state: RootState) => !!state.provider.token
  );

  const hasCompletedWelcome = useSelector(
    (state: RootState) => state.app.hasCompletedWelcome
  );

  // =========================
  // 👤 PROVIDER STATE
  // =========================
  const provider = useSelector((state: RootState) => state.provider);
  const subscription = provider.subscription;
  const trialStatus = provider.trialStatus;


  
  // =========================
  // 🍽 MEAL PREFERENCES
  // =========================
  const mealPreferences = useSelector(
    (state: RootState) => state.mealPreferences.preferences
  );

  const mealLoading = useSelector(
    (state: RootState) => state.mealPreferences.loading
  );

  const justSaved = useSelector(
    (state: RootState) => state.mealPreferences.justSaved
  );

  // =========================
  // 🔄 RESET REDIRECT LOCK
  // =========================
  useEffect(() => {
    redirectedRef.current = false;
  }, [pathname, isAuthenticated]);

  // =========================
  // 🆓 FETCH TRIAL STATUS
  // =========================
  useEffect(() => {
    if (isAuthenticated && provider?.id && trialStatus === null) {
      dispatch(fetchTrialStatus(provider.id));
    }
  }, [isAuthenticated, provider?.id, trialStatus, dispatch]);

  // =========================
  // 🎁 TRIAL POPUP (ONCE)
  // =========================

// =========================
// 🎁 TRIAL POPUP (ONLY ONCE EVER)
// =========================
useEffect(() => {
  const showTrialPopup = async () => {
    if (!provider?.id || !trialStatus) return;

    if (
      trialStatus.isActive &&
      trialStatus.hasTrial &&
      subscription?.status !== 'active'
    ) {
      const key = `trial_popup_shown_${provider.id}`;

      const alreadyShown = await AsyncStorage.getItem(key);
      if (alreadyShown === 'true') return; // ❌ never show again

      Alert.alert(
        '🎁 Welcome to Your Free Trial',
        `You have ${trialStatus.daysLeft} days of free access.`,
        [
          {
            text: 'View Plans',
            onPress: () => router.replace('/subscription'),
          },
          { text: 'Continue', style: 'cancel' },
        ]
      );

      await AsyncStorage.setItem(key, 'true'); // ✅ permanently saved
    }
  };

  showTrialPopup();
}, [provider?.id, trialStatus, subscription?.status]);


  // =========================
  // 🍽 FETCH MEAL PREFS
  // =========================
  // true if meal preferences have been loaded from server
const mealFetched = !mealLoading && (mealPreferences !== null || provider.hasMealPreferences);

  useEffect(() => {
    if (
      isAuthenticated &&
      provider?.id &&
      provider?.token &&
      !mealPreferences &&
      !mealLoading
    ) {
      dispatch(fetchMealPreferences());
    }
  }, [isAuthenticated, provider?.id, provider?.token, mealPreferences, mealLoading, dispatch]);

  // =========================
  // 🚦 MAIN ROUTE GUARD
  // =========================
  useEffect(() => {
    if (redirectedRef.current) return;

    const providerReady =
      isAuthenticated &&
      provider?.id &&
      provider?.token &&
      trialStatus !== null;

    if (isAuthenticated && !providerReady) return;

    // ROOT
    if (pathname === '/') {
      redirectedRef.current = true;
      router.replace(
        isAuthenticated
          ? '/dashboard'
          : hasCompletedWelcome
          ? '/login'
          : '/welcome'
      );
      return;
    }

    // UNAUTH
    if (!isAuthenticated) {
      const publicRoutes = ['/welcome', '/login', '/forgotpassword'];
      if (!publicRoutes.includes(pathname)) {
        redirectedRef.current = true;
        router.replace(hasCompletedWelcome ? '/login' : '/welcome');
      }
      return;
    }

    if (mealLoading) return;

    // =========================
    // 🍽 MEAL CHECK (SIMPLIFIED)
    // =========================
    
    // ✅ Use ONLY provider.hasMealPreferences (single source of truth)
const hasMealPreferences =
  provider.hasMealPreferences ||  // Redux flag
  mealPreferences?.hasMealPreferences ||  // fetched from backend
  justSaved;
    // Routes that require meal preferences
    const protectedRoutes = [
      '/dashboard',
      '/schedule',
      '/response',
      '/custmorelist',
      '/payment',
    ];

    // Check if current route is protected
    const isProtectedRoute = protectedRoutes.some(r => pathname.startsWith(r));
    
    // Check if we're on meal setup screen
    const isMealSetupScreen = pathname === '/providerseetingscreen';

    // 🚨 Redirect to meal setup if needed
   if (
  !hasMealPreferences &&
  isProtectedRoute &&
  !isMealSetupScreen &&
  mealFetched &&
  !redirectedRef.current
) {
  // Wait 100ms to allow slice updates to propagate
  setTimeout(() => {
    redirectedRef.current = true;
    router.replace('/providerseetingscreen');
  }, 100);
  return;
}

    // =========================
    // 💳 SUBSCRIPTION CHECK
    // =========================
    const hasActiveSubscription = subscription?.status === 'active';
    const trialActive = trialStatus?.isActive === true;

    // Wait if trialStatus is still loading
    if (trialStatus === null) return;

    if (!hasActiveSubscription && !trialActive) {
      if (pathname !== '/subscription') {
        redirectedRef.current = true;
        router.replace('/subscription');
      }
      return;
    }

    // =========================
    // ✅ CONSUME justSaved FLAG
    // Only reset when we're on dashboard and have meal preferences
    // =========================
    if (justSaved && pathname === '/dashboard' && hasMealPreferences) {
      dispatch(resetJustSaved());
    }

    // =========================
    // 🚫 BLOCK AUTH SCREENS WHEN LOGGED IN
    // =========================
    if (pathname === '/login' || pathname === '/welcome') {
      redirectedRef.current = true;
      router.replace('/dashboard');
    }
  }, [
    pathname,
    isAuthenticated,
    hasCompletedWelcome,
    provider,
    subscription,
    trialStatus,
    mealPreferences,
    mealLoading,
    justSaved,
    dispatch, // ✅ Added
    router,   // ✅ Added
  ]);

  return <>{children}</>;
}