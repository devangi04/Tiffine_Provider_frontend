// hooks/useAuthCheck.ts
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../app/store/hooks';

export const useAuthCheck = (providerId?: string, skipCheck = false) => {
  const router = useRouter();
  const reduxProvider = useAppSelector((state) => state.provider);

  useEffect(() => {
    if (skipCheck) return;

    // Check if user is authenticated
    const isAuthenticated = reduxProvider?.id && reduxProvider.id !== '';
    
    // If no providerId AND no authenticated user in Redux, show error
    if (!providerId && !isAuthenticated) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to home with reset
              router.replace({
                pathname: '/',
                params: { 
                  forceRefresh: Date.now(),
                  logout: 'true'
                }
              });
            }
          }
        ]
      );
      return;
    }

    // Optional: Validate providerId matches Redux provider
    if (providerId && reduxProvider?.id && providerId !== reduxProvider.id) {
      Alert.alert(
        'Session Mismatch',
        'Session mismatch detected. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/');
            }
          }
        ]
      );
    }
  }, [providerId, reduxProvider, skipCheck]);

  // Return authentication status and provider
  return {
    isAuthenticated: !!(reduxProvider?.id && reduxProvider.id !== ''),
    provider: reduxProvider,
    providerId: reduxProvider?.id || providerId
  };
};