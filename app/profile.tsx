// ProfileScreen.tsx - Updated with double-tap prevention
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import axios from 'axios';
import { Text } from '@/components/ztext';
import { AntDesign, Feather, MaterialIcons, Ionicons, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { clearProvider } from './store/slices/providerslice';
import { persistor } from './store/index';
import { API_URL } from './config/env';
import { logoutProvider } from './store/slices/providerslice';

const API_BASE_URL = API_URL;

interface Subscription {
  isActive: boolean;
  plan?: string;
}

interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  subscription?: Subscription | null;
}

const ProfileScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // Get provider data from Redux store
  const reduxProvider = useAppSelector((state) => state.provider);
  
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Use ref to track navigation state without re-renders
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastNavigationTimeRef = useRef<number>(0);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Fixed useEffect with logout detection
  useEffect(() => {
    if (isLoggingOut) {
      return;
    }

    const initializeProfile = async () => {
      try {
        setLoading(true);
        
        if (!reduxProvider || !reduxProvider.id || reduxProvider.id === '') {
          setProvider(null);
          setLoading(false);
          return;
        }

        if (reduxProvider.id && reduxProvider.email) {
          setProvider({
            id: reduxProvider.id,
            name: reduxProvider.name || 'Provider',
            email: reduxProvider.email || '',
            phone: reduxProvider.phone || '',
            subscription: reduxProvider.subscription || null,
          });
        } else {
          await fetchProviderProfile();
        }
      } catch (error) {
        setProvider(null);
      } finally {
        setLoading(false);
      }
    };

    initializeProfile();
  }, [reduxProvider]);

  const fetchProviderProfile = async () => {
    try {
      setLoading(true);
      
      if (isLoggingOut || !reduxProvider || !reduxProvider.id) {
        setLoading(false);
        return;
      }
      
      const response = await axios.get<{
        success: boolean;
        data?: Provider;
        error?: string;
      }>(`${API_URL}/api/providers/me`, {
        withCredentials: true
      });
      
      if (response.data.success && response.data.data) {
        setProvider(response.data.data);
      } else {
        throw new Error(response.data.error || 'Failed to fetch profile');
      }
    } catch (error) {
      if (!isLoggingOut && error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Safe navigation handler with debounce
  const safeNavigate = useCallback((navigateFunction: () => void, screenName: string) => {
    const now = Date.now();
    const timeSinceLastNav = now - lastNavigationTimeRef.current;
    
    // Prevent navigation if already navigating, logging out, or clicked too recently
    if (isNavigating || isLoggingOut || timeSinceLastNav < 500) {
      return;
    }
    
    // Update last navigation time
    lastNavigationTimeRef.current = now;
    setIsNavigating(true);
    
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    
    try {
      navigateFunction();
    } catch (error) {
      setIsNavigating(false);
      return;
    }
    
    // Reset navigation state after delay (500ms should be enough for navigation to start)
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
    }, 500);
  }, [isNavigating, isLoggingOut]);

  // Navigation functions with safety checks
  const navigateToMenu = useCallback(() => {
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/menu',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  }, [provider, reduxProvider, router]);

  const navigateToDishMaster = useCallback(() => {
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/dishmaster',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  }, [provider, reduxProvider, router]);

  const navigateToCustomer = useCallback(() => {
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/customer',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  }, [provider, reduxProvider, router]);

  const navigateToSavedMenu = useCallback(() => {
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/savedmenu',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  }, [provider, reduxProvider, router]);

const handleLogout = () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to log out?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            setIsLoggingOut(true);
            
            // Clear any pending navigation timeout
            if (navigationTimeoutRef.current) {
              clearTimeout(navigationTimeoutRef.current);
            }
            
            // 1. Dispatch logout thunk - DON'T AWAIT IT
            dispatch(logoutProvider());
            
            // 2. Immediately clear navigation stack and navigate
            // This prevents the ProfileScreen from showing again
            router.dismissAll();
            router.replace('/login');
            
            // 3. DO NOT wait for Redux state to update
            // AuthChecker will handle it automatically
            
          } catch (error) {
            console.error('Logout error:', error);
            // Still navigate to root
            router.dismissAll();
            router.replace('/login');
          } finally {
            setIsLoggingOut(false);
          }
        }
      }
    ]
  );
};
  // Helper for direct router pushes (without provider check)
  const navigateToScreen = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  // Show loading during logout or initial load
  if (loading || isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        {isLoggingOut && <Text style={styles.loggingOutText}>Logging out...</Text>}
      </View>
    );
  }

  // Show login prompt if no provider data
  if (!provider) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Please login to continue</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.retryButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if any button should be disabled
  const isDisabled = isLoggingOut || isNavigating;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Text weight='bold' style={styles.avatarText}>
                  {provider.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text weight='bold' style={styles.profileName}>{provider.name}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.editButton, isDisabled && styles.disabledButton]}
              onPress={() => !isDisabled && router.push('/edit')}
              disabled={isDisabled}
            >
              <MaterialIcons name="edit" size={20} color="#15803d" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuList}>
            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => safeNavigate(navigateToCustomer, 'customer')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <FontAwesome6 name="users" size={20} color="#007aff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Add Customer</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => safeNavigate(navigateToDishMaster, 'dishmaster')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
                <FontAwesome6 name="plate-wheat" size={24} color="#ff9500" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Categories & Dishes</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => safeNavigate(navigateToMenu, 'menu')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
                <MaterialIcons name="restaurant-menu" size={24} color="#34c759" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Create Menu</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => safeNavigate(navigateToSavedMenu, 'savedmenu')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]}>
                <MaterialIcons name="menu-book" size={24} color="#d656c1ff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>All Menu</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => !isDisabled && safeNavigate(() => router.push('/providerseetingscreen'), 'providerseetingscreen')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(235, 77, 60, 0.1)' }]}>
                <MaterialIcons name="food-bank" size={26} color="#c92b03ff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Meal Prefrences</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => !isDisabled && safeNavigate(() => router.push('/payment'), 'payment')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}>
                <MaterialIcons name="payments" size={24} color="#5856d6" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Customer Payment</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => !isDisabled && safeNavigate(() => router.push('/subscriptionmanagement'), 'subscriptionmanagement')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(159, 193, 8, 0.1)' }]}>
                <MaterialIcons name="subscriptions" size={24} color="#9f9709ff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Subscription Details</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={() => !isDisabled && safeNavigate(() => router.push('/legalmenu'), 'legalmenu')}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                <Ionicons name="information-circle-outline" size={24} color="#3498db" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>About & Legal</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isDisabled && styles.disabledMenuItem]}
              onPress={handleLogout}
              disabled={isDisabled}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                <AntDesign name="logout" size={24} color="#ff3b30" />
              </View>
              <Text weight='semiBold' style={[styles.menuText, { color: '#ff3b30' }]}>
                {isLoggingOut ? 'Logging out...' : 'Log out'}
              </Text>
              <Feather name="chevron-right" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    // paddingTop:70,
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loggingOutText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#7190fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 120,
    flexGrow: 1,
  },
  profileCard: {
    margin: 20,
    backgroundColor: '#ebeaeaff',
    borderRadius: 12,
    padding: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#15803d',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  editButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
     marginBottom: 2,
  },
  disabledButton: {
    opacity: 0.5,
  },
  menuList: {
    marginHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  disabledMenuItem: {
    opacity: 0.5,
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 17,
    color: '#000',
    fontWeight: '500',
  },
});

export default ProfileScreen;