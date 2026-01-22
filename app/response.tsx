import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Dimensions,
  TextInput,
  Animated,
  Modal
} from 'react-native';
import { Text } from '@/components/ztext';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, X, Calendar, FileText, Search, ChevronRight, Sun, Moon, Filter, ChevronDown } from 'lucide-react-native';
import api from './api/api';
import { useNavigation } from 'expo-router';
import moment from 'moment';
import { API_URL } from './config/env';
import { useAppSelector } from './store/hooks';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = `${API_URL}/api`;

interface Customer {
  _id: string;
  name: string;
  phone: string;
  tiffinRate?: number;
}

interface Response {
  _id: string;
  customerId: Customer;
  menuDate: string;
  mealType: 'lunch' | 'dinner';
  status: 'yes' | 'no' | 'pending';
  responseReceivedAt?: string;
  source: string;
  isAutoDetected?: boolean;
  respondedBeforeCutoff?: boolean;
  cutoffTimeUsed?: string;
}

interface TimingInfo {
  cutoffTime: string;
  canRespond: boolean;
  reason?: string;
  currentTime: string;
  mealType: 'lunch' | 'dinner';
}

interface MealTimingInfo {
  lunch?: TimingInfo;
  dinner?: TimingInfo;
}

const MEAL_TYPES = [
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#15803d' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#15803d' }
];

const STATUS_COLORS = {
  yes: '#10B981',
  no: '#EF4444',
  pending: '#F59E0B'
};

