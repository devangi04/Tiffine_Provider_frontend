import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FlatList,
  Image
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from './api/api';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { clearSearchQuery } from './store/slices/searchslice';
import DashboardHeader from '@/components/dahsboardheader';
import SearchBar from '@/components/searchbar';
import Text from '@/components/ztext';
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
  categoryId?: string;
  categoryName?: string;
  dishes?: Array<{ dishName: string }>;
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

// Define the desired category order
const CATEGORY_ORDER = ['sabji', 'roti', 'rice', 'dal', 'extra', 'special'];

// Function to sort categories in specific order
const sortCategories = (categories: MenuItem[]): MenuItem[] => {
  if (!categories || !Array.isArray(categories)) return [];
  
  return [...categories].sort((a, b) => {
    const aCategory = a.type?.toLowerCase() || a.categoryName?.toLowerCase() || '';
    const bCategory = b.type?.toLowerCase() || b.categoryName?.toLowerCase() || '';
    
    const aIndex = CATEGORY_ORDER.indexOf(aCategory);
    const bIndex = CATEGORY_ORDER.indexOf(bCategory);
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    return (a.type || a.categoryName || '').localeCompare(b.type || b.categoryName || '');
  });
};

// Category Icon Component
interface CategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ 
  categoryName, 
  size = 16, 
  color = "#6B7280" 
}) => {
  if (!categoryName) {
    return <Ionicons name="restaurant-outline" size={size} color={color} />;
  }

  const lowerName = categoryName.toLowerCase();
  
  switch (lowerName) {
    case 'sabji':
    case 'vegetable':
      return <Ionicons name="leaf-outline" size={size} color={color} />;
    case 'roti':
    case 'bread':
      return <MaterialCommunityIcons name="food-fork-drink" size={size} color={color} />;
    case 'rice':
      return <MaterialCommunityIcons name="rice" size={size} color={color} />;
    case 'dal':
    case 'curry':
      return <Ionicons name="water-outline" size={size} color={color} />;
    case 'extra':
      return <Ionicons name="add-circle-outline" size={size} color={color} />;
    case 'special':
      return <Ionicons name="star-outline" size={size} color={color} />;
    default:
      return <Ionicons name="restaurant-outline" size={size} color={color} />;
  }
};

const TiffinDashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Redux
  const provider = useAppSelector((state) => state.provider);
  const dispatch = useAppDispatch();
  const searchState = useAppSelector((state) => state.search);
  const searchResults = searchState.results;
  const searchLoading = searchState.loading;
  const searchError = searchState.error;
  const searchQuery = searchState.query;

  const navbarOpacity = new Animated.Value(1);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const providerId = provider.id;
  const [currentTime, setCurrentTime] = useState(new Date());
  const searchBarRef = useRef<any>(null);

    useEffect(() => {
    const handleTouchOutside = () => {
      if (isSearchFocused && searchQuery.trim().length === 0) {
        Keyboard.dismiss();
        setIsSearchFocused(false);
      }
    };

    // Add touch event listener
    const subscription = TouchableOpacity.TOUCH_TARGET_DEBUG && 
      TouchableOpacity.TOUCH_TARGET_DEBUG.addListener(handleTouchOutside);

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isSearchFocused, searchQuery]);

    const handleBackFromSearch = () => {
    Keyboard.dismiss();
    dispatch(clearSearchQuery());
    setIsSearchFocused(false);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
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

  // Clear search when returning to dashboard
 useFocusEffect(
  useCallback(() => {
    // Don't clear on focus - only clear on unmount
    return () => {
      // Clear when leaving the screen (not when coming back)
      dispatch(clearSearchQuery());
      setIsSearchFocused(false);
    };
  }, [dispatch])
);

  // Optimized data fetching (parallel requests)
  const fetchProviderData = async () => {
    try {
      setLoading(true);
      
      // Make both requests in parallel
      const [providerResponse, dashboardResponse] = await Promise.all([
        api.get(
          `${API_BASE_URL}/api/providers/${providerId}`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        ),
        api.get(
          `${API_BASE_URL}/api/providers/${providerId}/dashboard`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        )
      ]);

      if (providerResponse.data.success && dashboardResponse.data.success) {
        setProviderData(providerResponse.data.data);
        setDashboardData(dashboardResponse.data.data);
      } else {
        throw new Error(providerResponse.data.error || dashboardResponse.data.error || 'Failed to fetch data');
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

  // Clear search before navigation
const handleSearchItemClick = (item: SearchResultItem, category: string) => {
  // Dismiss keyboard
  Keyboard.dismiss();
  
  // Store the target route details first
  const targetRoute = {
    pathname: '/serachcustomerdetails',
    params: {
      id: item._id,
      name: item.name || item.customerName,
      phone: item.phone,
      tiffinType: item.tiffinType
    }
  };
  
  // Clear search and navigate in the same tick
  dispatch(clearSearchQuery());
  setIsSearchFocused(false);
  
  // Navigate immediately without delay
  router.push(targetRoute);
};

  const handleSearch = (text: string) => {
    // This is handled by SearchBar component
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const clearSearch = () => {
    dispatch(clearSearchQuery());
    setIsSearchFocused(false);
    Keyboard.dismiss();
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

  // Get sorted menu
  const sortedMenu = sortCategories(dashboardData?.menu || []);

  // Render search results
  const renderSearchResults = () => {
    if (searchQuery.trim().length === 0 && isSearchFocused) {
      // Show empty search state when focused but no query
      return (
        <View style={styles.searchResultsEmpty}>
          <Ionicons name="search-outline" size={64} color="#ccc" />
          <Text weight="medium" style={styles.emptySearchText}>Start typing to search</Text>
          <Text style={styles.emptySearchSubtext}>
            Search for customers, dishes, menus, responses, or bills
          </Text>
        </View>
      );
    }

    if (searchLoading) {
      return (
        <View style={styles.searchResultsLoading}>
          <ActivityIndicator size="large" color="#15803d" />
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
          <TouchableOpacity 
            style={styles.searchItem}
            onPress={() => handleSearchItemClick(item, item.category)}
            activeOpacity={0.7}
          >
            <View style={styles.searchItemContent}>
              <Text weight="semiBold" style={styles.searchItemName}>{getDisplayName(item)}</Text>
              <Text style={styles.searchItemType}>{getDisplayType(item, item.category)}</Text>
              <Text style={styles.searchItemInfo}>{getAdditionalInfo(item, item.category)}</Text>
            </View>
            <View style={[
              styles.categoryBadge,
              { backgroundColor: getCategoryColor(item.category) }
            ]}>
              <Text style={styles.categoryBadgeText}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View style={styles.searchResultsHeader}>
            <View style={styles.searchHeaderContent}>
              <Text weight="bold" style={styles.searchTitle}>Search Results</Text>
              <Text style={styles.searchSubtitle}>{totalSearchResults} results found</Text>
            </View>
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.searchResultsContainer}
        onScrollBeginDrag={() => Keyboard.dismiss()}
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

  // Helper function to capitalize first letter
  const capitalizeFirst = (str: string) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Render Today's Menu Card (Updated design)
  const renderTodaysMenuCard = () => {
    const hasMenu = sortedMenu.length > 0;
    
    return (
      <TouchableOpacity 
        style={styles.menuCard}
        onPress={() => router.push('/schedule')}
        activeOpacity={0.9}
      >
        <View style={styles.menuCardHeader}>
          <View style={styles.menuHeaderLeft}>
            <Ionicons name="restaurant" size={24} color="#FF3B30" />
            <View style={styles.menuHeaderCenter}>
              <Text weight="extraBold" style={styles.menuTitle}>
                Today's Menu
              </Text>
              <Text weight="bold" style={styles.menuSubtitle}>
                {new Date().toLocaleString('en-US', { weekday: 'long' })} Special
              </Text>
            </View>
          </View>
          <View style={styles.menuHeaderRight}>
            <View style={styles.menuStatusBadge}>
              <Ionicons 
                name={hasMenu ? "checkmark-circle" : "time-outline"} 
                size={14} 
                color={hasMenu ? "#10B981" : "#F59E0B"} 
              />
              <Text weight="bold" style={[
                styles.menuStatusText,
                { color: hasMenu ? "#10B981" : "#F59E0B" }
              ]}>
                {hasMenu ? 'Ready' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>
        
        {!hasMenu ? (
          <View style={styles.emptyMenu}>
            <Ionicons name="fast-food-outline" size={48} color="#D1D5DB" />
            <Text weight="bold" style={styles.emptyMenuTitle}>No Menu Available</Text>
            <Text weight="bold" style={styles.emptyMenuText}>
              Today's menu hasn't been send yet. Tap to add menu items.
            </Text>
          </View>
        ) : (
          <>
            {/* Compact Menu Preview */}
            <View style={styles.compactMenu}>
              {sortedMenu.slice(0, 4).map((item, index) => {
                const categoryName = item.type || item.categoryName || 'Category';
                const dishName = item.dish || item.dishes?.[0]?.dishName || 'No dish';
                
                return (
                  <View 
                    key={item.type || index} 
                    style={[
                      styles.compactCategory,
                      index >= 3 && styles.blurredCategory
                    ]}
                  >
                    <View style={styles.categoryHeader}>
                      <CategoryIcon 
                        categoryName={categoryName} 
                        size={16} 
                        color={index >= 3 ? "#D1D5DB" : "#6B7280"} 
                      />
                      <Text weight="bold" style={[
                        styles.compactCategoryName,
                        index >= 3 && styles.blurredText
                      ]}>
                        {capitalizeFirst(categoryName)}
                      </Text>
                    </View>
                    <Text weight="bold" style={[
                      styles.compactDish,
                      index >= 3 && styles.blurredText
                    ]}>
                      {capitalizeFirst(dishName)}
                    </Text>
                  </View>
                );
              })}
              
              {/* View Details Button */}
              {sortedMenu.length > 3 && (
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={() => router.push('/schedule')}
                >
                  <Text weight="bold" style={styles.viewDetailsText}>View Sent menu</Text>
                  <Ionicons name="chevron-forward" size={16} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Actions */}
            {/* <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/schedule')}
              >
                <Ionicons name="pencil" size={16} color="#3B82F6" />
                <Text weight="bold" style={styles.quickActionText}>Edit Menu</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => router.push('/response')}
              >
                <Ionicons name="eye" size={16} color="#10B981" />
                <Text weight="bold" style={styles.quickActionText}>View Responses</Text>
              </TouchableOpacity>
            </View> */}
          </>
        )}
      </TouchableOpacity>
    );
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
          colors={['#15803d']}
          tintColor={'#15803d'}
        />
      }
    >
      {/* Search Bar - Inside ScrollView so it scrolls */}
      <SearchBar 
        onSearch={handleSearch} 
        autoFocus={false}
        onFocus={handleSearchFocus}
        onBlur={() => {
          // Only blur if there's no text
          if (searchQuery.trim().length === 0) {
            setTimeout(() => {
              setIsSearchFocused(false);
            }, 200);
          }
        }}
      />
      
      {/* Hero Card */}
     <LinearGradient
  colors={['#15803d', '#17b751ff']}
  style={styles.heroCard}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
>
  <View style={styles.heroContent}>
    <Text weight="extraBold" style={styles.heroTitle}>
      Today's Tiffin Count
    </Text>
    <Text weight="extraBold" style={styles.heroValue}>
      {dashboardData?.todayOrders || 0}
    </Text>
  </View>

  {/* Image instead of Icon */}
  <Image
    source={require('../assets/images/Single_Logo_Trans.png')}
    style={styles.heroImage}
    resizeMode="contain"
  />
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
                <Text weight='bold' style={styles.statInfoSubtitle}>Will Take Tiffin</Text>
              </View>
              <View style={[styles.statIcon, { backgroundColor: '#10b981' }]} />
            </View>
            <Text weight='bold' style={styles.statValue}>{dashboardData?.yesResponses || 0}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={styles.statInfo}>
                <Text weight='bold' style={styles.statInfoTitle}>Response</Text>
                <Text weight='bold' style={styles.statInfoSubtitle}>Will Not Take Tiffin</Text>
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
          onPress={() => router.push('/schedule')}
        >
          <View style={styles.actionHeader}>
           <View>
              <Text weight='bold' style={styles.actionTitle}>Today’s Menu</Text>
              <Text weight='bold' style={styles.actionSubtitle}>Add or Update</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/response')}>
          <View style={styles.actionHeader}>
            <View>
              <Text weight='bold' style={styles.actionTitle}>Responses</Text>
              <Text weight='bold' style={styles.actionSubtitle}>View All</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Today's Menu Card - UPDATED DESIGN */}
      {renderTodaysMenuCard()}

      {/* Recent Orders */}
      <View style={styles.ordersCard}>
        <View style={styles.ordersHeader}>
          <Text weight='extraBold' style={styles.ordersTitle}>Recent Orders</Text>
          <Text weight='bold' style={styles.ordersSubtitle}>Latest customer orders</Text>
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
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      /> */}
      
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
          {searchQuery.trim().length > 0 || isSearchFocused ? (
            // Search Mode: SearchBar fixed, results scroll
            <View style={styles.searchModeContainer}>
              {/* Fixed SearchBar in search mode */}
              <View style={styles.searchBarFixed}>
                <SearchBar 
                  onSearch={handleSearch} 
                  autoFocus={true}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => {
                    if (searchQuery.trim().length === 0) {
                      // Small delay before hiding search mode
                      setTimeout(() => {
                        setIsSearchFocused(false);
                      }, 200);
                    }
                  }}
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
    paddingHorizontal: 30,
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
  },
  heroIcon: {
    fontSize: 48,
  },
  heroImage: {
  marginBottom:20,
  width: 48,
  height: 48,
  position: 'absolute',
  right: 16,
  bottom: 16,
  opacity: 0.95,
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
  },
  sectionTime: {
    color: '#555',
    fontSize: 14,
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
  actionStatusText: {
    fontSize: 11,
  },
  
  // Updated Menu Card Styles (Matching customer dashboard design)
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 0,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  menuCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuHeaderCenter: {
    marginLeft: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  menuHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  menuStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Empty Menu
  emptyMenu: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMenuTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyMenuText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Compact Menu with Blur Effect
  compactMenu: {
    padding: 20,
    paddingBottom: 0,
  },
  compactCategory: {
    marginBottom: 12,
  },
  blurredCategory: {
    opacity: 0.5,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  compactCategoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  compactDish: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 24,
  },
  blurredText: {
    color: '#D1D5DB',
  },
  
  // View Details Button
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    marginTop: -6,
    marginBottom: 4,
    gap: 2,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  // Orders Card
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
  ordersHeader: {
    marginBottom: 16,
  },
  ordersTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  ordersSubtitle: {
    fontSize: 12,
    color: '#666',
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
    color: '#15803d',
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
    color: '#333',
    marginBottom: 4,
  },
  searchItemType: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 4,
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
    color: 'white',
  },
  searchResultsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  searchResultsEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptySearchText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 18,
    marginTop: 16,
  },
  emptySearchSubtext: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    paddingHorizontal: 20,
  },
  noResultsText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 18,
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
    backgroundColor: '#15803d',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
  },
  
});

export default TiffinDashboard;