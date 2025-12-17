import React, { useState, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { clearSearchQuery } from './store/slices/searchslice';
import DashboardHeader from '@/components/dahsboardheader';
import SearchBar from '@/components/searchbar';
import Text, {TextStyles} from '@/components/ztext';
import { API_URL } from './config/env';
const { width, height } = Dimensions.get('window');

const API_BASE_URL = API_URL;

// Define types for the provider data
interface ProviderData {
  _id: string;
  name: string;
  email: string;
  subscription?: {
    status: string;
  };
}

interface MenuItem {
  type: string;
  dish: string;
}

interface Order {
  customerName: string;
  quantity: number;
  time: string;
  status: string;
}

interface DashboardData {
  todayOrders: number;
  yesResponses: number;
  noResponses: number;
  menu: MenuItem[];
  recentOrders: Order[];
}

// Search result types
interface SearchResultItem {
  _id: string;
  name?: string;
  dishName?: string;
  menuName?: string;
  customerName?: string;
  type?: string;
  categoryName?: string;
  phone?: string;
  address?: string;
  tiffinType?: string;
  description?: string;
  day?: string;
  date?: string;
  reply?: string;
  status?: string;
  month?: string;
  quantity?: number;
  time?: string;
  isActive?: boolean;
}

const TiffinDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [activeNav, setActiveNav] = useState('Home');
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Redux
  const provider = useAppSelector((state) => state.provider);
  const dispatch = useAppDispatch();
  const searchState = useAppSelector((state) => state.search);
  const searchResults = searchState.results;
  const searchLoading = searchState.loading;
  const searchError = searchState.error;
  const searchQuery = searchState.query; // Get search query from Redux

  const navbarOpacity = new Animated.Value(1);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const providerId = provider.id;
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // update every second

    return () => clearInterval(interval); // cleanup when unmounting
  }, []);
  
  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (!providerId) {
      router.push('/login');
      return;
    }
    fetchProviderData();
  }, [providerId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        Animated.timing(navbarOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.timing(navbarOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const fetchProviderData = async () => {
    try {
      setLoading(true);
      
      // Fetch provider details
      const providerResponse = await axios.get(
        `${API_BASE_URL}/api/providers/${providerId}`,
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (providerResponse.data.success) {
        setProviderData(providerResponse.data.data);
        
        // Fetch dashboard data
        const dashboardResponse = await axios.get(
          `${API_BASE_URL}/api/providers/${providerId}/dashboard`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );

        if (dashboardResponse.data.success) {
          setDashboardData(dashboardResponse.data.data);
        } else {
          throw new Error(dashboardResponse.data.error || 'Failed to fetch dashboard data');
        }
      } else {
        throw new Error(providerResponse.data.error || 'Failed to fetch provider data');
      }
    } catch (error: any) {
      let errorMessage = 'Failed to fetch data. Please try again.';
      
      if (error.response) {
        errorMessage = error.response.data?.error || 
                      error.response.data?.message || 
                      `Server error (${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Check your connection.';
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviderData().then(() => {
      setRefreshing(false);
    });
  };

  const handleSearchItemClick = (item: SearchResultItem, category: string) => {
    switch (category) {
      case 'customers':
        // Navigate to customer details page
        router.push({
          pathname: '/serachcustomerdetails',
          params: {
            id: item._id,
            name: item.name || item.customerName,
            phone: item.phone,
            tiffinType: item.tiffinType
          }
        });
        break;
      case 'bills':
        // Navigate to bill page
        router.push({
          pathname: '/bill',
          params: { 
            billId: item._id,
            searchQuery: searchQuery 
          }
        });
        break;
      default:
        console.log('Unknown category:', category);
    }
    
    // DO NOT clear search here - let user see their search results when they come back
  };

  const handleSearch = (text: string) => {
    // Empty function - SearchBar handles Redux updates
    // Keep it for compatibility if needed
  };

  const clearSearch = () => {
    dispatch(clearSearchQuery());
  };

  // Helper function to get display name for search results
  const getDisplayName = (item: SearchResultItem): string => {
    return item.name || item.dishName || item.menuName || item.customerName || 'Unnamed Item';
  };

  // Helper function to get display type
  const getDisplayType = (item: SearchResultItem, category: string): string => {
    switch (category) {
      case 'customers':
        return `Customer • ${item.tiffinType || 'No Type'}`;
      case 'dishes':
        return `Dish • ${item.categoryName || 'No Category'}`;
      case 'menus':
        return `Menu • ${item.day || 'No Day'}`;
      case 'responses':
        return `Response • ${item.day || 'No Day'}`;
      case 'bills':
        return `Bill • ${item.month || 'No Month'}`;
      default:
        return 'Item';
    }
  };

  // Helper function to get additional info
  const getAdditionalInfo = (item: SearchResultItem, category: string): string => {
    switch (category) {
      case 'customers':
        return `${item.phone || 'No Phone'} • ${item.address || 'No Address'}`;
      case 'dishes':
        return item.description || 'No description';
      case 'menus':
        return item.date || 'No date';
      case 'responses':
        return item.reply || 'No reply';
      case 'bills':
        return `Status: ${item.status || 'Unknown'}`;
      default:
        return '';
    }
  };

  // Count total search results
  const totalSearchResults = 
    searchResults.customers.length +
    searchResults.dishes.length +
    searchResults.menus.length +
    searchResults.responses.length +
    searchResults.bills.length;

  // Render search results
  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.searchResultsLoading}>
          <ActivityIndicator size="large" color="#2c95f8" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    if (searchError) {
      return (
        <View style={styles.searchResultsLoading}>
          <Text style={styles.errorText}>Error: {searchError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={clearSearch}>
            <Text style={styles.retryButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (totalSearchResults === 0 && searchQuery.trim().length > 0) {
      return (
        <View style={styles.searchResultsLoading}>
          <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
          <Text style={styles.noResultsSubtext}>Try searching for customers, dishes, menus, responses, or bills</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={[
          ...searchResults.customers.map(item => ({ ...item, category: 'customers' })),
          ...searchResults.dishes.map(item => ({ ...item, category: 'dishes' })),
          ...searchResults.menus.map(item => ({ ...item, category: 'menus' })),
          ...searchResults.responses.map(item => ({ ...item, category: 'responses' })),
          ...searchResults.bills.map(item => ({ ...item, category: 'bills' })),
        ]}
        keyExtractor={(item) => `${item.category}-${item._id}`}
        renderItem={({ item }) => (
          <View style={styles.searchItem}>
            <TouchableOpacity 
              style={styles.searchItemContent}
              onPress={() => handleSearchItemClick(item, item.category)}
            >
              <Text style={styles.searchItemName}>{getDisplayName(item)}</Text>
              <Text style={styles.searchItemType}>{getDisplayType(item, item.category)}</Text>
              <Text style={styles.searchItemInfo}>{getAdditionalInfo(item, item.category)}</Text>
            </TouchableOpacity>
            <View style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(item.category) }
            ]}>
              <Text style={styles.categoryBadgeText}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <View style={styles.searchResultsHeader}>
            <View style={styles.searchHeaderContent}>
              <Text style={styles.searchTitle}>Search Results</Text>
              <Text style={styles.searchSubtitle}>{totalSearchResults} results found</Text>
            </View>
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.searchResultsContainer}
      />
    );
  };

  // Get color for category badge
  const getCategoryColor = (category: string): string => {
    const colors = {
      customers: '#10b981',
      dishes: '#3b82f6',
      menus: '#8b5cf6',
      responses: '#f59e0b',
      bills: '#ef4444'
    };
    return colors[category as keyof typeof colors] || '#6b7280';
  };

  // Render dashboard content
  const renderDashboardContent = () => (
    <ScrollView 
      style={styles.scrollView}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        keyboardVisible && { paddingBottom: 20 }
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2c95f8']}
          tintColor={'#2c95f8'}
        />
      }
    >
      {/* Search Bar - Inside ScrollView so it scrolls */}
      <SearchBar onSearch={handleSearch} />
      
      {/* Hero Card */}
      <LinearGradient
        colors={['#004C99', '#4694e2ff']}
        style={styles.heroCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <Text weight='extraBold'  style={styles.heroTitle}>Today's Orders</Text>
          <Text style={styles.heroValue}>{dashboardData?.todayOrders || 0}</Text>
        </View>

        <Ionicons name="fast-food-outline" size={42} color="#faf8f8ff" style={styles.heroIcon} />
      </LinearGradient>

      {/* Stats Section */}
      <View style={styles.section}>
        <View style={styles.dateTimeRow}>
          <Text weight='bold' style={styles.sectionDate}>
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          <Text weight='semiBold' style={styles.sectionTime}>
            {currentTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statInfo}>
                <Text weight='bold' style={styles.statInfoTitle}>Response</Text>
                <Text weight='bold' style={styles.statInfoSubtitle}>Yes Count</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: '#10b981' }]} />
            </View>
            <Text weight='bold' style={styles.statValue}>{dashboardData?.yesResponses || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statInfo}>
                <Text weight='bold' style={styles.statInfoTitle}>Response</Text>
                <Text weight='bold' style={styles.statInfoSubtitle}>No Count</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: '#eb1b1b' }]} />
            </View>
            <Text weight='bold' style={styles.statValue}>{dashboardData?.noResponses || 0}</Text>
          </View>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/menu')}
        >
          <View style={styles.actionHeader}>
            <View>
              <Text weight='bold' style={styles.actionTitle}>Menu</Text>
              <Text weight='bold' style={styles.actionSubtitle}>Create Today's</Text>
            </View>
            <View style={[styles.actionStatus, styles.statusActive]}>
              <Text  weight='bold' style={styles.actionStatusText}>Ready</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/response')}>
          <View style={styles.actionHeader}>
            <View>
              <Text weight='bold' style={styles.actionTitle}>Responses</Text>
              <Text style={styles.actionSubtitle}>View All</Text>
            </View>
            <View style={[styles.actionStatus, styles.statusActive]}>
              <Text weight='bold' style={styles.actionStatusText}>Check</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/custmorelist')}>
          <View style={styles.actionHeader}>
            <View>
              <Text  weight='bold'style={styles.actionTitle}>Customer</Text>
              <Text weight='bold' style={styles.actionSubtitle}>View All</Text>
            </View>
            <View style={[styles.actionStatus, styles.statusActive]}>
              <Text weight='bold' style={styles.actionStatusText}>{dashboardData?.todayOrders || 0} new</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Today's Menu */}
      <View style={styles.menuCard}>
        <View style={styles.menuHeader}>
          <Text weight='extraBold' style={styles.menuTitle}>Today's Menu</Text>
          <Text  weight='bold' style={styles.menuSubtitle}>
            {new Date().toLocaleString('en-US', { weekday: 'long' })} Special
          </Text>
        </View>
        {dashboardData?.menu && dashboardData.menu.length > 0 ? (
          dashboardData.menu.map((item, index) => (
            <View key={index} style={styles.menuItem}>
              <Text style={styles.menuType}>{item.type}</Text>
              <Text style={styles.menuDish}>{item.dish}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noMenuText}>No menu available for today</Text>
        )}
      </View>

      {/* Recent Orders */}
      <View style={styles.ordersCard}>
        <View style={styles.menuHeader}>
          <Text weight='extraBold' style={styles.menuTitle}>Recent Orders</Text>
          <Text  weight='bold' style={styles.menuSubtitle}>Latest customer orders</Text>
        </View>
        {dashboardData?.recentOrders && dashboardData.recentOrders.length > 0 ? (
          dashboardData.recentOrders.map((order, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.orderInfo}>
                <Text weight='bold' style={styles.orderName}>{order.customerName}</Text>
                <Text weight='bold' style={styles.orderDetails}>Qty: {order.quantity} • {order.time}</Text>
              </View>
              <View style={[
                styles.orderStatus, 
                order.status === 'Confirmed' ? styles.statusConfirmed : styles.statusPending
              ]}>
                <Text weight='bold' style={styles.orderStatusText}>{order.status}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.noOrdersText}>No recent orders</Text>
        )}
      </View>
      
      {/* Extra padding at bottom for navigation */}
      <View style={{ height: 80 + insets.bottom }} />
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 10}
      >
        {/* Fixed Header at Top */}
        <View style={styles.fixedHeader}>
          <DashboardHeader />
        </View>
        
        {/* Content Area - Different layout for search vs dashboard */}
        <View style={styles.contentArea}>
          {searchQuery.trim().length > 0 ? (
            // Search Mode: SearchBar fixed, results scroll
            <View style={styles.searchModeContainer}>
              {/* Fixed SearchBar in search mode */}
              <View style={styles.searchBarFixed}>
                <SearchBar 
                  onSearch={handleSearch} 
                  autoFocus={true} 
                />
              </View>
              {/* Scrollable Search Results */}
              <View style={styles.searchResultsArea}>
                {renderSearchResults()}
              </View>
            </View>
          ) : (
            // Dashboard Mode: Everything scrolls
            renderDashboardContent()
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  keyboardAvoid: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  // Fixed header section - Only DashboardHeader stays fixed
  fixedHeader: {
    backgroundColor: '#f8fafc',
    zIndex: 10,
  },
  // Search Mode Styles
  searchModeContainer: {
    flex: 1,
  },
  searchBarFixed: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    zIndex: 5,
  },
  searchResultsArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 8,
  },
  heroValue: {
    color: 'white',
    fontSize: 36,
    fontWeight: '700',
  },
  heroIcon: {
    fontSize: 48,
  },
  section: {
    marginBottom: 24,
    width: 'auto',
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sectionDate: {
    color: 'black',
    fontSize: 14,
    fontWeight: '900',
  },
  sectionTime: {
    color: '#555',
    fontSize: 14,
  },
  sectionTitle: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statInfo: {
    flex: 1,
  },
  statInfoTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  statInfoSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  statIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 16,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionTitle: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  actionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fef3c7',
  },
  actionStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  menuCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  menuHeader: {
    marginBottom: 16,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuType: {
    fontWeight: '600',
    color: '#3b82f6',
    fontSize: 13,
    minWidth: 60,
  },
  menuDish: {
    color: '#333',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  noMenuText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
    fontStyle: 'italic',
  },
  ordersCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  orderInfo: {
    flex: 1,
  },
  orderName: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
    marginBottom: 4,
  },
  orderDetails: {
    fontSize: 12,
    color: '#666',
  },
  orderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusConfirmed: {
    backgroundColor: '#dcfce7',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  noOrdersText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
    fontStyle: 'italic',
  },
  // Search Results Styles
  searchResultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchHeaderContent: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#2c95f8',
    fontWeight: '500',
  },
  searchItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  searchItemContent: {
    flex: 1,
  },
  searchItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  searchItemType: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 4,
    fontWeight: '500',
  },
  searchItemInfo: {
    fontSize: 12,
    color: '#666',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  searchResultsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  noResultsSubtext: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    color: '#eb1b1b',
    fontSize: 16,
    marginTop: 40,
  },
  retryButton: {
    backgroundColor: '#2c95f8',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '500',
  },
});

export default TiffinDashboard;