const STATUS_LABELS = {
  all: 'All Responses',
  yes: 'Confirmed',
  no: 'Declined',
  pending: 'Pending'
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// How many items to load at a time
const INITIAL_LOAD_COUNT = 10;
const LOAD_MORE_COUNT = 10;

const ResponseScreen = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();
  
  // Separate state for each meal type
  const [lunchResponses, setLunchResponses] = useState<Response[]>([]);
  const [dinnerResponses, setDinnerResponses] = useState<Response[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [refreshing, setRefreshing] = useState(false);
  
  // Separate search queries for each meal type
  const [lunchSearchQuery, setLunchSearchQuery] = useState('');
  const [dinnerSearchQuery, setDinnerSearchQuery] = useState('');
  
  // Separate filters for each meal type
  const [lunchStatusFilter, setLunchStatusFilter] = useState<'all' | 'yes' | 'no' | 'pending'>('all');
  const [dinnerStatusFilter, setDinnerStatusFilter] = useState<'all' | 'yes' | 'no' | 'pending'>('all');
  
  // Separate expanded items for each meal type
  const [lunchExpandedItems, setLunchExpandedItems] = useState<Record<string, boolean>>({});
  const [dinnerExpandedItems, setDinnerExpandedItems] = useState<Record<string, boolean>>({});
  
  // Load more states for each meal type
  const [lunchDisplayCount, setLunchDisplayCount] = useState(INITIAL_LOAD_COUNT);
  const [dinnerDisplayCount, setDinnerDisplayCount] = useState(INITIAL_LOAD_COUNT);
  const [lunchLoadingMore, setLunchLoadingMore] = useState(false);
  const [dinnerLoadingMore, setDinnerLoadingMore] = useState(false);
  
  const [timingInfo, setTimingInfo] = useState<MealTimingInfo | null>(null);
  const navigation = useNavigation();
  
  // Swipe implementation for meal types
  const scrollX = useRef(new Animated.Value(0)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<FlatList>(null);
  const lunchTextColor = useRef(new Animated.Value(1)).current;
  const dinnerTextColor = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Calendar state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [showMonthSelector, setShowMonthSelector] = useState(false);
  const [showYearSelector, setShowYearSelector] = useState(false);
  const [selectedYear, setSelectedYear] = useState(moment().year());
  
  // Search debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Filter state
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Meal preferences
  const [mealPrefs, setMealPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState<boolean>(true);
  const [hasMultipleMealTypes, setHasMultipleMealTypes] = useState<boolean>(true);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (!providerId) {
      router.push('/');
      return;
    }
    fetchMealPreferences();
  }, [providerId]);

  // Helper function to check if a date is in the past (yesterday or earlier)
const isPastDate = (date: string): boolean => {
  const today = moment().startOf('day');
  const selectedDay = moment(date).startOf('day');
  return selectedDay.isBefore(today);
};

  // Get available meal types based on preferences
  const getAvailableMealTypes = useCallback(() => {
    if (!mealPrefs) {
      return MEAL_TYPES;
    }
    
    const availableTypes = [];
    
    if (mealPrefs.lunch?.enabled === true) {
      availableTypes.push({ id: 'lunch', name: 'Lunch', icon: Sun, color: '#15803d' });
    }
    
    if (mealPrefs.dinner?.enabled === true) {
      availableTypes.push({ id: 'dinner', name: 'Dinner', icon: Moon, color: '#15803d' });
    }
    
    if (availableTypes.length === 0) {
      return MEAL_TYPES;
    }
    
    return availableTypes;
  }, [mealPrefs]);

  // Fetch meal preferences
  const fetchMealPreferences = async () => {
    try {
      setPrefsLoading(true);
      const response = await api.get(`${API_BASE_URL}/Provider/preferences`, {
        headers: {
          Authorization: `Bearer ${providerId}`,
        }
      });
      
      if (response.data.success) {
        const mealService = response.data.data.mealService;
        setMealPrefs(mealService);
        
        // Determine if both lunch and dinner are enabled
        const lunchEnabled = mealService?.lunch?.enabled === true;
        const dinnerEnabled = mealService?.dinner?.enabled === true;
        
        // Check if we should show multiple meal types
        const shouldShowMultiple = lunchEnabled && dinnerEnabled;
        setHasMultipleMealTypes(shouldShowMultiple);
        
        // If only one meal type is enabled, set it as default
        if (!shouldShowMultiple && (lunchEnabled || dinnerEnabled)) {
          if (lunchEnabled) {
            setSelectedMealType('lunch');
            setActiveIndex(0);
          } else if (dinnerEnabled) {
            setSelectedMealType('dinner');
            setActiveIndex(1);
          }
        }
      } else {
        setHasMultipleMealTypes(true);
        setMealPrefs({
          lunch: { enabled: true },
          dinner: { enabled: true }
        });
      }
    } catch (error) {
      setHasMultipleMealTypes(true);
      setMealPrefs({
        lunch: { enabled: true },
        dinner: { enabled: true }
      });
    } finally {
      setPrefsLoading(false);
      fetchAllResponses(true);
      fetchTimingInfo();
    }
  };

  // Fetch responses for specific date
 const fetchResponsesForDate = async (date: string, showLoading: boolean = false) => {
  try {
    if (showLoading) {
      setRefreshing(true);
    }
    
    // Reset display counts when fetching new data
    setLunchDisplayCount(INITIAL_LOAD_COUNT);
    setDinnerDisplayCount(INITIAL_LOAD_COUNT);
    
    // Fetch both responses in parallel
    const [lunchResponse, dinnerResponse] = await Promise.all([
      api.get(`${API_BASE_URL}/responses/daily`, {
        params: {
          providerId,
          date,
          mealType: 'lunch'
        }
      }),
      api.get(`${API_BASE_URL}/responses/daily`, {
        params: {
          providerId,
          date,
          mealType: 'dinner'
        }
      })
    ]);

    if (lunchResponse.data.success) {
      setLunchResponses(lunchResponse.data.data.responses || []);
    }

    if (dinnerResponse.data.success) {
      setDinnerResponses(dinnerResponse.data.data.responses || []);
    }

  } catch (err: any) {
    console.error('Error fetching responses:', err);
    if (showLoading) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    }
  } finally {
    if (showLoading) {
      setRefreshing(false);
      setLoading(false);
    }
  }
};

  // Initial fetch with loading
  const fetchAllResponses = async (showLoading: boolean = true) => {
    if (showLoading) {
      setLoading(true);
    }
    await fetchResponsesForDate(selectedDate, showLoading);
  };

  useEffect(() => {
    if (!providerId || prefsLoading) return;
    
    fetchResponsesForDate(selectedDate, false);
    fetchTimingInfo();
  }, [selectedDate, providerId]);

  const fetchTimingInfo = async () => {
    try {
      const response = await api.get(`${API_BASE_URL}/responses/timing`, {
        params: { providerId }
      });
      
      if (response.data.success) {
        setTimingInfo(response.data.data.timing);
      }
    } catch (err) {
      console.error('Error fetching timing info:', err);
    }
  };

  const getCurrentTimingInfo = (): TimingInfo | null => {
    if (!timingInfo) return null;
    return timingInfo[selectedMealType] || null;
  };

  // Setup scroll listener for meal type animations
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const progress = value / width;
      const indicatorWidth = (width - 60) / 2-8;
      const position = progress * indicatorWidth;
      indicatorPosition.setValue(position);
      
      lunchTextColor.setValue(1 - progress);
      dinnerTextColor.setValue(progress);
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, []);

  // Handle scroll end to update selected meal type
  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    
    if (index !== activeIndex) {
      setActiveIndex(index);
      const mealType = getAvailableMealTypes()[index]?.id as 'lunch' | 'dinner' || 'lunch';
      setSelectedMealType(mealType);
    }
  };

  // Handle meal type tab press
  const handleMealTypePress = (mealType: 'lunch' | 'dinner') => {
    const availableTypes = getAvailableMealTypes();
    const index = availableTypes.findIndex(type => type.id === mealType);
    
    if (index !== -1 && scrollViewRef.current) {
      scrollViewRef.current.scrollToOffset({
        offset: index * width,
        animated: true,
      });
      
      setActiveIndex(index);
      setSelectedMealType(mealType);
    }
  };

  // Optimized date change
  const handleDateChangeOptimized = useCallback(async (days: number) => {
    const newDate = moment(selectedDate).add(days, 'days').format('YYYY-MM-DD');
    setSelectedDate(newDate);
    
    // Reset states
    if (selectedMealType === 'lunch') {
      setLunchDisplayCount(INITIAL_LOAD_COUNT);
      setLunchStatusFilter('all');
      setLunchSearchQuery('');
    } else {
      setDinnerDisplayCount(INITIAL_LOAD_COUNT);
      setDinnerStatusFilter('all');
      setDinnerSearchQuery('');
    }
    
    // Fetch new responses without full page reload
    await fetchResponsesForDate(newDate, false);
  }, [selectedDate, selectedMealType, providerId]);

  // Handle arrow button clicks
  const handleDateArrowClick = useCallback((direction: 'left' | 'right') => {
    const days = direction === 'left' ? -1 : 1;
    handleDateChangeOptimized(days);
  }, [handleDateChangeOptimized]);

 const updateResponse = async (customerId: string, newStatus: 'yes' | 'no') => {
  try {
    // Check if date is in the past
    if (isPastDate(selectedDate)) {
      Alert.alert(
        'Cannot Modify Response',
        'Responses for past dates cannot be modified.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const response = await api.post(`${API_BASE_URL}/response`, {
      customerId,
      menuDate: selectedDate,
      mealType: selectedMealType,
      status: newStatus,
      source: 'manual'
    });
    
    if (response.data.success) {
      // Update the appropriate state based on meal type
      if (selectedMealType === 'lunch') {
        setLunchResponses(prev => prev.map(res => 
          res.customerId._id === customerId && res.mealType === 'lunch'
            ? { 
                ...res, 
                status: newStatus, 
                responseReceivedAt: new Date().toISOString(),
                source: 'manual',
                isAutoDetected: false
              } 
            : res
        ));
      } else {
        setDinnerResponses(prev => prev.map(res => 
          res.customerId._id === customerId && res.mealType === 'dinner'
            ? { 
                ...res, 
                status: newStatus, 
                responseReceivedAt: new Date().toISOString(),
                source: 'manual',
                isAutoDetected: false
              } 
            : res
        ));
      }
      
      Alert.alert('Success', `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} response updated to ${newStatus.toUpperCase()}`);
    }
  } catch (err: any) {
    const errorMessage = err.response?.data?.message || 'Failed to update response';
    
    if (err.response?.data?.cutoffTime) {
      Alert.alert(
        'Response Not Allowed',
        `${errorMessage}\n\nCutoff Time: ${err.response.data.cutoffTime}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', errorMessage);
    }
  }
};

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllResponses(false);
    fetchTimingInfo();
    
    // Reset filters and display counts for current meal type
    if (selectedMealType === 'lunch') {
      setLunchDisplayCount(INITIAL_LOAD_COUNT);
      setLunchStatusFilter('all');
    } else {
      setDinnerDisplayCount(INITIAL_LOAD_COUNT);
      setDinnerStatusFilter('all');
    }
  }, [selectedMealType]);

  // Get filtered responses with memoization
  const getFilteredResponses = useCallback((mealType: 'lunch' | 'dinner') => {
    const responses = mealType === 'lunch' ? lunchResponses : dinnerResponses;
    const searchQuery = mealType === 'lunch' ? lunchSearchQuery : dinnerSearchQuery;
    const statusFilter = mealType === 'lunch' ? lunchStatusFilter : dinnerStatusFilter;
    
    return responses.filter(response => {
      if (response.mealType !== mealType) return false;
      
      const matchesSearch = 
        response.customerId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        response.customerId.phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [lunchResponses, dinnerResponses, lunchSearchQuery, dinnerSearchQuery, lunchStatusFilter, dinnerStatusFilter]);

  // Get displayed responses with load more
  const getDisplayedResponses = useCallback((mealType: 'lunch' | 'dinner') => {
    const filteredResponses = getFilteredResponses(mealType);
    const displayCount = mealType === 'lunch' ? lunchDisplayCount : dinnerDisplayCount;
    
    // Sort responses (you can customize sorting here)
    const sortedResponses = [...filteredResponses].sort((a, b) => {
      // Sort by name alphabetically
      return a.customerId.name.localeCompare(b.customerId.name);
    });
    
    return {
      displayedResponses: sortedResponses.slice(0, displayCount),
      totalFilteredCount: sortedResponses.length,
      hasMore: displayCount < sortedResponses.length,
      filteredResponses: sortedResponses
    };
  }, [getFilteredResponses, lunchDisplayCount, dinnerDisplayCount]);

  // Handle load more
  const handleLoadMore = useCallback((mealType: 'lunch' | 'dinner') => {
    if (mealType === 'lunch') {
      setLunchLoadingMore(true);
      // Simulate loading delay
      setTimeout(() => {
        setLunchDisplayCount(prev => prev + LOAD_MORE_COUNT);
        setLunchLoadingMore(false);
      }, 300);
    } else {
      setDinnerLoadingMore(true);
      setTimeout(() => {
        setDinnerDisplayCount(prev => prev + LOAD_MORE_COUNT);
        setDinnerLoadingMore(false);
      }, 300);
    }
  }, []);

  // Handle status filter change
  const handleStatusFilter = useCallback((status: 'all' | 'yes' | 'no' | 'pending') => {
    if (selectedMealType === 'lunch') {
      setLunchStatusFilter(status);
      setLunchDisplayCount(INITIAL_LOAD_COUNT);
    } else {
      setDinnerStatusFilter(status);
      setDinnerDisplayCount(INITIAL_LOAD_COUNT);
    }
    setShowFilterMenu(false);
  }, [selectedMealType]);

  // Clear all filters for current meal type
  const clearFilters = useCallback(() => {
    if (selectedMealType === 'lunch') {
      setLunchStatusFilter('all');
      setLunchSearchQuery('');
      setLunchDisplayCount(INITIAL_LOAD_COUNT);
    } else {
      setDinnerStatusFilter('all');
      setDinnerSearchQuery('');
      setDinnerDisplayCount(INITIAL_LOAD_COUNT);
    }
    setShowFilterMenu(false);
  }, [selectedMealType]);

  // Handle search query change with debounce
  const handleSearchQueryChange = useCallback((query: string) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Update query immediately
    if (selectedMealType === 'lunch') {
      setLunchSearchQuery(query);
    } else {
      setDinnerSearchQuery(query);
    }
    
    // Debounce display count reset
    searchTimeoutRef.current = setTimeout(() => {
      if (selectedMealType === 'lunch') {
        setLunchDisplayCount(INITIAL_LOAD_COUNT);
      } else {
        setDinnerDisplayCount(INITIAL_LOAD_COUNT);
      }
    }, 300);
  }, [selectedMealType]);

  // Get current search query
  const getCurrentSearchQuery = useCallback(() => {
    return selectedMealType === 'lunch' ? lunchSearchQuery : dinnerSearchQuery;
  }, [selectedMealType, lunchSearchQuery, dinnerSearchQuery]);

  // Get current status filter
  const getCurrentStatusFilter = useCallback(() => {
    return selectedMealType === 'lunch' ? lunchStatusFilter : dinnerStatusFilter;
  }, [selectedMealType, lunchStatusFilter, dinnerStatusFilter]);

  // Get current display count
  const getCurrentDisplayCount = useCallback(() => {
    return selectedMealType === 'lunch' ? lunchDisplayCount : dinnerDisplayCount;
  }, [selectedMealType, lunchDisplayCount, dinnerDisplayCount]);

  // Get current loading more state
  const getCurrentLoadingMore = useCallback(() => {
    return selectedMealType === 'lunch' ? lunchLoadingMore : dinnerLoadingMore;
  }, [selectedMealType, lunchLoadingMore, dinnerLoadingMore]);

  // Calendar functions
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    const newMonth = direction === 'prev' 
      ? currentMonth.clone().subtract(1, 'month') 
      : currentMonth.clone().add(1, 'month');
    setCurrentMonth(newMonth);
  }, [currentMonth]);

  const handleDaySelect = useCallback((day: number) => {
    const selected = currentMonth.clone().date(day).format('YYYY-MM-DD');
    setSelectedDate(selected);
    setCalendarVisible(false);
    setShowMonthSelector(false);
    setShowYearSelector(false);
  }, [currentMonth]);

  const handleMonthSelect = useCallback((monthIndex: number) => {
    const newMonth = currentMonth.clone().month(monthIndex);
    setCurrentMonth(newMonth);
    setShowMonthSelector(false);
  }, [currentMonth]);

  const handleYearSelect = useCallback((year: number) => {
    const newMonth = currentMonth.clone().year(year);
    setCurrentMonth(newMonth);
    setSelectedYear(year);
    setShowYearSelector(false);
  }, [currentMonth]);

  // Generate month days with consistent 6-week grid and better spacing
  const generateMonthDays = useCallback(() => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDay = startOfMonth.day();
    const totalDays = endOfMonth.date();
    
    const days = Array(42).fill(null); // Always 6 weeks for consistent grid
    
    for (let i = 0; i < totalDays; i++) {
      const date = i + 1;
      const dateStr = currentMonth.clone().date(date).format('YYYY-MM-DD');
      days[startDay + i] = {
        day: date,
        date: dateStr,
        id: dateStr
      };
    }
    
    return days;
  }, [currentMonth]);

  const monthDays = useMemo(() => generateMonthDays(), [generateMonthDays]);

  // Render meal type tabs with swipe indicator
  const renderMealTypeTabs = useCallback(() => {
    const availableMealTypes = getAvailableMealTypes();
    
    // If only one meal type is available, show a simple header
    if (!hasMultipleMealTypes && availableMealTypes.length === 1) {
      const mealType = availableMealTypes[0];
      return (
        <View style={styles.singleMealHeader}>
          <View style={[styles.mealIconContainer, { backgroundColor: `${mealType.color}15` }]}>
            <mealType.icon size={20} color={mealType.color} />
          </View>
          <Text weight='extraBold' style={styles.singleMealText}>
            {mealType.name} Responses
          </Text>
        </View>
      );
    }
    
    // Show tabs if multiple meal types are available
    const indicatorWidth = (width - 60) / availableMealTypes.length;
    
    return (
      <View style={styles.mealTypeTabWrapper}>
        <View style={styles.mealTypeTabContainer}>
          {/* Sliding indicator */}
         <Animated.View
  pointerEvents="none"
  style={[
    styles.mealTypeTabIndicator,
    {
      width: indicatorWidth,
      transform: [{ translateX: indicatorPosition }],
    },
  ]}
/>

          
          <View style={styles.mealTypeTabsInner}>
            {availableMealTypes.map((mealType, index) => {
              const IconComponent = mealType.icon;
              const isActive = index === activeIndex;
              
              // Interpolate text color based on scroll position
            const textColor = isActive ? "#15803d" : "#FFFFFF";


              return (
                <TouchableOpacity
                  key={mealType.id}
                  style={[
                    styles.mealTypeTabButton,
                    isActive && styles.activeMealTypeTabButton,
                  ]}
                  onPress={() => handleMealTypePress(mealType.id as 'lunch' | 'dinner')}
                  activeOpacity={0.7}
                >
                  <View style={styles.mealTypeContent}>
                    <IconComponent
                      size={18}
                      color={isActive ? "#15803d" : "#FFFFFF"}
                    />
                  <Text
  key={`${mealType.id}-${isActive}`}   // 👈 forces re-mount
  style={[
    styles.mealTypeTabText,
    {
      color: isActive ? '#15803d' : '#FFFFFF',
    },
  ]}
>
  {mealType.name}
</Text>

                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, [getAvailableMealTypes, hasMultipleMealTypes, activeIndex, width]);

  // Render response item with memoization
const renderResponseItem = useCallback(({ item }: { item: Response }) => {
  const expandedItems = item.mealType === 'lunch' ? lunchExpandedItems : dinnerExpandedItems;
  const isExpanded = expandedItems[item._id];
  const initial = item.customerId.name.charAt(0).toUpperCase();
  const currentTiming = timingInfo?.[item.mealType];
  
  // Check if date is in the past
  const isPast = isPastDate(selectedDate);
  
  // Disable if past date OR if timing says can't respond
  const canRespond = !isPast && (currentTiming?.canRespond ?? true);
  const pastDateReason = isPast ? "Cannot modify responses for past dates" : null;
  
  const toggleExpansion = () => {
    if (item.mealType === 'lunch') {
      setLunchExpandedItems(prev => ({
        ...prev,
        [item._id]: !prev[item._id]
      }));
    } else {
      setDinnerExpandedItems(prev => ({
        ...prev,
        [item._id]: !prev[item._id]
      }));
    }
  };
  
  return (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardHeader}
        onPress={toggleExpansion}
        activeOpacity={0.7}
      >
        <View style={styles.customerInfo}>
          <View style={[styles.avatar, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
            <Text weight='extraBold' style={[styles.avatarText, { color: STATUS_COLORS[item.status] }]}>
              {initial}
            </Text>
          </View>
          
          <View style={styles.customerDetails}>
            <View style={styles.nameRow}>
              <Text weight='bold' style={styles.customerName} numberOfLines={1}>
                {item.customerId.name}
              </Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: STATUS_COLORS[item.status] + '15' }
              ]}>
                <Text weight='bold' style={[
                  styles.statusBadgeText,
                  { color: STATUS_COLORS[item.status] }
                ]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>
            
            <View style={styles.infoRow}>
              <Text weight='bold' style={styles.customerPhone}>{item.customerId.phone}</Text>
              <View style={styles.mealTypeIndicator}>
                {item.mealType === 'lunch' ? (
                  <Sun size={12} color="#FF6B35" />
                ) : (
                  <Moon size={12} color="#4A90E2" />
                )}
                <Text weight='bold' style={styles.mealTypeText}>
                  {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                </Text>
              </View>
            </View>
            
            {item.customerId.tiffinRate && (
              <View style={styles.rateContainer}>
                <Text weight='bold' style={styles.rateText}>
                  ₹{item.customerId.tiffinRate}/meal
                </Text>
              </View>
            )}
          </View>
        </View>
        
        <ChevronRight 
          size={20} 
          color="#94A3B8" 
          style={[styles.expandIcon, isExpanded && styles.expandIconRotated]} 
        />
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.cardContent}>
          <View style={styles.responseDetails}>
            {/* Response Time and Source in one line */}
            <View style={styles.timeSourceRow}>
              <View style={styles.timeSourceItem}>
                <Text weight='bold' style={styles.timeSourceLabel}>Response Time:</Text>
                <Text weight='bold' style={styles.timeSourceValue}>
                  {item.responseReceivedAt 
                    ? moment(item.responseReceivedAt).format('h:mm A')
                    : 'Not responded'}
                </Text>
              </View>
              
              <View style={styles.timeSourceDivider} />
              
              <View style={styles.timeSourceItem}>
                <Text weight='bold' style={styles.timeSourceLabel}>Source:</Text>
                <View style={[
                  styles.sourceBadge,
                  { 
                    backgroundColor: item.source === 'manual' ? '#EFF6FF' : '#F0F9FF',
                    borderColor: item.source === 'manual' ? '#BFDBFE' : '#BAE6FD'
                  }
                ]}>
                  <Text weight='bold' style={[
                    styles.sourceText,
                    { color: item.source === 'manual' ? '#1D4ED8' : '#0C4A6E' }
                  ]}>
                    {item.source.charAt(0).toUpperCase() + item.source.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
            
            {item.isAutoDetected && (
              <View style={styles.autoDetectedRow}>
                <View style={styles.autoBadge}>
                  <Text weight='bold' style={styles.autoText}>Auto-detected</Text>
                </View>
              </View>
            )}
            
            {item.cutoffTimeUsed && (
              <View style={styles.cutoffRow}>
                <Text weight='bold' style={styles.cutoffLabel}>Cutoff:</Text>
                <Text weight='bold' style={styles.cutoffValue}>{item.cutoffTimeUsed}</Text>
              </View>
            )}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => updateResponse(item.customerId._id, 'yes')}
                disabled={!canRespond}
              >
                <Check size={16} color={!canRespond ? "#94A3B8" : "#10B981"} />
                <Text weight='bold' style={[
                  styles.actionButtonText,
                  !canRespond && styles.disabledButtonText
                ]}>
                  Confirm
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => updateResponse(item.customerId._id, 'no')}
                disabled={!canRespond}
              >
                <X size={16} color={!canRespond ? "#94A3B8" : "#EF4444"} />
                <Text weight='bold' style={[
                  styles.actionButtonText,
                  !canRespond && styles.disabledButtonText
                ]}>
                  Decline
                </Text>
              </TouchableOpacity>
            </View>
            
            {!canRespond && (
              <View style={styles.warningBox}>
                <Text weight='bold' style={styles.warningText}>
                  {pastDateReason || currentTiming?.reason || "Cannot modify this response"}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}, [lunchExpandedItems, dinnerExpandedItems, timingInfo, selectedDate]);

  // Render Load More button
  const renderLoadMoreButton = useCallback((mealType: 'lunch' | 'dinner') => {
    const { displayedResponses, totalFilteredCount, hasMore } = getDisplayedResponses(mealType);
    const isLoadingMore = mealType === 'lunch' ? lunchLoadingMore : dinnerLoadingMore;
    
    if (!hasMore || displayedResponses.length === 0) return null;
    
    const remainingCount = totalFilteredCount - displayedResponses.length;
    
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={() => handleLoadMore(mealType)}
        disabled={isLoadingMore}
      >
        {isLoadingMore ? (
          <ActivityIndicator size="small" color="#15803d" />
        ) : (
          <>
            <ChevronDown size={16} color="#15803d" />
            <Text weight='bold' style={styles.loadMoreText}>
              Load {Math.min(LOAD_MORE_COUNT, remainingCount)} more
            </Text>
            <Text weight='bold' style={styles.loadMoreCountText}>
              ({remainingCount} remaining)
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }, [getDisplayedResponses, lunchLoadingMore, dinnerLoadingMore, handleLoadMore]);

  // Skeleton loader for better UX
  const SkeletonLoader = useCallback(() => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonAvatar} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonLine1} />
            <View style={styles.skeletonLine2} />
            <View style={styles.skeletonLine3} />
          </View>
        </View>
      ))}
    </View>
  ), []);

  // Render filter menu
  const renderFilterMenu = useCallback(() => {
    if (!showFilterMenu) return null;
    
    return (
      <View style={styles.filterMenu}>
        <TouchableOpacity 
          style={styles.filterMenuItem}
          onPress={() => handleStatusFilter('all')}
        >
          <View style={[styles.filterDot, { backgroundColor: '#64748B' }]} />
          <Text weight='bold' style={styles.filterMenuText}>All Responses</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterMenuItem}
          onPress={() => handleStatusFilter('yes')}
        >
          <View style={[styles.filterDot, { backgroundColor: '#10B981' }]} />
          <Text weight='bold' style={styles.filterMenuText}>Confirmed</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterMenuItem}
          onPress={() => handleStatusFilter('no')}
        >
          <View style={[styles.filterDot, { backgroundColor: '#EF4444' }]} />
          <Text weight='bold' style={styles.filterMenuText}>Declined</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.filterMenuItem}
          onPress={() => handleStatusFilter('pending')}
        >
          <View style={[styles.filterDot, { backgroundColor: '#F59E0B' }]} />
          <Text weight='bold' style={styles.filterMenuText}>Pending</Text>
        </TouchableOpacity>
        
        <View style={styles.filterMenuDivider} />
        
        <TouchableOpacity 
          style={styles.filterMenuItem}
          onPress={clearFilters}
        >
          <Text weight='bold' style={styles.clearFilterMenuText}>Clear All Filters</Text>
        </TouchableOpacity>
      </View>
    );
  }, [showFilterMenu, handleStatusFilter, clearFilters]);

  // Render calendar modal
  const renderCalendarModal = useCallback(() => {
    if (!calendarVisible) return null;

    const today = moment().format('YYYY-MM-DD');
    const currentYear = moment().year();

    if (showYearSelector) {
      // Generate years for selector (10 years back, 10 years forward)
      const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);
      
      return (
        <Modal
          visible={calendarVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setCalendarVisible(false);
            setShowYearSelector(false);
          }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setCalendarVisible(false);
              setShowYearSelector(false);
            }}
          >
            <View style={styles.yearSelectorContainer}>
              <View style={styles.yearSelectorHeader}>
                <Text weight='extraBold' style={styles.yearSelectorTitle}>
                  Select Year
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowYearSelector(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={years}
                keyExtractor={(item) => item.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.yearList}
                renderItem={({ item }) => {
                  const isSelected = item === selectedYear;
                  const isCurrentYear = item === currentYear;
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.yearItem,
                        isSelected && styles.yearItemSelected,
                        isCurrentYear && !isSelected && styles.yearItemCurrent
                      ]}
                      onPress={() => handleYearSelect(item)}
                    >
                      <Text weight='extraBold' style={[
                        styles.yearText,
                        isSelected && styles.yearTextSelected,
                        isCurrentYear && !isSelected && styles.yearTextCurrent
                      ]}>
                        {item}
                      </Text>
                      {isCurrentYear && !isSelected && (
                        <View style={styles.currentYearIndicator}>
                          <Text weight='bold' style={styles.currentYearText}>Current</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      );
    }

    if (showMonthSelector) {
      return (
        <Modal
          visible={calendarVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setCalendarVisible(false);
            setShowMonthSelector(false);
          }}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setCalendarVisible(false);
              setShowMonthSelector(false);
            }}
          >
            <View style={styles.monthSelectorContainer}>
              <View style={styles.monthSelectorHeader}>
                <Text weight='extraBold' style={styles.monthSelectorTitle}>
                  Select Month
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowMonthSelector(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={MONTHS}
                keyExtractor={(item, index) => index.toString()}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.monthList}
                numColumns={3}
                renderItem={({ item, index }) => {
                  const isSelected = index === currentMonth.month();
                  const isCurrentMonth = index === moment().month() && currentMonth.year() === moment().year();
                  
                  return (
                    <TouchableOpacity
                      style={[
                        styles.monthItem,
                        isSelected && styles.monthItemSelected,
                        isCurrentMonth && !isSelected && styles.monthItemCurrent
                      ]}
                      onPress={() => handleMonthSelect(index)}
                    >
                      <Text weight='bold' style={[
                        styles.monthText,
                        isSelected && styles.monthTextSelected,
                        isCurrentMonth && !isSelected && styles.monthTextCurrent
                      ]}>
                        {item.substring(0, 3)}
                      </Text>
                      {isCurrentMonth && !isSelected && (
                        <View style={styles.currentMonthIndicator}>
                          <Text weight='bold' style={styles.currentMonthText}>Current</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      );
    }

    return (
      <Modal
        visible={calendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}
        >
          <View style={styles.calendarContainer}>
            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              <TouchableOpacity 
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('prev')}
              >
                <ChevronLeft size={24} color="#15803d" />
              </TouchableOpacity>
              
              <View style={styles.monthYearRow}>
                <TouchableOpacity 
                  style={styles.monthSelector}
                  onPress={() => setShowMonthSelector(true)}
                >
                  <Text weight='extraBold' style={styles.monthTextButton}>
                    {currentMonth.format('MMMM')}
                  </Text>
                  <ChevronRight 
                    size={16} 
                    color="#15803d" 
                    style={styles.monthSelectorIcon} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.yearSelector}
                  onPress={() => setShowYearSelector(true)}
                >
                  <Text weight='extraBold' style={styles.yearTextButton}>
                    {currentMonth.format('YYYY')}
                  </Text>
                  <ChevronRight 
                    size={16} 
                    color="#15803d" 
                    style={styles.yearSelectorIcon} 
                  />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.calendarNavButton}
                onPress={() => navigateMonth('next')}
              >
                <ChevronRight size={24} color="#15803d" />
              </TouchableOpacity>
            </View>
            
            {/* Days of Week */}
            <View style={styles.daysOfWeek}>
              {DAYS_OF_WEEK.map((day) => (
                <View key={day} style={styles.dayOfWeek}>
                  <Text weight='bold' style={styles.dayOfWeekText}>{day}</Text>
                </View>
              ))}
            </View>
            
            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {monthDays.map((item, index) => {
                if (item === null) {
                  return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                }
                
                const isSelected = item.date === selectedDate;
                const isToday = item.date === today;
                const isCurrentMonth = moment(item.date).month() === currentMonth.month();
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.calendarDay,
                      isToday && styles.calendarDayToday,
                      isSelected && styles.calendarDaySelected,
                      !isCurrentMonth && styles.calendarDayOtherMonth
                    ]}
                    onPress={() => handleDaySelect(item.day)}
                  >
                    <Text weight='bold' style={[
                      styles.calendarDayText,
                      !isCurrentMonth && styles.calendarDayTextOtherMonth,
                      isToday && styles.calendarDayTextToday,
                      isSelected && styles.calendarDayTextSelected
                    ]}>
                      {item.day}
                    </Text>
                    
                    {/* Dot indicator for responses */}
                    {item.date === selectedDate && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Action Buttons */}
            <View style={styles.calendarActions}>
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const todayDate = moment().format('YYYY-MM-DD');
                  setSelectedDate(todayDate);
                  setCurrentMonth(moment());
                  setCalendarVisible(false);
                }}
              >
                <Text weight='extraBold' style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.closeCalendarButton}
                onPress={() => setCalendarVisible(false)}
              >
                <Text weight='extraBold' style={styles.closeCalendarButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }, [
    calendarVisible, showYearSelector, showMonthSelector, currentMonth, monthDays, 
    selectedDate, selectedYear, navigateMonth, handleDaySelect, handleMonthSelect, 
    handleYearSelect
  ]);

  // Render empty state for each meal type
  const renderEmptyState = useCallback((mealType: 'lunch' | 'dinner') => {
    const statusFilter = mealType === 'lunch' ? lunchStatusFilter : dinnerStatusFilter;
    const filteredResponses = getFilteredResponses(mealType);
    
    if (filteredResponses.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <FileText size={48} color="#CBD5E1" />
          </View>
          <Text weight='extraBold' style={styles.emptyTitle}>
            No Responses Found
          </Text>
          <Text weight='bold' style={styles.emptySubtitle}>
            {statusFilter !== 'all' 
              ? `No ${STATUS_LABELS[statusFilter].toLowerCase()} ${mealType} responses for ${moment(selectedDate).format('MMM D, YYYY')}`
              : `No ${mealType} responses for ${moment(selectedDate).format('MMM D, YYYY')}`
            }
          </Text>
        </View>
      );
    }
    return null;
  }, [lunchStatusFilter, dinnerStatusFilter, getFilteredResponses, selectedDate]);

  // Get current filtered responses count for stats
  const getFilteredResponsesCount = useCallback((mealType: 'lunch' | 'dinner') => {
    const filteredResponses = getFilteredResponses(mealType);
    return {
      yes: filteredResponses.filter(r => r.status === 'yes').length,
      no: filteredResponses.filter(r => r.status === 'no').length,
      pending: filteredResponses.filter(r => r.status === 'pending').length,
      total: filteredResponses.length
    };
  }, [getFilteredResponses]);

  // Render stats for current meal type
  const renderStats = useCallback(() => {
    const stats = getFilteredResponsesCount(selectedMealType);
    
    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#fff' }]}>
          <Text weight='extraBold' style={[styles.statValue, { color: '#15803d' }]}>
            {stats.yes}
          </Text>
          <Text weight='bold' style={[styles.statLabel, { color: '#15803d' }]}>Confirmed</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#fff' }]}>
          <Text weight='extraBold' style={[styles.statValue, { color: '#15803d' }]}>
            {stats.no}
          </Text>
          <Text weight='bold' style={[styles.statLabel, { color: '#15803d' }]}>Declined</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#fff' }]}>
          <Text weight='extraBold' style={[styles.statValue, { color: '#15803d' }]}>
            {stats.pending}
          </Text>
          <Text weight='bold' style={[styles.statLabel, { color: '#15803d' }]}>Pending</Text>
        </View>
      </View>
    );
  }, [selectedMealType, getFilteredResponsesCount]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Show loading while preferences are loading
  if (prefsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text weight='extraBold' style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text weight='extraBold' style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchAllResponses(true)}
        >
          <Text weight='extraBold' style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentStatusFilter = getCurrentStatusFilter();
  const currentSearchQuery = getCurrentSearchQuery();
  const { displayedResponses, totalFilteredCount, hasMore, filteredResponses } = getDisplayedResponses(selectedMealType);
  const currentLoadingMore = getCurrentLoadingMore();

  return (
    <View style={[styles.container]}>
      {/* Date Selector */}
   {/* Date Selector */}
<View style={styles.dateSelector}>
  <TouchableOpacity 
    style={styles.dateNavButton}
    onPress={() => handleDateArrowClick('left')}
  >
    <ChevronLeft size={20} color="#15803d" />
  </TouchableOpacity>
  
  <TouchableOpacity 
    style={styles.dateDisplay}
    onPress={() => setCalendarVisible(true)}
  >
    <Calendar size={18} color="#15803d" />
    <Text weight='extraBold' style={styles.dateText}>
      {moment(selectedDate).format('MMM D, YYYY')}
    </Text>
    
    {/* Add indicator for past dates */}
    {isPastDate(selectedDate) && (
      <View style={styles.pastDateIndicator}>
        <Text weight='bold' style={styles.pastDateText}>Past Date</Text>
      </View>
    )}
  </TouchableOpacity>
  
  <TouchableOpacity 
    style={styles.dateNavButton}
    onPress={() => handleDateArrowClick('right')}
  >
    <ChevronRight size={20} color="#15803d" />
  </TouchableOpacity>
</View>

      {/* Meal Type Tabs with swipe indicator */}
      {renderMealTypeTabs()}
      
      {/* Stats Cards */}
      {renderStats()}

      {/* Search and Filter Bar */}
      <View style={styles.searchFilterBar}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={currentSearchQuery}
            onChangeText={handleSearchQueryChange}
            placeholderTextColor="#94A3B8"
          />
        </View>
        
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Filter size={18} color="#64748B" />
          </TouchableOpacity>
          
          {renderFilterMenu()}
        </View>
      </View>

      {/* Small Filter Badge */}
      {currentStatusFilter !== 'all' && (
        <View style={styles.filterBadgeContainer}>
          <View style={[
            styles.filterBadge,
            { backgroundColor: STATUS_COLORS[currentStatusFilter] + '15' }
          ]}>
            <View style={[
              styles.filterBadgeDot,
              { backgroundColor: STATUS_COLORS[currentStatusFilter] }
            ]} />
            <Text weight='bold' style={[
              styles.filterBadgeText,
              { color: STATUS_COLORS[currentStatusFilter] }
            ]}>
              {STATUS_LABELS[currentStatusFilter]}
            </Text>
            <TouchableOpacity 
              style={styles.filterBadgeClose}
              onPress={clearFilters}
            >
              <X size={12} color={STATUS_COLORS[currentStatusFilter]} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Show count info */}
      <View style={styles.countInfoBar}>
        <Text weight='bold' style={styles.countInfoText}>
          Showing {displayedResponses.length} of {totalFilteredCount} responses
          {totalFilteredCount > displayedResponses.length && ` (${totalFilteredCount - displayedResponses.length} more available)`}
        </Text>
      </View>
      
      {/* Show skeleton loader only when initial loading */}
      {loading && lunchResponses.length === 0 && dinnerResponses.length === 0 ? (
        <SkeletonLoader />
      ) : (
        /* Swipeable Content Area */
        <Animated.FlatList
          ref={scrollViewRef}
          data={getAvailableMealTypes()}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          style={styles.scrollView}
          renderItem={({ item: mealType, index }) => {
            const { displayedResponses: mealDisplayedResponses } = getDisplayedResponses(mealType.id as 'lunch' | 'dinner');
            
            return (
              <View style={[styles.contentPage, { width }]}>
                <FlatList
                  data={mealDisplayedResponses}
                  renderItem={renderResponseItem}
                  keyExtractor={(item) => `${item._id}-${item.mealType}`}
                  contentContainerStyle={styles.listContent}
                  refreshControl={
                    <RefreshControl 
                      refreshing={refreshing} 
                      onRefresh={onRefresh} 
                    />
                  }
                  ListEmptyComponent={renderEmptyState(mealType.id as 'lunch' | 'dinner')}
                  ListFooterComponent={() => renderLoadMoreButton(mealType.id as 'lunch' | 'dinner')}
                  initialNumToRender={INITIAL_LOAD_COUNT}
                  maxToRenderPerBatch={LOAD_MORE_COUNT}
                  windowSize={5}
                  removeClippedSubviews={true}
                  // Optional: Add scroll to load more on end reached
                  onEndReachedThreshold={0.5}
                  onEndReached={() => {
                    const { hasMore: mealHasMore } = getDisplayedResponses(mealType.id as 'lunch' | 'dinner');
                    if (mealHasMore && !currentLoadingMore) {
                      handleLoadMore(mealType.id as 'lunch' | 'dinner');
                    }
                  }}
                />
              </View>
            );
          }}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="center"
        />
      )}
      
      {/* Bottom Navigation and FAB */}
      <View style={styles.bottomBar}>
        {filteredResponses.filter(r => r.status === 'pending').length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              Alert.alert('Info', 'Auto-confirm pending responses feature');
            }}
          >
            <Check size={24} color="#fff" />
            <Text weight='bold' style={styles.fabText}>Auto Confirm All Pending</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Calendar Modal */}
      {renderCalendarModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80
  },
  contentPage: {
    width: Dimensions.get('window').width,
    flex: 1,
  },
  // Meal Type Tabs with swipe indicator
  mealTypeTabWrapper: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mealTypeTabContainer: {
    position: 'relative',
    backgroundColor: '#15803d',
    borderRadius: 25,
    padding: 4,
    height: 50,
    overflow: 'hidden',
  },
  mealTypeTabsInner: {
    flexDirection: 'row',
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  mealTypeTabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mealTypeTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 21,
    position: 'relative',
    zIndex: 2,
  },
  activeMealTypeTabButton: {
    backgroundColor: 'transparent',
  },
  mealTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    zIndex: 5,
    elevation: 5,
  },
  mealTypeTabText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 2,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1fff0ff',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f1fff0ff',
    borderWidth: 1,
    borderColor: '#15803d',
  },
  dateText: {
    fontSize: 16,
    color: '#15803d',
  },
  singleMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  mealIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleMealText: {
    fontSize: 18,
    color: '#1E293B',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#15803d',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  searchFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
  },
  filterContainer: {
    position: 'relative',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterMenuText: {
    fontSize: 14,
    color: '#1E293B',
  },
  filterMenuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  clearFilterMenuText: {
    fontSize: 14,
    color: '#EF4444',
  },
  filterBadgeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  filterBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterBadgeText: {
    fontSize: 12,
  },
  filterBadgeClose: {
    marginLeft: 2,
    padding: 2,
  },
  countInfoBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  countInfoText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
  },
  customerDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusBadgeText: {
    fontSize: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748B',
  },
  mealTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealTypeText: {
    fontSize: 12,
    color: '#64748B',
  },
  rateContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  rateText: {
    fontSize: 10,
    color: '#16A34A',
  },
  expandIcon: {
    transform: [{ rotate: '90deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '270deg' }],
  },
  cardContent: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  responseDetails: {
    padding: 16,
  },
  timeSourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  timeSourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSourceLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  timeSourceValue: {
    fontSize: 14,
    color: '#1E293B',
  },
  timeSourceDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  sourceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  sourceText: {
    fontSize: 12,
  },
  autoDetectedRow: {
    marginBottom: 12,
  },
  autoBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignSelf: 'flex-start',
  },
  autoText: {
    fontSize: 10,
    color: '#92400E',
  },
  cutoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  cutoffLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  cutoffValue: {
    fontSize: 11,
    color: '#1E293B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  confirmButton: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  declineButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButtonText: {
    fontSize: 12,
  },
  disabledButtonText: {
    color: '#94A3B8',
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  warningText: {
    fontSize: 11,
    color: '#991B1B',
  },
  // Load More Button
  loadMoreButton: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#15803d',
  },
  loadMoreCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 18,
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: '80%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  // Skeleton loader styles
  skeletonContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonLine1: {
    height: 16,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '60%',
    marginBottom: 8,
  },
  skeletonLine2: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '40%',
    marginBottom: 8,
  },
  skeletonLine3: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    width: '30%',
  },
  // Calendar Modal Styles - UPDATED FOR BETTER SPACING
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: height * 0.8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  monthYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    gap: 4,
    minWidth: 120,
    justifyContent: 'center',
  },
  monthTextButton: {
    fontSize: 16,
    color: '#15803d',
    fontWeight: '600',
  },
  monthSelectorIcon: {
    transform: [{ rotate: '90deg' }],
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    gap: 4,
    minWidth: 80,
    justifyContent: 'center',
  },
  yearTextButton: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '600',
  },
  yearSelectorIcon: {
    transform: [{ rotate: '90deg' }],
  },
  daysOfWeek: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dayOfWeek: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOfWeekText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayEmpty: {
    width: '14.2857%', // 100% / 7 days
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6, // Add padding for spacing
  },
  calendarDay: {
    width: '14.2857%', // 100% / 7 days
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  calendarDayToday: {
    backgroundColor: '#15803d15',
    borderRadius: 8,
  },
  calendarDaySelected: {
    backgroundColor: '#15803d',
    borderRadius: 8,
  },
  calendarDayOtherMonth: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    textAlign: 'center',
    width: 32,
    height: 32,
    lineHeight: 32,
    borderRadius: 16
  },
  calendarDayTextToday: {
    color: '#15803d',
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarDayTextOtherMonth: {
    color: '#CBD5E1',
  },
  selectedIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#15803d',
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  todayButton: {
    flex: 1,
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeCalendarButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeCalendarButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  // Year Selector Modal
  yearSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '80%',
    maxWidth: 300,
    maxHeight: height * 0.6,
    padding: 20,
  },
  yearSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  yearSelectorTitle: {
    fontSize: 18,
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  yearList: {
    paddingVertical: 8,
  },
  yearItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  yearItemSelected: {
    backgroundColor: '#15803d',
  },
  yearItemCurrent: {
    backgroundColor: '#F0FDF4',
  },
  yearText: {
    fontSize: 16,
    color: '#1E293B',
  },
  yearTextSelected: {
    color: '#fff',
  },
  yearTextCurrent: {
    color: '#15803d',
  },
  currentYearIndicator: {
    backgroundColor: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  currentYearText: {
    fontSize: 10,
    color: '#fff',
  },
  // Month Selector Modal Styles
  monthSelectorContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '80%',
    maxWidth: 300,
    maxHeight: height * 0.6,
    padding: 20,
  },
  monthSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  monthSelectorTitle: {
    fontSize: 18,
    color: '#1E293B',
  },
  monthList: {
    paddingVertical: 8,
  },
  monthItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    margin: 4,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthItemSelected: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  monthItemCurrent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#15803d',
  },
  monthText: {
    fontSize: 14,
    color: '#1E293B',
  },
  monthTextSelected: {
    color: '#fff',
  },
  monthTextCurrent: {
    color: '#15803d',
  },
  currentMonthIndicator: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#15803d',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentMonthText: {
    fontSize: 8,
    color: '#fff',
  },
  pastDateIndicator: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pastDateText: {
    fontSize: 10,
    color: '#DC2626',
  },
});

export default ResponseScreen;