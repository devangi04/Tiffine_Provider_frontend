import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  Animated,
  Pressable,
  Platform,
  ScrollView
} from 'react-native';
import { Text } from '@/components/ztext';
import {  useNavigation, useRouter } from 'expo-router';
import { Plus, Copy, Trash2, Send, X, Utensils, Sun, Moon } from 'lucide-react-native';
import { useAppSelector } from './store/hooks';
import PastHistory from '@/components/pasthistory';
import { BlurView } from 'expo-blur';
import { API_URL } from './config/env';

const API_BASE_URL = `${API_URL}/api`;
const CATEGORY_API_URL = `${API_URL}/api/category`;
const DISH_API_URL = `${API_URL}/api/dish`;
const SENT_MENU_URL = `${API_URL}/api/sentmenu`;
const { width, height } = Dimensions.get('window');

interface DishItem {
  _id: string;
  name: string;
  description?: string;
  categoryId?: string | { _id: string; name: string };
  isActive?: boolean;
}

interface CategoryItem {
  _id: string;
  name: string;
  isDefault?: boolean;
}

interface MenuItem {
  categoryId: string | CategoryItem;
  dishIds: string[];
  _id: string;
}

interface Menu {
  _id: string;
  day: string;
  mealType: 'lunch' | 'dinner';
  items: MenuItem[];
  note?: string;
  providerId: string;
  name: string;
  createdAt: string;
  isActive?: boolean;
  pricing?: {
    price: number;
    isSpecialPrice: boolean;
    originalPrice: number;
  };
  isSpecialPricing?: boolean;
  specialPricingNote?: string;
}

interface DishCategory {
  _id: string;
  name: string;
  isActive: boolean;
  order?: number;
}

interface SentMenu {
  _id: string;
  providerId: string;
  menuId: string;
  menuName: string;
  day: string;
  mealType: 'lunch' | 'dinner';
  items: {
    categoryId: string;
    categoryName: string;
    dishes: {
      dishId: string;
      dishName: string;
    }[];
  }[];
  note?: string;
  sentAt: string;
}

const DAYS = [
  { id: 'monday', name: 'Mon' },
  { id: 'tuesday', name: 'Tue' },
  { id: 'wednesday', name: 'Wed' },
  { id: 'thursday', name: 'Thu' },
  { id: 'friday', name: 'Fri' },
  { id: 'saturday', name: 'Sat' },
  { id: 'sunday', name: 'Sun' }
];

const MEAL_TYPES = [
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#DA291C' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#DA291C' }
];

