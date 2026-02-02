import api from './api/api';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
  Switch,
  Modal,
  Dimensions,
  Animated,
  Keyboard,
  KeyboardAvoidingView
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Check, X, Edit2, Sun, Moon } from 'lucide-react-native';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useAppSelector } from './store/hooks';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ztext';
import { API_URL } from './config/env';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import axios, { AxiosError } from 'axios';
const API_BASE_URL = `${API_URL}/api`;
const DISH_API_URL = `${API_URL}/api/dish`;
const CATEGORY_API_URL = `${API_URL}/api/category`;
const MENU_API_URL = `${API_URL}/api/menu`;
const PROVIDER_API_URL = `${API_URL}/api/provider`;
const { width, height } = Dimensions.get("window");

interface Dish {
  _id: string;
  name: string;
  categoryId: string;
  description?: string;
  isActive?: boolean;
  basePrice?: number;
  isExtra?: boolean;
}

interface DishCategory {
  _id: string;
  name: string;
  image: string;
  isActive: boolean;
  order?: number;
}

interface MenuItem {
  categoryId: string;
  dishIds: string[];
}

interface SelectedDishes {
  [categoryId: string]: string[];
}

interface MealOptions {
  price: number;
  
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
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#15803d' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#15803d' }
];

const DailyMenuScreen: React.FC = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const insets =  useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { 
    editMode,
    menuId,
    day: initialDay,
    mealType: initialMealType,
    menuName: initialMenuName,
    note: initialNote,
    price: initialPrice,
    originalPrice: initialOriginalPrice,
    isSpecialPrice: initialIsSpecialPrice,
    selectedDishes: selectedDishesParam 
  } = useLocalSearchParams();

  const todayIndex = new Date().getDay();
  const today = DAYS[todayIndex === 0 ? 6 : todayIndex - 1].id;

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedDay, setSelectedDay] = useState<string>(
    initialDay as string || today
  );
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>(
    (initialMealType as 'lunch' | 'dinner') || 'lunch'
  );
  const [isEditMode, setIsEditMode] = useState<boolean>(editMode === 'true');
  const [currentMenuId, setCurrentMenuId] = useState<string>(menuId as string || '');
  
  const [isNoteFocused, setIsNoteFocused] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const [isSpecialPricing, setIsSpecialPricing] = useState<boolean>(initialIsSpecialPrice === 'true');
  const [specialPricingNote, setSpecialPricingNote] = useState<string>('');
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);

  
  // Swipe animations
  const scrollX = useRef(new Animated.Value(0)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const horizontalScrollViewRef = useRef<ScrollView>(null);
  const lunchTextColor = useRef(new Animated.Value(1)).current;
  const dinnerTextColor = useRef(new Animated.Value(0)).current;
  

  const forcedMealType = isEditMode && initialMealType
  ? (initialMealType as 'lunch' | 'dinner')
  : null;

  const scrollRef = useRef<KeyboardAwareScrollView>(null);

const scrollToInput = (reactNode: any) => {
  scrollRef.current?.scrollToFocusedInput(reactNode);
};

const singleMealScrollRef = useRef<KeyboardAwareScrollView>(null);

  const verticalScrollViewRefs = {
    lunch: useRef<ScrollView>(null),
    dinner: useRef<ScrollView>(null)
  };
  const noteInputRefs = {
    lunch: useRef<TextInput>(null),
    dinner: useRef<TextInput>(null)
  };

  useEffect(() => {
  if (forcedMealType) {
    setSelectedMealType(forcedMealType);
  }
}, [forcedMealType]);

useEffect(() => {
  if (isEditMode) {
    // In edit mode, use the specific menu price from params
    if (initialMealType === 'lunch') {
      setLunchData(prev => ({
        ...prev,
        menuName: initialMenuName as string || 'Lunch Menu',
        note: initialNote as string || '',
        mealOptions: { 
          price: parseInt(initialPrice as string || '0') 
        }
      }));
    } else if (initialMealType === 'dinner') {
      setDinnerData(prev => ({
        ...prev,
        menuName: initialMenuName as string || 'Dinner Menu',
        note: initialNote as string || '',
        mealOptions: { 
          price: parseInt(initialPrice as string || '0') 
        }
      }));
    }
  }
}, [isEditMode, initialMealType, initialMenuName, initialNote, initialPrice]);
  // Local state for each meal type
  const [lunchData, setLunchData] = useState<{
    menuName: string;
    note: string;
    selectedDishes: SelectedDishes;
    mealOptions: MealOptions;
  }>({
    menuName: initialMealType === 'lunch' ? (initialMenuName as string || 'Lunch Menu') : 'Lunch Menu',
    note: initialMealType === 'lunch' ? (initialNote as string || '') : '',
    selectedDishes: {},
    mealOptions: { 
      price: initialMealType === 'lunch' ? parseInt(initialPrice as string || '0') : 0 
    }
  });

  const [dinnerData, setDinnerData] = useState<{
    menuName: string;
    note: string;
    selectedDishes: SelectedDishes;
    mealOptions: MealOptions;
  }>({
    menuName: initialMealType === 'dinner' ? (initialMenuName as string || 'Dinner Menu') : 'Dinner Menu',
    note: initialMealType === 'dinner' ? (initialNote as string || '') : '',
    selectedDishes: {},
    mealOptions: { 
      price: initialMealType === 'dinner' ? parseInt(initialPrice as string || '0') : 0 
    }
  });

  // Fetch meal preferences
  const [mealPrefs, setMealPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState<boolean>(true);

  // Calculate indicator width
  const indicatorWidth = (width - 60) / 2 - 4;

  // Parse selected dishes from params
  const parseSelectedDishesFromParams = useCallback((): SelectedDishes => {
    try {
      if (selectedDishesParam) {
        return JSON.parse(selectedDishesParam as string);
      }
    } catch (error) {
      console.error('Error parsing selected dishes:', error);
    }
    return {};
  }, [selectedDishesParam]);

  // Setup scroll listener for animations
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const progress = value / width;
      const position = progress * indicatorWidth;
      indicatorPosition.setValue(position);
      
      lunchTextColor.setValue(1 - progress);
      dinnerTextColor.setValue(progress);
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, []);

  // Navigation setup
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Handle scroll end to update selected meal type
  const handleScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    const mealType = index === 0 ? 'lunch' : 'dinner';
    
    if (mealType !== selectedMealType) {
      setSelectedMealType(mealType);
    }
  }, [selectedMealType]);

  // Handle meal type tab press
  const handleMealTypePress = useCallback((mealType: 'lunch' | 'dinner') => {
    const index = mealType === 'lunch' ? 0 : 1;
    
    if (horizontalScrollViewRef.current) {
      horizontalScrollViewRef.current.scrollTo({
        x: index * width,
        animated: true,
      });
    }
    
    setSelectedMealType(mealType);
  }, []);

  // Fetch meal preferences on component mount
  useEffect(() => {
    fetchMealPreferences();
  }, []);

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
        
        const lunchEnabled = mealService?.lunch?.enabled === true;
        const dinnerEnabled = mealService?.dinner?.enabled === true;
        
        if (lunchEnabled && !dinnerEnabled) {
          setSelectedMealType('lunch');
        } else if (!lunchEnabled && dinnerEnabled) {
          setSelectedMealType('dinner');
        } else if (!lunchEnabled && !dinnerEnabled) {
          setSelectedMealType('lunch');
        }
      } else {
        setMealPrefs({
          lunch: { enabled: true },
          dinner: { enabled: true }
        });
      }
    } catch (error) {
      setMealPrefs({
        lunch: { enabled: true },
        dinner: { enabled: true }
      });
    } finally {
      setPrefsLoading(false);
    }
  };

