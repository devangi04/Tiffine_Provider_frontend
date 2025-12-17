import React, { useState, useEffect } from 'react';
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
import {Text,TextStyles} from '@/components/ztext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check, X, Clock, Calendar, User, FileText, Search, ChevronRight, Sun, Moon } from 'lucide-react-native';
import axios from 'axios';
import { useNavigation } from 'expo-router';
import moment from 'moment';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavBar from '@/components/navbar';
import Header from '@/components/header';
import { useAppSelector } from './store/hooks';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from './config/env';

const { width } = Dimensions.get('window');
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
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#DA291C' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#DA291C' }
];

const ResponseScreen = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();
  
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('Response');
  const navbarOpacity = new Animated.Value(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [timingInfo, setTimingInfo] = useState<MealTimingInfo | null>(null);
  const navigation = useNavigation();
  
  // Calendar modal state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment());

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'yes' | 'no' | 'pending'>('all');

  // Add state for meal preferences
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

  // Fetch meal preferences
  const fetchMealPreferences = async () => {
    try {
      setPrefsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/Provider/preferences`, {
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
          } else if (dinnerEnabled) {
            setSelectedMealType('dinner');
          }
        }
      } else {
        // Default to showing both if API fails
        setHasMultipleMealTypes(true);
        setMealPrefs({
          lunch: { enabled: true },
          dinner: { enabled: true }
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Default to showing both if API fails
      setHasMultipleMealTypes(true);
      setMealPrefs({
        lunch: { enabled: true },
        dinner: { enabled: true }
      });
    } finally {
      setPrefsLoading(false);
      // Load other data after preferences are loaded
      fetchResponses();
      fetchTimingInfo();
    }
  };

  // Get available meal types based on preferences
  const getAvailableMealTypes = () => {
    if (!mealPrefs) {
      return MEAL_TYPES; // Return all while loading
    }
    
    const availableTypes = [];
    
    if (mealPrefs.lunch?.enabled === true) {
      availableTypes.push({ id: 'lunch', name: 'Lunch', icon: Sun, color: '#DA291C' });
    }
    
    if (mealPrefs.dinner?.enabled === true) {
      availableTypes.push({ id: 'dinner', name: 'Dinner', icon: Moon, color: '#DA291C' });
    }
    
    // If no preferences or both disabled, return all
    if (availableTypes.length === 0) {
      return MEAL_TYPES;
    }
    
    return availableTypes;
  };

  useEffect(() => {
    if (!providerId || prefsLoading) return;
    
    fetchResponses();
    fetchTimingInfo();
  }, [selectedDate, selectedMealType, providerId, prefsLoading]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/responses/daily`, {
        params: {
          providerId,
          date: selectedDate,
          mealType: selectedMealType
        }
      });

      if (response.data.success) {
        setResponses(response.data.data.responses || []);
      } else {
        setError('Failed to fetch responses');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTimingInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/responses/timing`, {
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

  const handleDateChange = (days: number) => {
    const newDate = moment(selectedDate).add(days, 'days').format('YYYY-MM-DD');
    setSelectedDate(newDate);
    setCurrentPage(1);
    setStatusFilter('all');
  };

  const updateResponse = async (customerId: string, newStatus: 'yes' | 'no') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/response`, {
        customerId,
        menuDate: selectedDate,
        mealType: selectedMealType,
        status: newStatus,
        source: 'manual'
      });
      
      if (response.data.success) {
        setResponses(prev => prev.map(res => 
          res.customerId._id === customerId && res.mealType === selectedMealType
            ? { 
                ...res, 
                status: newStatus, 
                responseReceivedAt: new Date().toISOString(),
                source: 'manual',
                isAutoDetected: false
              } 
            : res
        ));
        
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

  const navigateToBill = (customerId: string) => {
    router.push({
      pathname: '/profile',
      params: { 
        customerId,
        month: moment(selectedDate).month() + 1,
        year: moment(selectedDate).year()
      }
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchResponses();
    fetchTimingInfo();
    setStatusFilter('all');
  };

  const processAutoResponses = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/responses/auto-process`, {
        providerId,
        date: selectedDate,
        mealType: selectedMealType
      });
      
      if (response.data.success) {
        fetchResponses();
        Alert.alert('Success', response.data.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to process auto responses');
    }
  };

  const toggleItemExpansion = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filter responses based on search query, status filter, and meal type
  const filteredResponses = responses.filter(response => {
    const matchesSearch = 
      response.customerId.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      response.customerId.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
    const matchesMealType = response.mealType === selectedMealType;
    
    return matchesSearch && matchesStatus && matchesMealType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredResponses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredResponses.length);
  const paginatedResponses = filteredResponses.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Handle status filter change
  const handleStatusFilter = (status: 'all' | 'yes' | 'no' | 'pending') => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Calendar functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => 
      direction === 'prev' 
        ? prev.clone().subtract(1, 'month') 
        : prev.clone().add(1, 'month')
    );
  };

  const generateMonthDays = () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDay = startOfMonth.day();
    
    const days = [];
    
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= endOfMonth.date(); i++) {
      days.push(i);
    }
    
    return days;
  };

  const handleDaySelect = (day: number) => {
    const selected = currentMonth.clone().date(day).format('YYYY-MM-DD');
    setSelectedDate(selected);
    setCalendarVisible(false);
  };

  // Render meal type selector based on preferences
  const renderMealTypeSelector = () => {
    const availableMealTypes = getAvailableMealTypes();
    const currentTiming = getCurrentTimingInfo();
    
    // If only one meal type is available, show a simple header
    if (!hasMultipleMealTypes && availableMealTypes.length === 1) {
      const mealType = availableMealTypes[0];
      return (
        <View style={styles.singleMealHeader}>
          <mealType.icon size={24} color={mealType.color} />
          <Text weight='extraBold' style={styles.singleMealText}>
            {mealType.name} Responses
          </Text>
        </View>
      );
    }
    
    // Show tabs if multiple meal types are available
    return (
      <View style={styles.mealTypeContainer}>
        {availableMealTypes.map((mealType) => {
          const isActive = mealType.id === selectedMealType;
          const mealTiming = timingInfo?.[mealType.id as 'lunch' | 'dinner'];
          const isEnabled = mealTiming !== undefined;
          
          return (
            <TouchableOpacity
              key={mealType.id}
              style={[
                styles.mealTypeButton,
                isActive && styles.mealTypeButtonActive,
                isActive && { borderColor: mealType.color },
                !isEnabled && styles.mealTypeButtonDisabled
              ]}
              onPress={() => setSelectedMealType(mealType.id as 'lunch' | 'dinner')}
              disabled={!isEnabled}
            >
              <mealType.icon 
                size={16} 
                color={isActive ? mealType.color : (!isEnabled ? '#94A3B8' : '#64748B')} 
              />
              <Text  weight='bold'style={[
                styles.mealTypeText,
                isActive && [styles.mealTypeTextActive, { color: mealType.color }],
                !isEnabled && styles.mealTypeTextDisabled
              ]}>
                {mealType.name}
                {mealTiming?.cutoffTime && ` (${mealTiming.cutoffTime})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderCalendarModal = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthDays = generateMonthDays();
    const today = moment().format('YYYY-MM-DD');
    
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
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => navigateMonth('prev')}>
                <ChevronLeft size={24} color="#2c95f8" />
              </TouchableOpacity>
              
              <Text weight='extraBold' style={styles.calendarTitle}>
                {currentMonth.format('MMMM YYYY')}
              </Text>
              
              <TouchableOpacity onPress={() => navigateMonth('next')}>
                <ChevronRight size={24} color="#2c95f8" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.daysOfWeek}>
              {daysOfWeek.map(day => (
                <Text  weight='extraBold' key={day} style={styles.dayOfWeekText}>
                  {day}
                </Text>
              ))}
            </View>
            
            <View style={styles.calendarGrid}>
              {monthDays.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.calendarDayEmpty} />;
                }
                
                const dateStr = currentMonth.clone().date(day).format('YYYY-MM-DD');
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === today;
                
                return (
                  <TouchableOpacity
                    key={`day-${day}`}
                    style={[
                      styles.calendarDay,
                      isToday && styles.calendarDayToday,
                      isSelected && styles.calendarDaySelected
                    ]}
                    onPress={() => handleDaySelect(day)}
                  >
                    <Text weight='extraBold' style={[
                      styles.calendarDayText,
                      isToday && styles.calendarDayTextToday,
                      isSelected && styles.calendarDayTextSelected
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                setSelectedDate(today);
                setCurrentMonth(moment());
                setCalendarVisible(false);
              }}
            >
              <Text weight='extraBold' style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderResponseItem = ({ item }: { item: Response }) => {
    const isExpanded = expandedItems[item._id];
    const initial = item.customerId.name.charAt(0).toUpperCase();
    const currentTiming = getCurrentTimingInfo();
    const canRespond = currentTiming?.canRespond ?? true;
    
    return (
      <TouchableOpacity 
        style={styles.responseItem}
        onPress={() => toggleItemExpansion(item._id)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.customerInitial}>
            <Text weight='extraBold' style={styles.initialText}>{initial}</Text>
          </View>
          
          <View style={styles.customerData}>
            <View style={styles.customerInfoRow}>
              <Text weight='bold' style={styles.customerName} numberOfLines={1}>
                {item.customerId.name}
              </Text>
              <View style={[
                styles.mealTypeBadge,
                { backgroundColor: `${MEAL_TYPES.find(m => m.id === item.mealType)?.color}15` }
              ]}>
                <Text weight='bold' style={[
                  styles.mealTypeBadgeText,
                  { color: MEAL_TYPES.find(m => m.id === item.mealType)?.color }
                ]}>
                  {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                </Text>
              </View>
            </View>
            <Text  weight='bold' style={styles.customerPhone}>{item.customerId.phone}</Text>
            {item.customerId.tiffinRate && (
              <Text style={styles.tiffinRate}>₹{item.customerId.tiffinRate}/meal</Text>
            )}
          </View>
          
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              item.status === 'yes' && styles.statusDotYes,
              item.status === 'no' && styles.statusDotNo,
              item.status === 'pending' && styles.statusDotPending
            ]} />
            <ChevronLeft 
              size={16} 
              color="#666" 
              style={[styles.expandIcon, isExpanded && styles.expandIconRotated]} 
            />
          </View>
        </View>
        
        {isExpanded && (
          <View style={styles.itemDetails}>
            <View style={styles.detailsContent}>
              <View style={styles.responseMeta}>
                <View style={styles.metaColumn}>
                  {item.responseReceivedAt ? (
                    <View style={styles.responseTime}>
                      <Clock size={12} color="#666" />
                      <Text weight='extraBold' style={styles.timeText}>
                        {moment(item.responseReceivedAt).format('h:mm A')}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.noResponseText}>No response yet</Text>
                  )}
                  
                  {item.isAutoDetected && (
                    <View style={styles.autoDetectedBadge}>
                      <Text weight='extraBold' style={styles.autoDetectedText}>Auto-detected</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.metaColumn}>
                  <View style={styles.responseSource}>
                    <Text weight='extraBold' style={styles.sourceText}>{item.source}</Text>
                  </View>
                  {item.cutoffTimeUsed && (
                    <Text weight='extraBold' style={styles.cutoffTimeText}>
                      Cutoff: {item.cutoffTimeUsed}
                    </Text>
                  )}
                  {item.respondedBeforeCutoff !== undefined && (
                    <Text weight='extraBold' style={[
                      styles.cutoffText,
                      item.respondedBeforeCutoff ? styles.cutoffSuccess : styles.cutoffLate
                    ]}>
                      {item.respondedBeforeCutoff ? 'Before cutoff' : 'After cutoff'}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => updateResponse(item.customerId._id, 'yes')}
                  disabled={!canRespond}
                >
                  <Check size={14} color={!canRespond ? "#ccc" : "#00a86b"} />
                  <Text weight='extraBold' style={[
                    styles.actionButtonText, 
                    styles.confirmButtonText,
                    !canRespond && styles.disabledButtonText
                  ]}>Confirm</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => updateResponse(item.customerId._id, 'no')}
                  disabled={!canRespond}
                >
                  <X size={14} color={!canRespond ? "#ccc" : "#ff4757"} />
                  <Text weight='extraBold' style={[
                    styles.actionButtonText, 
                    styles.declineButtonText,
                    !canRespond && styles.disabledButtonText
                  ]}>Decline</Text>
                </TouchableOpacity>
              </View>

              {!canRespond && currentTiming?.reason && (
                <Text weight='extraBold' style={styles.cutoffMessage}>
                  {currentTiming.reason}
                </Text>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleNavigation = (screenName: string) => {
    setActiveNav(screenName);
  };

  const currentTimingInfo = getCurrentTimingInfo();

  // Show loading while preferences are loading
  if (prefsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text weight='extraBold' style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  if (loading && responses.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text weight='extraBold' style={styles.loadingText}>Loading responses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text weight='extraBold' style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchResponses}
        >
          <Text weight='extraBold' style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Selector */}
      <View style={styles.dateNav}>
        <View style={styles.dateNavContainer}>
          <TouchableOpacity 
            style={styles.navArrow} 
            onPress={() => handleDateChange(-1)}
          >
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.currentDate}
            onPress={() => setCalendarVisible(true)}
          >
            <Calendar size={18} color="#333" />
            <Text weight='extraBold' style={styles.dateText}>
              {moment(selectedDate).format('MMM D, YYYY')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.navArrow} 
            onPress={() => handleDateChange(1)}
          >
            <ChevronLeft size={20} color="#fff" style={styles.rightArrow} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Meal Type Selector - Shows tabs only if multiple meal types are enabled */}
      {renderMealTypeSelector()}
      
      {/* Timing Info Banner */}
      {/* {currentTimingInfo && (
        <View style={[
          styles.timingBanner,
          currentTimingInfo.canRespond ? styles.timingBannerActive : styles.timingBannerInactive
        ]}>
          <Clock size={16} color={currentTimingInfo.canRespond ? "#00a86b" : "#ff4757"} />
          <Text style={styles.timingText}>
            {currentTimingInfo.canRespond 
              ? `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} responses accepted until ${currentTimingInfo.cutoffTime}` 
              : currentTimingInfo.reason || 'Response period closed'
            }
          </Text>
        </View>
      )} */}
      
      {/* Calendar Modal */}
      {renderCalendarModal()}
      
      {/* Stats Summary with Filter Functionality */}
      <View style={styles.statsSummary}>
        <View style={styles.statsGrid}>
          <TouchableOpacity 
            style={[
              styles.statCard, 
              styles.confirmedCard,
              statusFilter === 'yes' && styles.statCardActive
            ]}
            onPress={() => handleStatusFilter('yes')}
          >
            <Text weight='extraBold' style={styles.statValue}>
              {responses.filter(r => r.status === 'yes' && r.mealType === selectedMealType).length}
            </Text>
            <Text weight='extraBold' style={styles.statLabel}>Confirmed</Text>
            {statusFilter === 'yes' && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.statCard, 
              styles.declinedCard,
              statusFilter === 'no' && styles.statCardActive
            ]}
            onPress={() => handleStatusFilter('no')}
          >
            <Text weight='extraBold' style={styles.statValue}>
              {responses.filter(r => r.status === 'no' && r.mealType === selectedMealType).length}
            </Text>
            <Text weight='extraBold' style={styles.statLabel}>Declined</Text>
            {statusFilter === 'no' && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.statCard, 
              styles.pendingCard,
              statusFilter === 'pending' && styles.statCardActive
            ]}
            onPress={() => handleStatusFilter('pending')}
          >
            <Text weight='extraBold' style={styles.statValue}>
              {responses.filter(r => r.status === 'pending' && r.mealType === selectedMealType).length}
            </Text>
            <Text weight='extraBold' style={styles.statLabel}>Pending</Text>
            {statusFilter === 'pending' && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        </View>

        {/* Filter Status Indicator */}
        {statusFilter !== 'all' && (
          <View style={styles.filterStatusContainer}>
            <Text weight='extraBold' style={styles.filterStatusText}>
              Showing: {statusFilter === 'yes' ? 'Confirmed' : statusFilter === 'no' ? 'Declined' : 'Pending'} {selectedMealType} responses
            </Text>
            <TouchableOpacity onPress={clearFilters} style={styles.clearFilterButton}>
              <Text weight='extraBold' style={styles.clearFilterText}>Clear filter</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Top Bar with Search and Pagination */}
      <View style={styles.topBarContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={styles.paginationButton}
              onPress={goToPrevPage}
              disabled={currentPage === 1}
            >
              <Icon
                name="chevron-left"
                size={20}
                color={currentPage === 1 ? "#94a3b8" : "#3b82f6"}
              />
            </TouchableOpacity>

            <Text weight='extraBold' style={styles.paginationInfo}>
              {currentPage} / {totalPages}
            </Text>

            <TouchableOpacity
              style={styles.paginationButton}
              onPress={goToNextPage}
              disabled={currentPage === totalPages}
            >
              <Icon
                name="chevron-right"
                size={20}
                color={currentPage === totalPages ? "#94a3b8" : "#3b82f6"}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Responses List */}
      <FlatList
        data={paginatedResponses}
        renderItem={renderResponseItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text weight='extraBold' style={styles.emptyText}>
              {statusFilter !== 'all' 
                ? `No ${statusFilter === 'yes' ? 'confirmed' : statusFilter === 'no' ? 'declined' : 'pending'} ${selectedMealType} responses found` 
                : `No ${selectedMealType} responses found for this date`}
            </Text>
            {statusFilter !== 'all' && (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFilterButton}>
                <Text weight='extraBold' style={styles.clearFilterText}>Clear filter</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
      
      {/* Process Auto Responses Button */}
      {responses.filter(r => r.status === 'pending' && r.mealType === selectedMealType).length > 0 && (
        <TouchableOpacity
          style={styles.processFab}
          onPress={processAutoResponses}
        >
          <Check size={24} color="#fff" />
          <Text weight='extraBold' style={styles.fabText}>Auto YES</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Meal Type Selector Styles
    singleMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  singleMealText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  mealTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mealTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  mealTypeButtonActive: {
    shadowColor: '#004C99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ translateY: -1 }],
  },
  mealTypeButtonDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  mealTypeTextActive: {
    fontWeight: '700',
  },
  mealTypeTextDisabled: {
    color: '#94A3B8',
  },
  
  // Meal Type Badge in Response Items
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  mealTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  mealTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Additional styles that might be needed
  cutoffTimeText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  cutoffMessage: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Rest of your existing styles...
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  timingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    gap: 8,
  },
  timingBannerActive: {
    backgroundColor: 'rgba(0, 168, 107, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#00a86b',
  },
  timingBannerInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  timingText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  dateNav: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  dateNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  navArrow: {
    width: 40,
    height: 40,
    backgroundColor: '#004C99',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightArrow: {
    transform: [{ rotate: '180deg' }],
  },
  currentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statsSummary: {
    paddingHorizontal: 24,
    marginTop: 2,
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 3,
    position: 'relative',
  },
  statCardActive: {
    transform: [{ scale: 1.05 }],
    shadowColor: '#3a0202e2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  confirmedCard: {
    borderTopColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  declinedCard: {
    borderTopColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  pendingCard: {
    borderTopColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  filterStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 10,
  },
  filterStatusText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  clearFilterButton: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  clearFilterText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  topBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 45,
    flex: 1,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paginationButton: {
    paddingHorizontal: 6,
  },
  paginationInfo: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
    marginHorizontal: 6,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  responseItem: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e4e6eb',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  customerInitial: {
    width: 42,
    height: 42,
    backgroundColor: '#004C99',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialText: {
    fontWeight: '600',
    fontSize: 16,
    color: 'white',
  },
  customerData: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
    color: '#333',
  },
  customerPhone: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tiffinRate: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotYes: {
    backgroundColor: '#00a86b',
    shadowColor: '#00a86b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDotNo: {
    backgroundColor: '#ff4757',
    shadowColor: '#ff4757',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDotPending: {
    backgroundColor: '#ffa502',
    shadowColor: '#ffa502',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  expandIcon: {
    transform: [{ rotate: '90deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '270deg' }],
  },
  itemDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e4e6eb',
  },
  detailsContent: {
    padding: 16,
  },
  responseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  metaColumn: {
    gap: 6,
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  noResponseText: {
    fontSize: 12,
    color: '#666',
  },
  autoDetectedBadge: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  autoDetectedText: {
    fontSize: 10,
    color: '#666',
  },
  responseSource: {
    backgroundColor: '#f0f2f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  sourceText: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
  },
  cutoffText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cutoffSuccess: {
    color: '#00a86b',
  },
  cutoffLate: {
    color: '#ff4757',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    gap: 6,
  },
  confirmButton: {
    backgroundColor: 'rgba(0, 168, 107, 0.1)',
    borderColor: '#00a86b',
  },
  declineButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: '#ff4757',
  },
  billButton: {
    backgroundColor: 'rgba(44, 149, 248, 0.1)',
    borderColor: '#2c95f8',
    flex: 0.8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#00a86b',
  },
  declineButtonText: {
    color: '#ff4757',
  },
  billButtonText: {
    color: '#2c95f8',
  },
  disabledButtonText: {
    color: '#ccc',
  },
  processFab: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    backgroundColor: '#2c95f8',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f7fa',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2c95f8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  // Calendar modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  daysOfWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  calendarDayEmpty: {
    width: 42,
    height: 42,
    margin: 2,
  },
  calendarDay: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  calendarDayToday: {
    backgroundColor: '#e6f2ff',
  },
  calendarDaySelected: {
    backgroundColor: '#2c95f8',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#333',
  },
  calendarDayTextToday: {
    color: '#2c95f8',
    fontWeight: 'bold',
  },
  calendarDayTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  todayButton: {
    backgroundColor: '#2c95f8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  todayButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
export default ResponseScreen;