const ScheduleScreen: React.FC = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();
  
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [allDishes, setAllDishes] = useState<DishItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].id);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [menuHistory, setMenuHistory] = useState<{[key: string]: SentMenu[]}>({});
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<{[key: string]: boolean}>({});
  const [sendingMenu, setSendingMenu] = useState<string | null>(null);
  
  // State for meal preferences
  const [showMealTabs, setShowMealTabs] = useState<boolean>(false);
  const [preferencesLoading, setPreferencesLoading] = useState<boolean>(true);
  
  // State for today's sent menus tracking
  const [todaySentMenus, setTodaySentMenus] = useState<{[key: string]: boolean}>({});
  const [sentMenusLoading, setSentMenusLoading] = useState<boolean>(true);
  
  const tabSlideAnim = useRef(new Animated.Value(selectedMealType === 'lunch' ? 0 : 1)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;

  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [selectedMenuForOverlay, setSelectedMenuForOverlay] = useState<Menu | null>(null);

  const navigation = useNavigation();
  
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  
  useEffect(() => {
    if(!providerId){

      router.push('/');
      return;
    }
    fetchPreferences();
    fetchCategories();
    fetchAllDishes();
    fetchMenus();
    checkTodaysSentMenus();
  }, [providerId]);

  useEffect(() => {
    if (showMealTabs) {
      const slideValue = selectedMealType === 'lunch' ? 0 : 1;
      Animated.spring(tabSlideAnim, {
        toValue: slideValue,
        tension: 120,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
  }, [selectedMealType, showMealTabs]);

  useEffect(() => {
    if (selectedMenuId && !isOverlayVisible) {
      const menu = menus.find(m => m._id === selectedMenuId);
      if (menu) {
        setSelectedMenuForOverlay(menu);
        setIsOverlayVisible(true);
      }
    }
  }, [selectedMenuId]);

  useEffect(() => {
    if (isOverlayVisible) {
      overlayOpacity.setValue(0);
      cardScale.setValue(0.8);
      
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isOverlayVisible]);

  const closeOverlay = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsOverlayVisible(false);
      setSelectedMenuId(null);
      setSelectedMenuForOverlay(null);
    });
  };

  // Check if menu has been sent today
// Update this function in your ScheduleScreen component
const checkTodaysSentMenus = async () => {
  try {
    setSentMenusLoading(true);
    const today = new Date().toISOString().split('T')[0];
    
    const response = await axios.get(`${SENT_MENU_URL}`, {
      params: {
        providerId,
        weeks: 0.1, // Just get recent menus (less than a day)
        date: today // If you add the date filter to existing endpoint
      }
    });
    
    if (response.data.success) {
      const allSentMenus = response.data.data || [];
      const sentMap: {[key: string]: boolean} = {};
      
      // Get today's date
      const todayDate = new Date().toDateString();
      
      // Create a map of day + mealType that have been sent today
      allSentMenus.forEach((menu: SentMenu) => {
        const menuDate = new Date(menu.sentAt).toDateString();
        // Only consider menus sent today
        if (menuDate === todayDate) {
          const key = `${menu.day}_${menu.mealType}`;
          sentMap[key] = true;
        }
      });
      
      setTodaySentMenus(sentMap);
    }
  } catch (error) {
    console.error('Error checking today\'s sent menus:', error);
    // Fallback: try alternative approach if the main one fails
    tryFallbackApproach();
  } finally {
    setSentMenusLoading(false);
  }
};

// Alternative approach using the getSentMenus endpoint
const tryFallbackApproach = async () => {
  try {
    const response = await axios.get(`${SENT_MENU_URL}`, {
      params: {
        providerId,
        weeks: 1 // Get last week's menus
      }
    });
    
    if (response.data.success) {
      const allSentMenus = response.data.data || [];
      const sentMap: {[key: string]: boolean} = {};
      
      // Get today's date
      const today = new Date();
      const todayDate = today.toDateString();
      
      // Create a map of day + mealType that have been sent today
      allSentMenus.forEach((menu: SentMenu) => {
        const menuDate = new Date(menu.sentAt).toDateString();
        // Only consider menus sent today
        if (menuDate === todayDate) {
          const key = `${menu.day}_${menu.mealType}`;
          sentMap[key] = true;
        }
      });
      
      setTodaySentMenus(sentMap);
    }
  } catch (fallbackError) {
    console.error('Fallback approach also failed:', fallbackError);
    // If all fails, just show error but don't block the UI
    Alert.alert(
      'Warning',
      'Could not check today\'s sent menus. You may need to refresh.',
      [{ text: 'OK' }]
    );
  }
};
  const fetchPreferences = async () => {
    try {
      
      setPreferencesLoading(true);
      const response = await axios.get(`${API_BASE_URL}/Provider/preferences`, {
        headers: {
          Authorization: `Bearer ${providerId}`,
        }
      });
      
      if (response.data.success) {
        const mealService = response.data.data.mealService;
        const lunchEnabled = mealService?.lunch?.enabled === true;
        const dinnerEnabled = mealService?.dinner?.enabled === true;
        
        setShowMealTabs(lunchEnabled && dinnerEnabled);
        
        if (lunchEnabled && !dinnerEnabled) {
          setSelectedMealType('lunch');
        } else if (!lunchEnabled && dinnerEnabled) {
          setSelectedMealType('dinner');
        } else if (!lunchEnabled && !dinnerEnabled) {
          setSelectedMealType('lunch');
        }
      } else {
        setShowMealTabs(true);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setShowMealTabs(true);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const transformDishesData = (data: any): DishItem[] => {
    const dishes: DishItem[] = [];
    
    if (data && Array.isArray(data)) {
      data.forEach((categoryGroup: any) => {
        if (categoryGroup.dishes && Array.isArray(categoryGroup.dishes)) {
          categoryGroup.dishes.forEach((dish: any) => {
            dishes.push({
              _id: dish._id,
              name: dish.name,
              description: dish.description,
              categoryId: categoryGroup.categoryId,
              isActive: dish.isActive !== false
            });
          });
        }
      });
    }
    
    return dishes;
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${CATEGORY_API_URL}/provider/${providerId}`);
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllDishes = async () => {
    try {
      const response = await axios.get(`${DISH_API_URL}/provider/${providerId}`);
      if (response.data.success) {
        const transformedDishes = transformDishesData(response.data.data);
        setAllDishes(transformedDishes);
      }
    } catch (error) {
      console.error('Error fetching dishes:', error);
    }
  };

  const fetchMenus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE_URL}/menu?providerId=${providerId}`);
      
      if (response.data.success) {
        const menusData = response.data.menus || response.data.data || [];
        
        if (Array.isArray(menusData)) {
          const sortedMenus = menusData.sort((a: Menu, b: Menu) => {
            const dayComparison = DAYS.findIndex(d => d.id === a.day) - DAYS.findIndex(d => d.id === b.day);
            if (dayComparison !== 0) return dayComparison;
            
            return a.mealType === 'lunch' ? -1 : 1;
          });
          setMenus(sortedMenus);
        } else {
          setError('Unexpected data format received');
        }
      } else {
        setError(response.data.message || 'Failed to load menus');
      }
    } catch (error) {
      setError('Failed to load menus. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchMenuHistory = async (day: string) => {
    try {
      setHistoryLoading(true);
      const response = await axios.get(`${SENT_MENU_URL}?providerId=${providerId}&weeks=12`);
      
      if (response.data.success) {
        const sentMenus = response.data.data || [];
        
        const dayHistory = sentMenus
          .filter((menu: SentMenu) => menu.day === day)
          .sort((a: SentMenu, b: SentMenu) => 
            new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
          );
        
        setMenuHistory(prev => ({
          ...prev,
          [day]: dayHistory
        }));
      }
    } catch (error) {
      console.error('Error fetching menu history:', error);
      Alert.alert('Error', 'Failed to load menu history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const sendMenu = async (menuId: string) => {
    try {
      // Find the menu to be sent
      const menuToSend = menus.find(menu => menu._id === menuId);
      if (!menuToSend) {
        Alert.alert('Error', 'Menu not found');
        return;
      }

      // Check if menu for this day and meal type has already been sent today
      const todayKey = `${menuToSend.day}_${menuToSend.mealType}`;
      
      if (todaySentMenus[todayKey]) {
        Alert.alert(
          'Cannot Send Menu',
          `Today's ${menuToSend.mealType} menu for ${menuToSend.day.charAt(0).toUpperCase() + menuToSend.day.slice(1)} has already been sent. You can only send one menu per meal type per day.`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Ask for confirmation
      Alert.alert(
        'Confirm Send',
        `Are you sure you want to send the ${menuToSend.mealType} menu for ${menuToSend.day.charAt(0).toUpperCase() + menuToSend.day.slice(1)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send', 
            style: 'default',
            onPress: async () => {
              try {
                setSendingMenu(menuId);
                const response = await axios.post(SENT_MENU_URL, {
                  providerId,
                  menuId
                });
                
                if (response.data.success) {
                  // Update today's sent menus
                  setTodaySentMenus(prev => ({
                    ...prev,
                    [todayKey]: true
                  }));
                  
                  showToast('Menu sent successfully!');
                  setSelectedMenuId(null);
                  
                  // Refresh menu history
                  if (expandedHistoryDays[menuToSend.day]) {
                    await fetchMenuHistory(menuToSend.day);
                  }
                } else {
                  throw new Error(response.data.error || 'Failed to send menu');
                }
              } catch (error: any) {
                if (error.response?.data?.alreadySent) {
                  // Update state if API also confirms it's already sent
                  setTodaySentMenus(prev => ({
                    ...prev,
                    [todayKey]: true
                  }));
                  Alert.alert(
                    'Already Sent',
                    error.response.data.error
                  );
                } else {
                  Alert.alert('Error', 'Failed to send menu. Please try again.');
                }
              } finally {
                setSendingMenu(null);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in sendMenu:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const toggleHistory = async (day: string) => {
    const isExpanded = expandedHistoryDays[day];
    
    if (!isExpanded && !menuHistory[day]) {
      await fetchMenuHistory(day);
    }
    
    setExpandedHistoryDays(prev => ({
      ...prev,
      [day]: !isExpanded
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPreferences();
    fetchMenus();
    fetchCategories();
    fetchAllDishes();
    checkTodaysSentMenus();
  };

  const getMenusForDayAndMealType = (dayId: string, mealType: 'lunch' | 'dinner') => {
    return menus.filter(menu => menu.day === dayId && menu.mealType === mealType);
  };

  const toggleMenuSelection = (menuId: string) => {
    if (selectedMenuId === menuId) {
      closeOverlay();
    } else {
      setSelectedMenuId(menuId);
    }
  };

  const deleteMenu = async () => {
    if (!selectedMenu) return;
    try {
      await axios.delete(`${API_BASE_URL}/menu/${selectedMenu._id}`);
      setIsDeleteModalVisible(false);
      setSelectedMenu(null);
      fetchMenus();
      showToast('Menu deleted successfully!');
    } catch (error) {
      console.error('Error deleting menu:', error);
      Alert.alert('Error', 'Failed to delete menu');
    }
  };

  const duplicateMenu = async (day: string, mealType: 'lunch' | 'dinner') => {
    if (!selectedMenu) return;
    try {
      await axios.post(`${API_BASE_URL}/menu/${selectedMenu._id}/duplicate`, {
        day: day,
        mealType: mealType,
        name: `Copy of ${selectedMenu.name}`
      });
      setIsDuplicateModalVisible(false);
      setSelectedMenu(null);
      fetchMenus();
      showToast('Menu duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating menu:', error);
      Alert.alert('Error', 'Failed to duplicate menu');
    }
  };

  const showToast = (message: string) => {
    Alert.alert('Success', message);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryName = (categoryId: string | CategoryItem): string => {
    if (typeof categoryId === 'object' && categoryId !== null && categoryId.name) {
      return categoryId.name;
    }
    
    if (typeof categoryId === 'string') {
      const category = categories.find(cat => cat._id === categoryId);
      return category ? category.name : 'Unknown Category';
    }
    
    return 'Unknown Category';
  };

  const getDishName = (dishId: string): string => {
    if (!dishId) return 'Unknown Dish';
    
    const dish = allDishes.find(d => d._id === dishId);
    return dish ? dish.name : 'Unknown Dish';
  };

  const getDishNamesForCategory = (dishIds: string[]): string => {
    if (!dishIds || !Array.isArray(dishIds)) return 'No dishes';
    
    return dishIds.map(dishId => getDishName(dishId))
      .filter(name => name !== 'Unknown Dish')
      .join(', ') || 'No dishes';
  };

  const getMealTypeIcon = (mealType: 'lunch' | 'dinner') => {
    const mealConfig = MEAL_TYPES.find(m => m.id === mealType);
    const IconComponent = mealConfig?.icon || Utensils;
    const color = mealConfig?.color || '#64748B';
    
    return { IconComponent, color };
  };
  
  const getMealTypeColor = (mealType: 'lunch' | 'dinner') => {
    return MEAL_TYPES.find(m => m.id === mealType)?.color || '#64748B';
  };

  const renderHistorySection = (day: string) => {
    return (
      <PastHistory
        history={menuHistory[day] || []}
        loading={historyLoading}
        isExpanded={expandedHistoryDays[day] || false}
        onToggle={() => toggleHistory(day)}
        day={day}
        getDishName={getDishName}
        formatDate={formatDate}
        type="sent"
      />
    );
  };

const renderDayTab = (day: typeof DAYS[0]) => {
  const isActive = day.id === selectedDay;
  
  // Get the current date
  const today = new Date();
  const currentDayIndex = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Adjust for our DAYS array starting with Monday
  const adjustedCurrentDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
  const currentDayId = DAYS[adjustedCurrentDayIndex]?.id;
  
  // Calculate the date for this day tab
  let targetDate = new Date(today);
  
  // Find the difference between current day and target day
  const currentDayIndexInWeek = adjustedCurrentDayIndex;
  const targetDayIndex = DAYS.findIndex(d => d.id === day.id);
  const dayDifference = targetDayIndex - currentDayIndexInWeek;
  
  // Set the target date
  targetDate.setDate(today.getDate() + dayDifference);
  
  // Get the day of month
  const dayOfMonth = targetDate.getDate();

  return (
    <TouchableOpacity
      key={day.id}
      style={[
        styles.dayTab,
        isActive && styles.activeDayTab,
        isActive && styles.activeDayTabShadow
      ]}
      onPress={() => {
        setSelectedDay(day.id);
        setSelectedMenuId(null);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.dayTabContent}>
        <Text weight="extraBold" style={[
          styles.dayName,
          isActive && styles.activeDayName
        ]}>
          {day.name}
        </Text>
        
        {/* Show date number instead of menu count */}
        <View style={isActive ? styles.dateNumberCircle : styles.inactiveDateNumberCircle}>
          <Text weight="extraBold" style={[
            styles.dateNumber,
            isActive && styles.activeDateNumber
          ]}>
            {dayOfMonth}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

  const renderMealTypeTabs = () => {
    if (!showMealTabs) return null;

    return (
      <View style={styles.mealTypeTabContainer}>
        <Animated.View 
          style={[
            styles.mealTypeTabIndicator,
            {
              transform: [{
                translateX: tabSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, width/2 - 4],
                })
              }],
              backgroundColor: tabSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#DA291C', '#DA291C'],
              }),
            }
          ]} 
        />
        
        <View style={styles.mealTypeTabsInner}>
          {MEAL_TYPES.map((mealType) => {
            const isActive = mealType.id === selectedMealType;
            const dayMenus = getMenusForDayAndMealType(selectedDay, mealType.id as 'lunch' | 'dinner');
            const Icon = mealType.icon;
            
            return (
              <TouchableOpacity
                key={mealType.id}
                style={[
                  styles.mealTypeTabButton,
                  isActive && styles.activeMealTypeTabButton
                ]}
                onPress={() => setSelectedMealType(mealType.id as 'lunch' | 'dinner')}
                activeOpacity={0.7}
              >
                <View style={styles.mealTypeContent}>
                  <Icon size={18} color={isActive ? '#fff' : mealType.color} />
                  <Text weight="extraBold" style={[
                    styles.mealTypeTabText,
                    isActive ? styles.activeMealTypeTabText : { color: mealType.color }
                  ]}>
                    {mealType.name}
                  </Text>
                </View>
                
                {isActive && dayMenus.length > 0 && (
                  <View style={[
                    styles.mealTypeTabCount,
                    { 
                      backgroundColor: '#fff',
                      borderColor: mealType.color,
                    }
                  ]}>
                    <Text style={[styles.mealTypeTabCountText, { color: mealType.color }]}>
                      {dayMenus.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderMealTypeHeader = () => {
    if (showMealTabs) return null;
    
    let headerText = '';
    if (selectedMealType === 'lunch') {
      headerText = 'Lunch Menus';
    } else if (selectedMealType === 'dinner') {
      headerText = 'Dinner Menus';
    }
    
    return (
      <View style={styles.singleMealTypeHeader}>
        <Text weight="extraBold" style={styles.singleMealTypeText}>
          {headerText}
        </Text>
      </View>
    );
  };

  const ActionButton = ({
    icon: Icon,
    onPress,
    color,
    disabled = false
  }: {
    icon: React.ComponentType<{ size: number; color: string }>;
    onPress: () => void;
    color: string;
    disabled?: boolean;
  }) => (
    <TouchableOpacity 
      style={[
        styles.actionButton, 
        { backgroundColor: `${color}15`, borderColor: `${color}30` },
        disabled && styles.disabledButton
      ]} 
      onPress={(e) => {
        e.stopPropagation();
        if (!disabled) onPress();
      }}
      disabled={disabled}
    >
      <Icon size={18} color={disabled ? '#94A3B8' : color} />
    </TouchableOpacity>
  );

  const renderMenuCard = ({ item }: { item: Menu }) => {
    const isSelected = selectedMenuId === item._id;
    const hasDishes = item.items && item.items.some(menuItem => 
      menuItem.dishIds && menuItem.dishIds.length > 0
    );
    
    const { IconComponent, color } = getMealTypeIcon(item.mealType);
    
    // Check if this menu has been sent today
    const todayKey = `${item.day}_${item.mealType}`;
    const isSentToday = todaySentMenus[todayKey];
    const isCurrentlySending = sendingMenu === item._id;

    return (
      <Pressable 
        style={[
          styles.menuCard,
          isSentToday && styles.sentMenuCard
        ]}
        onPress={() => toggleMenuSelection(item._id)}
      >
        {isSentToday && (
          <View style={styles.sentTodayBadge}>
            <Text weight="bold" style={styles.sentTodayText}>
              Sent Today
            </Text>
          </View>
        )}
        
        <View style={styles.menuHeader}>
          <View style={styles.menuTitleContainer}>
            <View style={styles.menuTitleRow}>
              <Text weight='bold' style={[
                styles.menuName,
                isSentToday && styles.sentMenuName
              ]} numberOfLines={1}>{item.name}</Text>
              <View style={[
                styles.mealTypeBadge,
                { backgroundColor: `${color}15` }
              ]}>
                <IconComponent size={14} color={color} />
                <Text weight='bold' style={[
                  styles.mealTypeBadgeText,
                  { color: color, marginLeft: 4 }
                ]}>
                  {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.menuDay}>
              {item.day.charAt(0).toUpperCase() + item.day.slice(1)}
            </Text>
          </View>
        </View>
        
        <View style={styles.menuItemsContainer}>
          {item.items && item.items.map((menuItem, index) => (
            <View key={`${item._id}-${index}`} style={styles.menuItemRow}>
              <Text weight='bold' style={styles.menuItemCategory}>
                {getCategoryName(menuItem.categoryId).toUpperCase()}
              </Text>
              <Text weight='bold' style={styles.dishNames} numberOfLines={1}>
                {getDishNamesForCategory(menuItem.dishIds)}
              </Text>
            </View>
          ))}
          
          {!hasDishes && (
            <View style={styles.noDishesContainer}>
              <Text weight='bold' style={styles.noDishesText}>No dishes added yet</Text>
            </View>
          )}
        </View>
        
        {item.note && (
          <View style={styles.specialNotes}>
            <Text style={styles.specialNotesText}>📝 {item.note}</Text>
          </View>
        )}

        {item.specialPricingNote && (
          <View style={[styles.specialNotes, { backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeftColor: '#F59E0B' }]}>
            <Text style={[styles.specialNotesText, { color: '#B45309' }]}>
              💰 {item.specialPricingNote}
            </Text>
          </View>
        )}

        <View style={styles.priceActionRow}>
          <View style={styles.priceContainer}>
            {item.pricing?.price > 0 && (
              <Text weight='extraBold' style={styles.menuPrice}>₹{item.pricing.price}</Text>
            )}
            {item.isSpecialPricing && (
              <Text style={styles.specialPriceIndicator}>Special Price</Text>
            )}
          </View>
          <View style={styles.actionButtons}>
            <ActionButton icon={Copy} onPress={() => { setSelectedMenu(item); setIsDuplicateModalVisible(true); }} color="#10B981" />
            <ActionButton icon={Trash2} onPress={() => { setSelectedMenu(item); setIsDeleteModalVisible(true); }} color="#EF4444" />
            
            {isSentToday ? (
              <View style={[styles.sentButton, { backgroundColor: `${color}15` }]}>
                <Text weight="bold" style={{ color, fontSize: 12 }}>Sent</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.sendButton, isCurrentlySending && styles.sendingButton]}
                onPress={() => sendMenu(item._id)}
                disabled={isCurrentlySending}
              >
                {isCurrentlySending ? (
                  <ActivityIndicator size="small" color={color} />
                ) : (
                  <Send size={18} color='#2c95f8' />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderInstagramStyleOverlay = () => {
    if (!isOverlayVisible) return null;
    
    if (!selectedMenuForOverlay) return null;

    const menu = selectedMenuForOverlay;
    const hasDishes = menu.items && menu.items.some(menuItem => 
      menuItem.dishIds && menuItem.dishIds.length > 0
    );
    
    const { IconComponent, color } = getMealTypeIcon(menu.mealType);
    
    // Check if sent today
    const todayKey = `${menu.day}_${menu.mealType}`;
    const isSentToday = todaySentMenus[todayKey];

    return (
      <Modal
        visible={isOverlayVisible}
        animationType="none"
        transparent={true}
        onRequestClose={closeOverlay}
        statusBarTranslucent
      >
        <BlurView intensity={30}
        tint="default" 
        style={StyleSheet.absoluteFill}>
        <Animated.View 
          style={[
            styles.overlayBackground,
            { 
              opacity: overlayOpacity,
              backgroundColor: overlayOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.45)']
              })
            }
          ]}
        >
          <Pressable 
            style={styles.overlayPressable}
            onPress={closeOverlay}
          >
            <View style={styles.overlayContainer}>
              <Animated.View 
                style={[
                  styles.overlayHeader,
                  {
                    opacity: overlayOpacity,
                    transform: [{
                      translateY: overlayOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0]
                      })
                    }]
                  }
                ]}
              >
              </Animated.View>

              <Animated.View 
                style={[
                  styles.centeredCardContainer,
                  {
                    transform: [{
                      translateY: overlayOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [30, 0]
                      })
                    }]
                  }
                ]}
              >
                <Pressable onPress={(e) => e.stopPropagation()}>
                  <Animated.View 
                    style={[
                      styles.overlayMenuCard,
                      {
                        transform: [{ scale: cardScale }],
                        opacity: overlayOpacity
                      }
                    ]}
                  >
                    <ScrollView 
                      style={styles.cardScrollView}
                      showsVerticalScrollIndicator={false}
                      bounces={false}
                    >
                      {isSentToday && (
                        <View style={styles.overlaySentTodayBadge}>
                          <Text weight="bold" style={styles.overlaySentTodayText}>
                            Already Sent Today
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.menuHeader}>
                        <View style={styles.menuTitleContainer}>
                          <View style={styles.menuTitleRow}>
                            <Text weight='bold' style={styles.overlayMenuName} numberOfLines={2}>
                              {menu.name}
                            </Text>
                            <View style={[
                              styles.mealTypeBadge,
                              { backgroundColor: `${color}15` }
                            ]}>
                              <IconComponent size={16} color={color} />
                              <Text weight='bold' style={[
                                styles.mealTypeBadgeText,
                                { color: color, marginLeft: 4 }
                              ]}>
                                {menu.mealType.charAt(0).toUpperCase() + menu.mealType.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.overlayMenuDay}>
                            {menu.day.charAt(0).toUpperCase() + menu.day.slice(1)}
                          </Text>
                        </View>
                      </View>
                      
                      <Animated.View 
                        style={[
                          styles.divider,
                          {
                            opacity: overlayOpacity,
                            transform: [{
                              scaleX: overlayOpacity.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1]
                              })
                            }]
                          }
                        ]}
                      />
                      
                      <View style={styles.menuItemsContainer}>
                        {menu.items && menu.items.map((menuItem, index) => (
                          <Animated.View 
                            key={`${menu._id}-${index}`} 
                            style={[
                              styles.overlayMenuItemRow,
                              {
                                opacity: overlayOpacity,
                                transform: [{
                                  translateY: overlayOpacity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0]
                                  })
                                }]
                              }
                            ]}
                          >
                            <View style={styles.categoryHeader}>
                              <View style={[styles.categoryDot, { backgroundColor: color }]} />
                              <Text weight='bold' style={styles.overlayMenuItemCategory}>
                                {getCategoryName(menuItem.categoryId)}
                              </Text>
                            </View>
                            <Text style={styles.overlayDishNames}>
                              {getDishNamesForCategory(menuItem.dishIds)}
                            </Text>
                          </Animated.View>
                        ))}
                        
                        {!hasDishes && (
                          <Animated.View 
                            style={[
                              styles.noDishesContainer,
                              {
                                opacity: overlayOpacity,
                                transform: [{
                                  scale: overlayOpacity.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1]
                                  })
                                }]
                              }
                            ]}
                          >
                            <Utensils size={32} color="#CBD5E1" />
                            <Text weight='bold' style={styles.noDishesText}>No dishes added yet</Text>
                            <Text style={styles.noDishesSubtext}>Tap edit to add dishes</Text>
                          </Animated.View>
                        )}
                      </View>
                      
                      {menu.pricing?.price > 0 && (
                        <Animated.View 
                          style={[
                            styles.overlayPriceContainer,
                            {
                              opacity: overlayOpacity,
                              transform: [{
                                translateY: overlayOpacity.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [20, 0]
                                })
                              }]
                            }
                          ]}
                        >
                          <Text weight="bold" style={styles.priceLabel}>Price</Text>
                          <View style={styles.priceRow}>
                            <Text style={styles.overlayMenuPrice}>₹{menu.pricing.price}</Text>
                            {menu.isSpecialPricing && (
                              <View style={styles.specialPriceBadge}>
                                <Text style={styles.specialPriceBadgeText}>Special</Text>
                              </View>
                            )}
                          </View>
                        </Animated.View>
                      )}
                    </ScrollView>
                  </Animated.View>
                </Pressable>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.buttonsBelowCard,
                  {
                    opacity: overlayOpacity,
                    transform: [{
                      translateY: overlayOpacity.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }]
                  }
                ]}
              >
                <View style={styles.bottomButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.bottomButton, styles.cancelButton]}
                    onPress={closeOverlay}
                    activeOpacity={0.7}
                  >
                    <X size={20} color="red" />
                    <Text color='red' style={styles.bottomButtonText}>Cancel</Text>
                  </TouchableOpacity>
  
                  {!isSentToday && (
                    <TouchableOpacity 
                      style={[styles.bottomButton, styles.sendButton]}
                      onPress={(e) => {
                        e.stopPropagation();
                        closeOverlay();
                        setTimeout(() => {
                          sendMenu(menu._id);
                        }, 300);
                      }}
                      activeOpacity={0.7}
                    >
                      <Send size={20} color="#117ae3ff" />
                      <Text color='#117ae3ff' style={styles.bottomButtonText}>Send</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </View>
          </Pressable>
        </Animated.View>
        </BlurView>
      </Modal>
    );
  };

  const renderDuplicateModal = () => (
    <Modal
      visible={isDuplicateModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsDuplicateModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Duplicate "{selectedMenu?.name}"</Text>
          <Text style={styles.modalText}>
            Select a day and meal type to duplicate this menu to:
          </Text>
          
          <ScrollView style={styles.dayPicker}>
            {DAYS.filter(day => day.id !== selectedMenu?.day).map(day => (
              <View key={day.id} style={styles.dayOptionGroup}>
                <Text style={styles.dayOptionLabel}>{day.name}</Text>
                <View style={styles.mealTypeOptions}>
                  {MEAL_TYPES.map(mealType => {
                    const Icon = mealType.icon;
                    return (
                      <TouchableOpacity
                        key={`${day.id}-${mealType.id}`}
                        style={[
                          styles.mealTypeOption,
                          { borderColor: mealType.color }
                        ]}
                        onPress={() => duplicateMenu(day.id, mealType.id as 'lunch' | 'dinner')}
                      >
                        <Icon size={16} color={mealType.color} />
                        <Text style={[styles.mealTypeOptionText, { color: mealType.color, marginLeft: 6 }]}>
                          {mealType.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setIsDuplicateModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => {
    const dayMenus = getMenusForDayAndMealType(selectedDay, selectedMealType);
    
    return (
      <View style={styles.emptyContainer}>
        <Utensils size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>
          No {selectedMealType} menus for {DAYS.find(d => d.id === selectedDay)?.name}
        </Text>
        <Text style={styles.emptySubtext}>
          Create a {selectedMealType} menu and add dishes to get started
        </Text>
        
        {renderHistorySection(selectedDay)}
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push({
            pathname: '/menu',
            params: { 
              providerId,
              defaultDay: selectedDay,
              defaultMealType: selectedMealType
            }
          })}
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>Create {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    const dayMenus = getMenusForDayAndMealType(selectedDay, selectedMealType);
    
    return (
      <View style={styles.contentContainer}>
        <FlatList
          data={dayMenus}
          renderItem={renderMenuCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContainer,
            dayMenus.length === 0 && styles.emptyListContainer
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2c95f8']}
            />
          }
          ListHeaderComponent={
            <>
              {dayMenus.length > 0 && renderHistorySection(selectedDay)}
            </>
          }
        />
      </View>
    );
  };

  // Show loading while preferences are being fetched
  if (preferencesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text style={styles.loadingText}>Loading menus...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchMenus}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Loading indicator for today's sent menus */}
      {sentMenusLoading && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color="#2c95f8" />
          <Text style={styles.loadingText}>Checking today's menus...</Text>
        </View>
      )}

      <View style={styles.daysContainer}>
        <View style={styles.daysGrid}>
          {DAYS.map(renderDayTab)}
        </View>
      </View>

      {/* Show tabs only if both lunch and dinner are enabled, otherwise show header */}
      {showMealTabs ? (
        <View style={styles.mealTypeTabWrapper}>
          {renderMealTypeTabs()}
        </View>
      ) : (
        renderMealTypeHeader()
      )}

      {renderContent()}

      {renderInstagramStyleOverlay()}
      
      <Modal
        visible={isDeleteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Menu</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete "{selectedMenu?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deleteMenu}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderDuplicateModal()}
    </View>
  );
};

// Add StyleSheet at the end (you can fill in your own styles)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 12,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  daysContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.3)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dayTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 0,
    minHeight: 66,
    position: 'relative',
  },
  activeDayTab: {
    backgroundColor: '#004C99',
    transform: [{ scale: 1.05 }],
  },
  activeDayTabShadow: {
    shadowColor: '#004C99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  dayTabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#004C99',
    textTransform: 'capitalize',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  activeDayName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 28,
  },
  activeDateNumber: {
    color: '#060606ff',
    fontWeight: '800',
  },
  dateNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 23,
    borderColor:'white',
    borderWidth:1,
    backgroundColor: '#e5e7f3d3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom:-12,
  },
  inactiveDateNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 23,
    borderColor:'white',
    borderWidth:2,
    backgroundColor: '#ebecedff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom:-12,
  },
  mealTypeTabWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mealTypeTabContainer: {
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderRadius: 25,
    padding: 4,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    left: 0,
    width: (width - 32) / 2 - 8,
    height: 42,
    borderRadius: 21,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mealTypeTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 21,
    position: 'relative',
  },
  activeMealTypeTabButton: {
    backgroundColor: 'transparent',
  },
  mealTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  mealTypeTabText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 2,
  },
  activeMealTypeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  mealTypeTabCount: {
    position: 'absolute',
    top: -6,
    right: 8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mealTypeTabCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  menuTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  menuName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuDay: {
    fontSize: 12,
    color: '#64748B',
  },
  priceActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuPrice: {
    color: '#080808ff',
    fontWeight: '600',
    fontSize: 22,
  },
  specialPriceIndicator: {
    color: '#F59E0B',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  menuItemsContainer: {
    marginBottom: 8,
  },
  menuItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuItemCategory: {
    fontWeight: '600',
    color: '#030303ff',
    fontSize: 13,
    flex: 1,
    textAlign: 'left',
  },
  dishNames: {
    fontSize: 14,
    color: '#475569',
    flex: 1,
    textAlign: 'right',
  },
  noDishesContainer: {
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  noDishesText: {
    color: '#64748B',
    fontStyle: 'italic',
    fontSize: 14,
  },
  specialNotes: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e5e7f3d3',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#004C99',
  },
  specialNotesText: {
    fontSize: 13,
    color: '#64748B',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#004C99',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#004C99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E2E8F0',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  dayPicker: {
    marginBottom: 24,
    maxHeight: 300,
  },
  dayOptionGroup: {
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  mealTypeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  mealTypeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderWidth: 1,
  },
  mealTypeOptionText: {
    color: '#475569',
    fontWeight: '500',
    fontSize: 14,
  },
  // Instagram-style Overlay Styles
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  overlayPressable: {
    flex: 1,
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
     alignItems: 'center',
     paddingHorizontal: 20,
  },
overlayHeader: {
  position: 'absolute',
  top: Platform.OS === 'ios' ? 60 : 40,
  right: 20,
  zIndex: 1000,
},
  overlayHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(67, 168, 203, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#004C99',
  },
  profileName: {
    color: '#fff',
    fontSize: 16,
  },
  profileSubtext: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  centeredCardContainer: {
    width: '100%',
  alignItems: 'center',
  paddingHorizontal:20,
  },
  overlayMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: width - 50,
    maxWidth: 500,
    maxHeight: height * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
    overflow: 'hidden',
  },
  cardScrollView: {
    padding: 24,
  },
  overlayMenuName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
  },
  overlayMenuDay: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  overlayMenuItemRow: {
   flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  overlayMenuItemCategory: {
    fontSize: 15,
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overlayDishNames: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginLeft: 14,
  },
  overlaySpecialNotes: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(44, 168, 203, 0.08)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#004C99',
  },
  noteLabel: {
    fontSize: 13,
    color: '#004C99',
    marginBottom: 4,
  },
  specialNotesText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  overlayPriceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  priceLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayMenuPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
  },
  specialPriceBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specialPriceBadgeText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
  },
  overlayActionsMenu: {
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  buttonsBelowCard: {
  width: width - 50,
  maxWidth: 500,
  marginTop: 16, // Small gap between card and buttons
  paddingHorizontal: 4,
},
bottomButtonsRow: {
  flexDirection: 'row',
  gap: 8,
},
bottomButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 16,
  paddingHorizontal: 20,
  gap: 8,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 4,
},
cancelButton: {
  backgroundColor: '#fdfeffff',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
// sendButton: {
//   backgroundColor: '#ffff', // Changed to blue
//   borderWidth: 1,
//   borderColor: '#ffff',
// },
bottomButtonText: {
  fontSize: 16,
  fontWeight: '600',
},
sendButtonText: {
  color: '#004C99', // White text for send button
},
 singleMealTypeHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  singleMealTypeText: {
    fontSize: 18,
    color: '#1E293B',
    textAlign: 'center',
  },
  //new
   disabledButton: {
    opacity: 0.5,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },

  // Sent Menu Card Styles
  sentMenuCard: {
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },

  sentTodayBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  sentTodayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  sentMenuName: {
    color: '#059669',
  },

  sentButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },

  sendButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 30,
  },

  sendingButton: {
    opacity: 0.7,
    backgroundColor: '#EFF6FF',
  },

  // Overlay Sent Today Badge
  overlaySentTodayBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  overlaySentTodayText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Loading Indicator
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
});

export default ScheduleScreen;