const fetchAllMealPreferences = async () => {
  try {
    const response = await api.get(`${PROVIDER_API_URL}/preferences`, {
      headers: { Authorization: `Bearer ${provider.token}` }
    });
    
    if (response.data.success) {
      const prefs = response.data.data.mealService;
      
      // Only set meal preference prices if NOT in edit mode
      if (!isEditMode) {
        // Set lunch preferences
        const lunchPrefs = prefs.lunch || { price: 0 };
        setLunchData(prev => ({
          ...prev,
          mealOptions: { price: lunchPrefs.price || 0 }
        }));
        
        // Set dinner preferences
        const dinnerPrefs = prefs.dinner || { price: 0 };
        setDinnerData(prev => ({
          ...prev,
          mealOptions: { price: dinnerPrefs.price || 0 }
        }));
      }
    }
  } catch (error) {
    // Only set default values if NOT in edit mode
    if (!isEditMode) {
      setLunchData(prev => ({
        ...prev,
        mealOptions: { price: 0 }
      }));
      setDinnerData(prev => ({
        ...prev,
        mealOptions: { price: 0 }
      }));
    }
  }
};

  // Load static data
  useEffect(() => {
    if (!providerId) {
      router.push('/');
      return;
    }

    if (!prefsLoading) {
      fetchStaticData();
      fetchAllMealPreferences();
    }
  }, [providerId, prefsLoading]);

 const fetchStaticData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Fetch categories
    const categoriesResponse = await api.get(`${CATEGORY_API_URL}/provider/${providerId}`);
    const activeCategories = categoriesResponse.data.data.filter((cat: DishCategory) => cat.isActive);
    
    activeCategories.sort((a: DishCategory, b: DishCategory) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    });
    
    setCategories(activeCategories);
    
    // Initialize selected dishes based on edit mode
    const parsedSelectedDishes = parseSelectedDishesFromParams();
    
    const initialSelectedDishes: SelectedDishes = {};
    activeCategories.forEach((cat: DishCategory) => {
      // If edit mode, use the parsed dishes, otherwise empty array
      initialSelectedDishes[cat._id] = isEditMode && parsedSelectedDishes[cat._id] 
        ? parsedSelectedDishes[cat._id] 
        : [];
    });
    
    // Set initial data based on edit mode
    if (isEditMode) {
      // In edit mode, use the specific menu data from params
      if (initialMealType === 'lunch') {
        setLunchData({
          menuName: initialMenuName as string || 'Lunch Menu',
          note: initialNote as string || '',
          selectedDishes: { ...initialSelectedDishes },
          mealOptions: { 
            price: parseInt(initialPrice as string || '0') 
          }
        });
      } else if (initialMealType === 'dinner') {
        setDinnerData({
          menuName: initialMenuName as string || 'Dinner Menu',
          note: initialNote as string || '',
          selectedDishes: { ...initialSelectedDishes },
          mealOptions: { 
            price: parseInt(initialPrice as string || '0') 
          }
        });
      }
    } else {
      // In create mode, initialize with default values
      setLunchData(prev => ({
        ...prev,
        selectedDishes: { ...initialSelectedDishes }
      }));
      setDinnerData(prev => ({
        ...prev,
        selectedDishes: { ...initialSelectedDishes }
      }));
    }
    
    // Fetch dishes
    let activeDishes: Dish[] = [];
    
    try {
      const dishesResponse = await api.get(`${DISH_API_URL}/provider/${providerId}`);
      
      if (dishesResponse.data.success && dishesResponse.data.data) {
        dishesResponse.data.data.forEach((categoryGroup: any) => {
          if (categoryGroup.dishes && Array.isArray(categoryGroup.dishes)) {
            categoryGroup.dishes.forEach((dish: any) => {
              let categoryId: string;
              if (typeof categoryGroup.categoryId === 'object' && categoryGroup.categoryId !== null) {
                categoryId = categoryGroup.categoryId._id || categoryGroup.categoryId.toString();
              } else {
                categoryId = categoryGroup.categoryId.toString();
              }

              const dishData: Dish = {
                _id: dish._id?.toString() || Math.random().toString(),
                name: dish.name || 'Unnamed Dish',
                categoryId: categoryId,
                description: dish.description || '',
                isActive: dish.isActive !== false,
                basePrice: dish.basePrice || 0,
                isExtra: dish.isExtra || false
              };
              
              if (dishData.isActive) {
                activeDishes.push(dishData);
              }
            });
          }
        });
      }
    } catch (dishError) {
      console.error('Error fetching dishes:', dishError);
    }

    setDishes(activeDishes);
    setLoading(false);
    
  } catch (error) {
    setError('Failed to load data. Please try again.');
    setLoading(false);
  }
};

  // Get active meal types based on fetched preferences
 const getActiveMealTypes = () => {
  // 🔒 EDIT MODE: show only selected meal
  if (forcedMealType) {
    return MEAL_TYPES.filter(m => m.id === forcedMealType);
  }

  if (!mealPrefs) return [];

  const activeMealTypes = [];

  if (mealPrefs.lunch?.enabled === true) {
    activeMealTypes.push(MEAL_TYPES[0]);
  }

  if (mealPrefs.dinner?.enabled === true) {
    activeMealTypes.push(MEAL_TYPES[1]);
  }

  return activeMealTypes.length > 0 ? activeMealTypes : MEAL_TYPES;
};


  const getDishesByCategoryId = (categoryId: string): Dish[] => {
    return dishes.filter(dish => dish.categoryId === categoryId);
  };

  const handleDayChange = (day: string) => {
    if (day === selectedDay) return;
    setSelectedDay(day);
  };

  const toggleDishSelection = (categoryId: string, dishId: string, mealType: 'lunch' | 'dinner') => {
    if (mealType === 'lunch') {
      setLunchData(prev => ({
        ...prev,
        selectedDishes: {
          ...prev.selectedDishes,
          [categoryId]: prev.selectedDishes[categoryId]?.includes(dishId)
            ? prev.selectedDishes[categoryId].filter(id => id !== dishId)
            : [...(prev.selectedDishes[categoryId] || []), dishId]
        }
      }));
    } else {
      setDinnerData(prev => ({
        ...prev,
        selectedDishes: {
          ...prev.selectedDishes,
          [categoryId]: prev.selectedDishes[categoryId]?.includes(dishId)
            ? prev.selectedDishes[categoryId].filter(id => id !== dishId)
            : [...(prev.selectedDishes[categoryId] || []), dishId]
        }
      }));
    }
  };

  const isDishSelected = (categoryId: string, dishId: string, mealType: 'lunch' | 'dinner') => {
    if (mealType === 'lunch') {
      return lunchData.selectedDishes[categoryId]?.includes(dishId) || false;
    } else {
      return dinnerData.selectedDishes[categoryId]?.includes(dishId) || false;
    }
  };

  const clearSelectedDishes = (mealType: 'lunch' | 'dinner') => {
    const clearedSelectedDishes: SelectedDishes = {};
    categories.forEach((cat: DishCategory) => {
      clearedSelectedDishes[cat._id] = [];
    });
    
    if (mealType === 'lunch') {
      setLunchData(prev => ({
        ...prev,
        selectedDishes: clearedSelectedDishes,
        note: '',
        menuName: 'Lunch Menu'
      }));
    } else {
      setDinnerData(prev => ({
        ...prev,
        selectedDishes: clearedSelectedDishes,
        note: '',
        menuName: 'Dinner Menu'
      }));
    }
  };

  const hasSelectedDishes = (mealType: 'lunch' | 'dinner'): boolean => {
    const selectedDishes = mealType === 'lunch' ? lunchData.selectedDishes : dinnerData.selectedDishes;
    return Object.values(selectedDishes).some(category => 
      category.length > 0
    );
  };

 const saveMenu = async () => {
  const currentData = selectedMealType === 'lunch' ? lunchData : dinnerData;
  
  try {
    if (!hasSelectedDishes(selectedMealType)) {
      Alert.alert('No Dishes Selected', 'Please select at least one dish for the menu.');
      return;
    }

    if (currentData.mealOptions.price <= 0) {
      Alert.alert('Invalid Price', 'Please set a valid price for the menu.');
      return;
    }

    setSaving(true);
    setError(null);
    
    const formattedItems = Object.keys(currentData.selectedDishes)
      .filter(categoryId => currentData.selectedDishes[categoryId].length > 0)
      .map(categoryId => ({
        categoryId,
        dishIds: currentData.selectedDishes[categoryId]
      }));

    // Try sending price at root level AND in mealOptions
 const menuData = {
  providerId,
  day: selectedDay,
  mealType: selectedMealType,
  items: formattedItems,
  note: currentData.note.trim() || undefined,
  name:
    currentData.menuName.trim() ||
    `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}`,

  pricing: {
    price: currentData.mealOptions.price
  },

  specialPricingNote: specialPricingNote.trim() || undefined
};

    console.log('Saving menu data (with price at root):', {
      isEditMode,
      menuId: currentMenuId,
      menuData,
      selectedMealType,
      price: currentData.mealOptions.price
    });

    let response;
    
    if (isEditMode && currentMenuId) {
      response = await api.put(`${MENU_API_URL}`, {
        ...menuData,
        _id: currentMenuId
      });
    } else {
      response = await api.post(`${MENU_API_URL}`, menuData);
    }
    
    console.log('Full API Response:', {
      success: response.data.success,
      data: response.data.data,
      message: response.data.message
    });
    
    if (response.data.success) {
      if (!isEditMode) {
        clearSelectedDishes(selectedMealType);
      }
      
      Alert.alert(
        'Success', 
        `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} menu ${isEditMode ? 'updated' : 'saved'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (isEditMode) {
                // Go back to saved menus
                router.back();
              }
            }
          }
        ]
      );
    } else {
      throw new Error(response.data.message);
    }
  } catch (error: unknown) {
    let errorMessage = 'Failed to save menu';

    if (axios.isAxiosError(error)) {
      console.log('Axios Error Complete:', {
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      errorMessage =
        error.response?.data?.message ||
        error.message ||
        errorMessage;
    }

    setError(errorMessage);
    Alert.alert('Error', errorMessage);
  } finally {
    setSaving(false);
  }
};

const focusNoteInput = (mealType: 'lunch' | 'dinner') => {
  noteInputRefs[mealType].current?.focus();
};


  const getCategoryEmoji = (categoryName: string): string => {
    const emojiMap: Record<string, string> = {
      'roti': '🫓', 'sabji': '🥬', 'vegetable': '🥬', 'rice': '🍚', 
      'dal': '🍲', 'extra': '🍽️', 'dessert': '🍰', 'salad': '🥗', 
      'drink': '🥤', 'soup': '🍵'
    };
    return emojiMap[categoryName.toLowerCase()] || '🍽️';
  };

  const getMealTypeGradient = (): string[] => {
    const gradientMap = {
      'lunch': ['#15803d', '#15803d'],
      'dinner': ['#15803d', '#15803d']
    };
    return gradientMap[selectedMealType] || ['#15803d', '#818cf8'];
  };

  const updateMealPrice = (value: string, mealType: 'lunch' | 'dinner') => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (mealType === 'lunch') {
      setLunchData(prev => ({
        ...prev,
        mealOptions: {
          ...prev.mealOptions,
          price: numericValue ? parseInt(numericValue) : 0
        }
      }));
    } else {
      setDinnerData(prev => ({
        ...prev,
        mealOptions: {
          ...prev.mealOptions,
          price: numericValue ? parseInt(numericValue) : 0
        }
      }));
    }
  };

  const activeMealTypes = getActiveMealTypes();
  const hasMultipleMealTypes = activeMealTypes.length > 1;

  // Render Header with Back Button
  const renderHeader = () => (
    <View style={styles.header}>
      <Text weight='bold' style={styles.headerTitle}>
        {isEditMode ? 'Edit Menu' : 'Create Menu'}
      </Text>

      <View style={styles.headerSpacer} />
    </View>
  );

  // Render Day Selector
  const renderDaySelector = () => {
    return (
      <View style={[styles.daysContainer]}>
        <View style={styles.daysGrid}>
          {DAYS.map((day) => {
            const isActive = day.id === selectedDay;
            
            return (
              <LinearGradient
                key={day.id}
                colors={isActive ? getMealTypeGradient() : ['transparent', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.dayTab, isActive && styles.activeDayTab]}
              >
                <TouchableOpacity
                  style={styles.dayTabContent}
                  onPress={() => handleDayChange(day.id)}
                  activeOpacity={0.9}
                >
                  <Text weight='extraBold' style={[styles.dayText, isActive && styles.activeDayText]}>
                    {day.name}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            );
          })}
        </View>
      </View>
    );
  };

  // Render Meal Type Selector
  const renderMealTypeSelector = () => {
    if (prefsLoading) {
      return (
        <View style={styles.mealTypeTabWrapper}>
          <View style={styles.mealTypeTabContainer}>
            <ActivityIndicator size="small" color="#15803d" />
            <Text weight='bold' style={styles.loadingText}>Loading meal types...</Text>
          </View>
        </View>
      );
    }

    if (!hasMultipleMealTypes) {
      if (activeMealTypes.length === 1) {
        const mealType = activeMealTypes[0];
        return (
          <View style={styles.singleMealHeader}>
            <mealType.icon size={24} color={mealType.color} />
            <Text weight='extraBold' style={styles.singleMealText}>
              {mealType.name} Menu
            </Text>
          </View>
        );
      } else {
        return (
          <View style={styles.singleMealHeader}>
            <Text weight='extraBold' style={styles.singleMealText}>
              No meal types configured
            </Text>
          </View>
        );
      }
    }

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
            {activeMealTypes.map((mealType) => {
              const IconComponent = mealType.icon;
              const isActive = mealType.id === selectedMealType;
              
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
                      key={`${mealType.id}-${isActive}`}
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
  };

  // Render Category for Dish Selection
  const renderCategory = (category: DishCategory, mealType: 'lunch' | 'dinner') => {
    const categoryDishes = getDishesByCategoryId(category._id);
    const gradientColors = getMealTypeGradient();

    const selectedDishNames = dishes
      .filter(dish => {
        const selectedDishes = mealType === 'lunch' ? lunchData.selectedDishes : dinnerData.selectedDishes;
        return selectedDishes[category._id]?.includes(dish._id);
      })
      .map(dish => dish.name);

    return (
      <View key={category._id} style={[styles.categorySection]}>
        <View style={[styles.categoryBorder, { backgroundColor: gradientColors[0] }]} />
        
        <View style={styles.categoryContent}>
          <View style={styles.categoryHeader}>
            <View style={styles.categoryTitleContainer}>
              <Text weight='bold' style={styles.categoryEmoji}>{getCategoryEmoji(category.name)}</Text>
              <Text weight='bold' style={styles.categoryTitle}>
                {category.name} ({categoryDishes.length} dishes)
              </Text>
            </View>
          </View>
          
          {selectedDishNames.length > 0 && (
            <View style={styles.selectedItemsContainer}>
              <Text weight='bold' style={styles.selectedItemsText}>
                Selected: {selectedDishNames.join(', ')}
              </Text>
            </View>
          )}
          
          {categoryDishes.length === 0 ? (
            <Text weight='bold' style={styles.emptyCategory}>No dishes available in this category</Text>
          ) : (
            <View style={styles.dishesContainer}>
              {categoryDishes.map(dish => (
                <TouchableOpacity
                  key={dish._id}
                  style={[
                    styles.dishButton,
                    isDishSelected(category._id, dish._id, mealType) && [styles.selectedDishButton, { backgroundColor: gradientColors[0] }],
                  ]}
                  onPress={() => toggleDishSelection(category._id, dish._id, mealType)}
                >
                  <Text weight='bold' style={[
                    styles.dishText,
                    isDishSelected(category._id, dish._id, mealType) && styles.selectedDishText,
                  ]}>
                    {dish.name}
                  </Text>
                  {isDishSelected(category._id, dish._id, mealType) && (
                    <Check size={16} color="#fff" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  // Render Meal Options Section
const renderMealOptions = (mealType: 'lunch' | 'dinner') => {
  const gradientColors = getMealTypeGradient();
  const currentData = mealType === 'lunch' ? lunchData : dinnerData;
  const totalSelectedDishes = Object.values(currentData.selectedDishes).reduce((acc, curr) => acc + (curr?.length || 0), 0);
  
  return (
    <View style={[styles.mealOptionsContainer, { borderLeftColor: gradientColors[0] }]}>
      <View style={styles.sectionHeader}>
        <View>
          <Text weight='bold' style={styles.sectionTitle}>
            {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Options
          </Text>
          <Text weight='bold' style={styles.sectionSubtitle}>
            {totalSelectedDishes} dishes selected
            {isEditMode && ' • Editing menu price'}
            {!isEditMode && ' • Using meal preference price'}
          </Text>
        </View>
      </View>

      <View style={styles.priceSection}>
        <Text weight='bold' style={styles.priceLabel}>
          Price {isEditMode ? '(Menu Price)' : '(Default Meal Price)'}
        </Text>
        <View style={styles.priceInputContainer}>
          <Text weight='bold' style={[styles.currencySymbol, { color: gradientColors[0] }]}>₹</Text>
          <TextInput
            style={styles.priceInputField}
            value={currentData.mealOptions.price?.toString() || '0'}
            onChangeText={(value) => updateMealPrice(value, mealType)}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
        {/* {!isEditMode && (
          <Text weight='bold' style={styles.priceHint}>
            This price will be used for all menus unless overridden in edit mode
          </Text>
        )} */}
      </View>
    </View>
  );
};

  // Render Menu Name Input
  const renderMenuNameInput = (mealType: 'lunch' | 'dinner') => {
    const currentData = mealType === 'lunch' ? lunchData : dinnerData;
    return (
      <View style={styles.inputContainer}>
        <Text weight='bold' style={styles.inputLabel}>Menu Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter menu name"
          value={currentData.menuName}
          onChangeText={(value) => {
            if (mealType === 'lunch') {
              setLunchData(prev => ({ ...prev, menuName: value }));
            } else {
              setDinnerData(prev => ({ ...prev, menuName: value }));
            }
          }}
        />
      </View>
    );
  };

  // Render Notes Section
  const renderNotesSection = (mealType: 'lunch' | 'dinner') => {
    const currentData = mealType === 'lunch' ? lunchData : dinnerData;
    return (
      <View style={styles.notesContainer}>
        <Text weight='bold' style={styles.notesTitle}>📝 Notes (Optional)</Text>
       
         <TextInput
  ref={noteInputRefs[mealType]}
  style={styles.notesInput}
  onFocus={(e) => scrollToInput(e.target)}
  placeholder="E.g., 'Special paneer today!'"
  value={currentData.note}
  onChangeText={(value) => {
    mealType === 'lunch'
      ? setLunchData(prev => ({ ...prev, note: value }))
      : setDinnerData(prev => ({ ...prev, note: value }));
  }}
  multiline
  textAlignVertical="top"
  scrollEnabled={false}
  blurOnSubmit={false}
/>
      </View>
    );
  };

  // Show loading while preferences are loading
  if (prefsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text weight='bold' style={styles.loadingText}>Loading meal preferences...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text weight='bold' style={styles.loadingText}>Loading menu creator...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text weight='bold' style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: getMealTypeGradient()[0] }]}
          onPress={fetchStaticData}
        >
          <Text weight='bold' style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View  style={styles.container}>
      {/* <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      > */}
        {/* Header */}
        {/* {renderHeader()} */}
        
        {/* Fixed Day Tabs */}
        {renderDaySelector()}
        
        {/* Meal Type Selector */}
        {renderMealTypeSelector()}
        
        {/* Conditional Content Area */}
        {hasMultipleMealTypes ? (
          /* Swipeable Content Area */
          <Animated.ScrollView
            ref={horizontalScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={handleScrollEnd}
            scrollEventThrottle={16}
            style={styles.horizontalScrollView}
            contentContainerStyle={styles.horizontalScrollContent}
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="center"
          >
            {/* Lunch Page */}
            <View style={styles.pageContainer}>
<KeyboardAwareScrollView
  enableOnAndroid
  enableAutomaticScroll
  keyboardOpeningTime={0}
  keyboardShouldPersistTaps="handled"
  extraScrollHeight={120}
  extraHeight={120}
  contentContainerStyle={{
    
  }}
>



                {renderMenuNameInput('lunch')}
                {renderMealOptions('lunch')}
                {categories.map(category => renderCategory(category, 'lunch'))}
                {renderNotesSection('lunch')}
                <View style={styles.bottomSpacer} />
              </KeyboardAwareScrollView>
            </View>
            
            {/* Dinner Page */}
            <View style={styles.pageContainer}>
          <KeyboardAwareScrollView
  enableOnAndroid
  enableAutomaticScroll
  keyboardOpeningTime={0}
  keyboardShouldPersistTaps="handled"
  extraScrollHeight={120}
  extraHeight={120}
  contentContainerStyle={{
    
  }}
>


                {renderMenuNameInput('dinner')}
                {renderMealOptions('dinner')}
                {categories.map(category => renderCategory(category, 'dinner'))}
                {renderNotesSection('dinner')}
                <View style={styles.bottomSpacer} />
              </KeyboardAwareScrollView>
            </View>
          </Animated.ScrollView>
        ) : (
          /* Single meal type view */
          <View style={styles.singleMealContainer}>
           <KeyboardAwareScrollView
  ref={selectedMealType === 'lunch' ? verticalScrollViewRefs.lunch : verticalScrollViewRefs.dinner}
  style={styles.verticalScrollView}
  contentContainerStyle={[
    styles.scrollContainer, // 👈 space for fixed Save button
  ]}
  enableOnAndroid
  enableAutomaticScroll
  keyboardOpeningTime={0}
  extraScrollHeight={120}
  extraHeight={120}
  showsVerticalScrollIndicator={false}
  keyboardShouldPersistTaps="handled"
>

              {renderMenuNameInput(selectedMealType)}
              {renderMealOptions(selectedMealType)}
              {categories.map(category => renderCategory(category, selectedMealType))}
              {renderNotesSection(selectedMealType)}
              <View style={styles.bottomSpacer} />
            </KeyboardAwareScrollView>
          </View>
        )}
        
        {/* Fixed Save Button */}
        {!isKeyboardVisible && (
         <View
  style={[
    styles.fixedButtonContainer,
    {
       paddingBottom:
              insets.bottom + (Platform.OS === 'android' ? 0 : 0),
    },
  ]}
>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getMealTypeGradient()[0] }, (!hasSelectedDishes(selectedMealType) || saving) && styles.disabledButton]}
              onPress={saveMenu}
              disabled={!hasSelectedDishes(selectedMealType) || saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text weight='bold' style={styles.buttonText}>
                  {isEditMode ? 'Update' : 'Save'} {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      {/* </KeyboardAvoidingView> */}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  headerSpacer: {
    width: 40,
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
    marginTop: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Fixed Day Tabs
  daysContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.3)',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTab: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 2,
    minHeight: 50,
    overflow: 'hidden',
  },
  dayTabContent: {
    flex: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  activeDayTab: {
    shadowColor: '#2c95f8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    transform: [{ translateY: -2 }],
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  activeDayText: {
    color: '#fff',
  },
  // Meal Type Tabs
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
  },
  mealTypeTabText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 2,
  },
  // Swipeable Content Area
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    width: Dimensions.get('window').width * 2,
  },
  pageContainer: {
    width: Dimensions.get('window').width,
    flex: 1,
    
  },
  verticalScrollView: {
    flex: 1,
    
  },
  scrollContainer: {
    paddingHorizontal: 4,
    flexGrow: 1,
    paddingBottom: 220
  },
  // Form Elements
  inputContainer: {
    marginBottom: 16,
    marginTop: 17,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  mealOptionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  priceInputField: {
    flex: 1,
    padding: 8,
    fontSize: 14,
  },
  categorySection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    position: 'relative',
    overflow: 'hidden',
  },
  categoryBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '140%',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  categoryContent: {
    marginLeft: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  selectedItemsContainer: {
    backgroundColor: '#F0F9FF',
    borderColor: '#E0F2FE',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedItemsText: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCategory: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  dishesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  selectedDishButton: {
    backgroundColor: '#15803d',
  },
  dishText: {
    color: '#1E293B',
    fontWeight: '600',
    fontSize: 14,
  },
  selectedDishText: {
    color: '#fff',
  },
  checkIcon: {
    marginLeft: 6,
  },
  notesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: Platform.OS === 'ios'? 0:90,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  notesInputTouchable: {},
  notesInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  bottomSpacer: {
    height: 50,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    zIndex: 1000,
    elevation: 1000,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    bottom: 20,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  singleMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
    gap: 10,
  },
  singleMealText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  singleMealContainer: {
    flex: 1,
  },
});

export default DailyMenuScreen;