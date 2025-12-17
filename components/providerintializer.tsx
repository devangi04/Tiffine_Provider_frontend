import { useEffect, useState } from 'react';
import { useAppSelector } from '../app/store/hooks';
import { useRouter, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderInitializer = () => {
  const provider = useAppSelector((state) => state.provider);
  const router = useRouter();
  const pathname = usePathname();
  const [isFirstLaunchChecked, setIsFirstLaunchChecked] = useState(false);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');

        // If user hasn’t seen the welcome screen yet
        if (!hasSeenWelcome) {
          await AsyncStorage.setItem('hasSeenWelcome', 'true');
          router.replace('/welcome');
        } else {
          // Handle auth-based routing after first launch
          const publicRoutes = ['/welcome', '/login', '/register', '/forgotpassword'];

          if (!provider.id && !publicRoutes.includes(pathname)) {
            router.replace('/login'); // go to login instead of welcome after first time
          }

          if (provider.id && publicRoutes.includes(pathname)) {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
      } finally {
        setIsFirstLaunchChecked(true);
      }
    };

    checkFirstLaunch();
  }, [provider.id, pathname]);

  // Prevent rendering until check completes
  if (!isFirstLaunchChecked) return null;

  return null;
};

export default ProviderInitializer;
