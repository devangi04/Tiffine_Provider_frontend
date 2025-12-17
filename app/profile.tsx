// ProfileScreen.tsx - Updated design with round transparent circles
import React, { useState, useEffect } from 'react';
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
import {Text,TextStyles} from '@/components/ztext';

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

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Fixed useEffect with logout detection
  useEffect(() => {
    // Skip if logout is in progress
    if (isLoggingOut) {
      return;
    }

    const initializeProfile = async () => {
      try {
        setLoading(true);
        
        // Check if user is logged out or has invalid data
        if (!reduxProvider || !reduxProvider.id || reduxProvider.id === '') {
          setProvider(null);
          setLoading(false);
          return;
        }

        // If we have valid provider data in Redux, use it
        if (reduxProvider.id && reduxProvider.email) {
          setProvider({
            id: reduxProvider.id,
            name: reduxProvider.name || 'Provider',
            email: reduxProvider.email || '',
            phone: reduxProvider.phone || '',
            subscription: reduxProvider.subscription || null,
          });
        } else {
          // Fallback to API call if Redux data is incomplete
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
      
      // Additional safety check - skip if logout in progress
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
      
      // Don't show alert for network errors during logout
      if (!isLoggingOut && error.response?.status !== 401) {
        Alert.alert('Error', 'Failed to load profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Improved logout function - prevent multiple calls
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
              // 1. Dispatch logout thunk (clears Redux & calls API)
              await dispatch(logoutProvider()).unwrap();
              
              // 2. Clear persisted storage
              await persistor.purge();
              
              // 3. Navigate to login screen
              router.replace('/');
              
            } catch (error) {
              console.log('Logout completed locally:', error);
              // Even if there's an error, navigate to login
              router.replace('/');
            }
          }
        }
      ]
    );
  };

  // Navigation functions with safety checks
  const navigateToMenu = () => {
    if (isLoggingOut) return;
    
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/menu',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  };

  const navigateToDishMaster = () => {
    if (isLoggingOut) return;
    
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/dishmaster',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  };

  const navigateToCustomer = () => {
    if (isLoggingOut) return;
    
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/customer',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  };

  const navigateToSavedMenu = () => {
    if (isLoggingOut) return;
    
    if (!provider?.id && !reduxProvider?.id) {
      Alert.alert('Error', 'Please login again');
      router.replace('/');
      return;
    }
    
    router.push({
      pathname: '/savedmenu',
      params: { providerId: provider?.id || reduxProvider?.id }
    });
  };

  // Show loading during logout or initial load
  if (loading || isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.profileAvatar}>
                <Text weight='bold' style={styles.avatarText}>
                  {provider.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text  weight='bold'style={styles.profileName}>{provider.name}</Text>
                {/* <Text style={styles.profileEmail}>{provider.email}</Text> */}
              </View>
            </View>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => !isLoggingOut && router.push('/edit')}
              disabled={isLoggingOut}
            >
              <MaterialIcons name="edit" size={20} color="#004C99" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuList}>
            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={navigateToCustomer}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(0, 122, 255, 0.1)' }]}>
                <FontAwesome6 name="users" size={20} color="#007aff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Add Customer</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={navigateToDishMaster}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(255, 149, 0, 0.1)' }]}>
              <FontAwesome6 name="plate-wheat" size={24} color="#ff9500" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Categories & Dishes</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={navigateToMenu}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(52, 199, 89, 0.1)' }]}>
              <MaterialIcons name="restaurant-menu" size={24} color="#34c759" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Create Menu</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={navigateToSavedMenu}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(175, 82, 222, 0.1)' }]}>
                <MaterialIcons name="menu-book" size={24} color="#d656c1ff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>All Menu</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={() => !isLoggingOut && router.push('/providerseetingscreen')}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(235, 77, 60, 0.1)' }]}>
                <MaterialIcons name="food-bank" size={26} color="#c92b03ff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Meal Prefrences</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

 <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={() => !isLoggingOut && router.push('/payment')}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(88, 86, 214, 0.1)' }]}>
                <MaterialIcons name="payments" size={24} color="#5856d6" />
              </View>
              <Text  weight='semiBold' style={styles.menuText}>Customer Payment</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={() => !isLoggingOut && router.push('/subscriptionmanagement')}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(159, 193, 8, 0.1)' }]}>
                <MaterialIcons name="subscriptions" size={24} color="#9f9709ff" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>Subscription Details</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

 <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={() => !isLoggingOut && router.push('/legalmenu')}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(52, 152, 219, 0.1)' }]}>
                <Ionicons name="information-circle-outline" size={24} color="#3498db" />
              </View>
              <Text weight='semiBold' style={styles.menuText}>About & Legal</Text>
              <Feather name="chevron-right" size={20} color="#c7c7cc" />
            </TouchableOpacity>

        
            <TouchableOpacity 
              style={[styles.menuItem, isLoggingOut && styles.disabledMenuItem]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(255, 59, 48, 0.1)' }]}>
                <AntDesign name="logout" size={24} color="#ff3b30" />
              </View>
              <Text  weight='semiBold' style={[styles.menuText, { color: '#ff3b30' }]}>
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
    paddingBottom: 80,
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
    color: '#004C99',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#004C99',
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
  // Updated: Round transparent circle for icons
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    // Transparent background with slight tint
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // Default color, will be overridden
  },
  menuText: {
    flex: 1,
    fontSize: 17,
    color: '#000',
    fontWeight: '500',
  },
});

export default ProfileScreen;