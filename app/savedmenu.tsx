import axios from 'axios';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  Dimensions,
  Animated,
  Pressable,
  Platform,
  TextInput
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from 'expo-router';
import { Plus, Copy, Edit, Trash2, ChevronDown, ChevronUp, Sun, Moon, Utensils, X, Send, IndianRupee, Info } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from './store/hooks';
import { Text } from '@/components/ztext';
import { API_URL } from './config/env';
import { BlurView } from 'expo-blur';

const API_BASE_URL = `${API_URL}/api`;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const { width, height } = Dimensions.get('window');

interface DishItem {
  _id: string;
  name: string;
  description: string;
  categoryId: string;
  isActive: boolean;
}

interface CategoryItem {
  _id: string;
  name: string;
  isDefault: boolean;
}

interface MenuItem {
  categoryId: string;
  dishIds: string[];
}

interface Menu {
  _id: string;
  day: string;
  mealType: 'lunch' | 'dinner';
  items: MenuItem[];
  note: string;
  name: string;
  isActive: boolean;
  providerId: string;
  createdAt: string;
  updatedAt: string;
  pricing?: {
    price: number;
    isSpecialPrice: boolean;
    originalPrice: number;
  };
  isSentToday?: boolean;
}

interface MenuWithPopulatedData extends Omit<Menu, 'items'> {
  items: (MenuItem & {
    categoryName?: string;
    dishNames?: string[];
  })[];
}

interface MenuItemWithIds {
  categoryId: string;
  dishIds: string[];
}

const MEAL_TYPES = [
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#15803d' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#15803d' }
];

// Memoized MenuCard Component
const MenuCard = React.memo(({ 
  item, 
  onPreview, 
  onDuplicate, 
  onEdit, 
  onDelete 
}: { 
  item: MenuWithPopulatedData;
  onPreview: (menu: MenuWithPopulatedData) => void;
  onDuplicate: (menu: MenuWithPopulatedData) => void;
  onEdit: (menu: MenuWithPopulatedData) => void;
  onDelete: (menu: MenuWithPopulatedData) => void;
}) => {
  const MealTypeIcon = item.mealType === 'lunch' ? Sun : Moon;
  const mealTypeColor = '#15803d';
  
  return (
    <TouchableOpacity 
      style={[styles.menuCard, { borderLeftColor: mealTypeColor }]}
      onPress={() => onPreview(item)}
      activeOpacity={0.7}
    >
      <View style={styles.menuHeader}>
        <View style={styles.mealTypeRow}>
          <View style={styles.mealTypeBadge}>
            <MealTypeIcon size={14} color={mealTypeColor} />
            <Text weight='extraBold' style={[styles.mealTypeText, { color: mealTypeColor }]}>
              {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
            </Text>
          </View>
          {item.pricing && (
            <View style={styles.priceContainer}>
              <IndianRupee size={12} color="#10B981" />
              <Text weight='bold' style={styles.menuPrice}>{item.pricing.price}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.menuInfo}>
        <Text weight='bold' style={styles.menuName}>{item.name || 'Unnamed Menu'}</Text>
        <Text weight='bold' style={styles.menuDay}>
          {item.day.charAt(0).toUpperCase() + item.day.slice(1)}
        </Text>
      </View>
      
      <View style={styles.menuItems}>
        {item.items && item.items.map((categoryItem, index) => {
          if (!categoryItem || !categoryItem.dishNames || categoryItem.dishNames.length === 0) return null;
          
          return (
            <View key={`${item._id}-category-${index}`} style={styles.menuCategory}>
              <Text weight='extraBold' style={styles.categoryLabel}>
                {categoryItem.categoryName?.toUpperCase() || 'CATEGORY'}:
              </Text>
              <Text weight='bold' style={styles.categoryItems}>
                {categoryItem.dishNames.join(', ')}
              </Text>
            </View>
          );
        })}
        
        {(!item.items || item.items.length === 0 || item.items.every(item => !item.dishNames || item.dishNames.length === 0)) && (
          <Text weight='bold' style={styles.noDishesText}>No dishes selected</Text>
        )}
      </View>
      
      {item.note && (
        <View style={styles.specialNotes}>
          <Text weight='bold' style={styles.specialNotesText}>📝 {item.note}</Text>
        </View>
      )}

      <View style={styles.menuActions}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]} 
          onPress={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
        >
          <Edit size={16} color="#15803d" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.deleteBtn]} 
          onPress={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const SavedMenusScreen: React.FC = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Single state for all data
  const [combinedData, setCombinedData] = useState<{
    menus: MenuWithPopulatedData[];
    categories: CategoryItem[];
    dishes: DishItem[];
    todaySentMenus: {[key: string]: boolean};
    preferences: any;
  }>({
    menus: [],
    categories: [],
    dishes: [],
    todaySentMenus: {},
    preferences: null
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI State
  const [selectedMenu, setSelectedMenu] = useState<MenuWithPopulatedData | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isPreviewModalVisible, setIsPreviewModalVisible] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'all' | 'lunch' | 'dinner'>('all');
  const [selectedFilter, setSelectedFilter] = useState<'all' | string>('all');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [showMealTabs, setShowMealTabs] = useState<boolean>(true);
  
  // Edit Modal State
  const [editMenuName, setEditMenuName] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [editItems, setEditItems] = useState<MenuItemWithIds[]>([]);
  const [editPrice, setEditPrice] = useState<number | null>(null);
  const [editOriginalPrice, setEditOriginalPrice] = useState<number | null>(null);
  const [isSpecialPrice, setIsSpecialPrice] = useState<boolean>(false);
  const [isDishLoading, setIsDishLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // Overlay animation
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;

  // Navigation setup
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Reset expanded states when component unmounts
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setExpandedDays({});
        setExpandedCategories({});
      };
    }, [])
  );

  // Single API call to fetch all data
  const fetchCombinedData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/combine/menu/combined-data?providerId=${providerId}`);
      const result = await response.json();
      
      if (result.success) {
        setCombinedData({
          menus: result.menus || [],
          categories: result.categories || [],
          dishes: result.dishes || [],
          todaySentMenus: result.todaySentMenus || {},
          preferences: result.preferences || null
        });
        
        // Set meal preferences
        if (result.preferences) {
          const lunchEnabled = result.preferences.lunch?.enabled === true;
          const dinnerEnabled = result.preferences.dinner?.enabled === true;
          setShowMealTabs(lunchEnabled && dinnerEnabled);
          
          // Set default selected meal type
          if (!lunchEnabled && dinnerEnabled) {
            setSelectedMealType('dinner');
          } else if (lunchEnabled && !dinnerEnabled) {
            setSelectedMealType('lunch');
          }
        }
        setError(null);
      } else {
        setError(result.message || 'Failed to load data');
      }
    } catch (error: any) {
      setError('Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [providerId]);

  // Initial load
  useEffect(() => {
    if (!providerId) {
      router.push('/login');
      return;
    }
    fetchCombinedData();
  }, [providerId, fetchCombinedData]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      
      const refreshData = async () => {
        if (isActive && providerId) {
          await fetchCombinedData(true);
        }
      };
      
      refreshData();
      
      return () => {
        isActive = false;
      };
    }, [fetchCombinedData, providerId])
  );

  // Memoized calculations
  const availableMealTypes = useMemo(() => {
    if (!combinedData.preferences) return MEAL_TYPES;
    
    const available = [];
    if (combinedData.preferences.lunch?.enabled === true) {
      available.push({ id: 'lunch', name: 'Lunch', icon: Sun, color: '#15803d' });
    }
    if (combinedData.preferences.dinner?.enabled === true) {
      available.push({ id: 'dinner', name: 'Dinner', icon: Moon, color: '#15803d' });
    }
    
    return available.length > 0 ? available : MEAL_TYPES;
  }, [combinedData.preferences]);

  const groupedMenus = useMemo(() => {
    return combinedData.menus.reduce((acc, menu) => {
      if (!menu || !menu.day) return acc;
      
      const dayKey = menu.day;
      if (!acc[dayKey]) {
        acc[dayKey] = { lunch: [], dinner: [] };
      }
      
      if (menu.mealType === 'lunch') {
        acc[dayKey].lunch.push(menu);
      } else if (menu.mealType === 'dinner') {
        acc[dayKey].dinner.push(menu);
      }
      
      return acc;
    }, {} as Record<string, { lunch: MenuWithPopulatedData[], dinner: MenuWithPopulatedData[] }>);
  }, [combinedData.menus]);

  const { totalMenus, lunchMenus, dinnerMenus } = useMemo(() => {
    const total = combinedData.menus.length;
    const lunch = combinedData.menus.filter(menu => menu.mealType === 'lunch').length;
    const dinner = combinedData.menus.filter(menu => menu.mealType === 'dinner').length;
    
    return { totalMenus: total, lunchMenus: lunch, dinnerMenus: dinner };
  }, [combinedData.menus]);

  const daysToShow = useMemo(() => {
    if (selectedFilter === 'all') {
      return DAYS.filter(day => groupedMenus[day] && (
        groupedMenus[day].lunch.length > 0 || 
        groupedMenus[day].dinner.length > 0
      ));
    }
    return [selectedFilter];
  }, [selectedFilter, groupedMenus]);

  // Edit Modal Handlers
  const setupEditModal = useCallback((menu: MenuWithPopulatedData) => {
    if (!menu) return;
    
    setSelectedMenu(menu);
    setEditMenuName(menu.name || '');
    setSpecialNotes(menu.note || '');
    
    // Set price fields
    if (menu.pricing) {
      setEditPrice(menu.pricing.price);
      setEditOriginalPrice(menu.pricing.originalPrice);
      setIsSpecialPrice(menu.pricing.isSpecialPrice || false);
    } else {
      setEditPrice(null);
      setEditOriginalPrice(null);
      setIsSpecialPrice(false);
    }
    
    const editItemsData: MenuItemWithIds[] = (menu.items || []).map(item => {
      if (!item) return null;
      
      return {
        categoryId: item.categoryId,
        dishIds: item.dishIds || []
      };
    }).filter(item => item !== null && item.categoryId) as MenuItemWithIds[];
    
    setEditItems(editItemsData);
    
    // Auto-expand categories with selected dishes
    const initialExpanded: Record<string, boolean> = {};
    editItemsData.forEach(item => {
      if (item.dishIds.length > 0) {
        initialExpanded[item.categoryId] = true;
      }
    });
    setExpandedCategories(initialExpanded);
    
    setIsEditModalVisible(true);
  }, []);

  const handleUpdateMenu = useCallback(async () => {
    if (!selectedMenu) return;
    
    try {
      const menuData: any = {
        _id: selectedMenu._id,
        items: editItems,
        note: specialNotes,
        name: editMenuName,
        providerId: selectedMenu.providerId,
        day: selectedMenu.day,
        mealType: selectedMenu.mealType
      };

      // Add pricing if price is provided
      if (editPrice !== null && editPrice > 0) {
        menuData.pricing = {
          price: editPrice,
          originalPrice: editOriginalPrice || editPrice,
          isSpecialPrice: isSpecialPrice
        };
      }

      const response = await axios.put(`${API_BASE_URL}/menu`, menuData);
      
      if (response.data.success) {
        setIsEditModalVisible(false);
        
        // Update local state with pricing
        setCombinedData(prev => ({
          ...prev,
          menus: prev.menus.map(m => 
            m._id === selectedMenu._id 
              ? { 
                  ...m, 
                  name: editMenuName,
                  note: specialNotes,
                  items: m.items.map(item => ({
                    ...item,
                    dishIds: editItems.find(ei => ei.categoryId === item.categoryId)?.dishIds || item.dishIds
                  })),
                  pricing: editPrice !== null ? {
                    price: editPrice,
                    originalPrice: editOriginalPrice || editPrice,
                    isSpecialPrice: isSpecialPrice
                  } : undefined
                }
              : m
          )
        }));
        
        Alert.alert('Success', 'Menu updated successfully');
      } else {
        throw new Error(response.data.message || 'Failed to update menu');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update menu');
    }
  }, [selectedMenu, editItems, editMenuName, specialNotes, editPrice, editOriginalPrice, isSpecialPrice]);

  const getDishesForCategory = useCallback((categoryId: string) => {
    if (!categoryId || !combinedData.dishes || combinedData.dishes.length === 0) return [];
    return combinedData.dishes.filter(dish => dish.categoryId === categoryId && dish.isActive);
  }, [combinedData.dishes]);

  // Category toggle handler
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  }, []);

  // Handlers
  const handleDelete = useCallback(async () => {
    if (!selectedMenu) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/menu/${selectedMenu._id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsDeleteModalVisible(false);
        setSelectedMenu(null);
        
        // Update local state
        setCombinedData(prev => ({
          ...prev,
          menus: prev.menus.filter(menu => menu._id !== selectedMenu._id)
        }));
        
        Alert.alert('Success', 'Menu deleted successfully!');
      } else {
        throw new Error(result.message || 'Failed to delete menu');
      }
    } catch (error) {
      console.error('Error deleting menu:', error);
      Alert.alert('Error', 'Failed to delete menu');
    }
  }, [selectedMenu]);

  const handleDuplicate = useCallback(async (day: string) => {
    if (!selectedMenu) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/menu/${selectedMenu._id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: day,
          mealType: selectedMenu.mealType,
          name: `Copy of ${selectedMenu.name}`
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setIsDuplicateModalVisible(false);
        setSelectedMenu(null);
        
        // Refresh data
        await fetchCombinedData();
        
        Alert.alert('Success', 'Menu duplicated successfully!');
      } else {
        throw new Error(result.message || 'Failed to duplicate menu');
      }
    } catch (error) {
      console.error('Error duplicating menu:', error);
      Alert.alert('Error', 'Failed to duplicate menu');
    }
  }, [selectedMenu, fetchCombinedData]);

  const toggleDay = useCallback((day: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  }, []);

  const renderMenuCard = useCallback(({ item }: { item: MenuWithPopulatedData }) => (
    <MenuCard
      item={item}
      onPreview={(menu) => {
        setSelectedMenu(menu);
        setIsPreviewModalVisible(true);
      }}
      onDuplicate={(menu) => {
        setSelectedMenu(menu);
        setIsDuplicateModalVisible(true);
      }}
      onEdit={setupEditModal}
      onDelete={(menu) => {
        setSelectedMenu(menu);
        setIsDeleteModalVisible(true);
      }}
    />
  ), [setupEditModal]);

  const DayAccordion = useCallback(({ 
    day, 
    dayMenus 
  }: { 
    day: string;
    dayMenus: { lunch: MenuWithPopulatedData[], dinner: MenuWithPopulatedData[] };
  }) => {
    const isExpanded = expandedDays[day] || false;
    const dayName = day ? day.charAt(0).toUpperCase() + day.slice(1) : 'Unknown Day';
    const lunchCount = dayMenus.lunch.length;
    const dinnerCount = dayMenus.dinner.length;
  
     // Get counts based on selected filter
  const getVisibleCount = () => {
    if (selectedMealType === 'all') {
      return lunchCount + dinnerCount;
    } else if (selectedMealType === 'lunch') {
      return lunchCount;
    } else if (selectedMealType === 'dinner') {
      return dinnerCount;
    }
    return 0;
  };
    const filteredLunchMenus = selectedMealType === 'all' || selectedMealType === 'lunch' ? dayMenus.lunch : [];
    const filteredDinnerMenus = selectedMealType === 'all' || selectedMealType === 'dinner' ? dayMenus.dinner : [];
    const hasVisibleMenus = filteredLunchMenus.length > 0 || filteredDinnerMenus.length > 0;
    
    if (!hasVisibleMenus) return null;

  return (
    <View style={styles.dayAccordion}>
      <TouchableOpacity 
        style={[styles.dayHeader, isExpanded && styles.dayHeaderExpanded]}
        onPress={() => toggleDay(day)}
        activeOpacity={0.7}
      >
        <View>
          <Text weight='bold' style={styles.dayTitle}>{dayName}</Text>
          <View style={styles.dayStats}>
            {/* Show total count badge */}
            <View style={styles.totalCountBadge}>
              <Text weight='bold' style={styles.totalCountText}>{getVisibleCount()} menus</Text>
            </View>
            
            {/* Conditionally show meal type counts based on filter */}
            {selectedMealType === 'all' && (
              <>
                {lunchCount > 0 && (
                  <View style={styles.mealTypeCount}>
                    <Sun size={12} color="#15803d" />
                    <Text weight='bold' style={styles.mealTypeCountText}>{lunchCount}</Text>
                  </View>
                )}
                {dinnerCount > 0 && (
                  <View style={styles.mealTypeCount}>
                    <Moon size={12} color="#15803d" />
                    <Text weight='bold' style={styles.mealTypeCountText}>{dinnerCount}</Text>
                  </View>
                )}
              </>
            )}
            
            {selectedMealType === 'lunch' && lunchCount > 0 && (
              <View style={styles.mealTypeCount}>
                <Sun size={12} color="#15803d" />
                <Text weight='bold' style={styles.mealTypeCountText}>{lunchCount} lunch</Text>
              </View>
            )}
            
            {selectedMealType === 'dinner' && dinnerCount > 0 && (
              <View style={styles.mealTypeCount}>
                <Moon size={12} color="#15803d" />
                <Text weight='bold' style={styles.mealTypeCountText}>{dinnerCount} dinner</Text>
              </View>
            )}
            
            {/* Show "0 count" when filtered meal type has no menus */}
            {selectedMealType === 'lunch' && lunchCount === 0 && (
              <View style={styles.zeroCount}>
                <Sun size={12} color="#94A3B8" />
                <Text weight='bold' style={styles.zeroCountText}>0 lunch</Text>
              </View>
            )}
            
            {selectedMealType === 'dinner' && dinnerCount === 0 && (
              <View style={styles.zeroCount}>
                <Moon size={12} color="#94A3B8" />
                <Text weight='bold' style={styles.zeroCountText}>0 dinner</Text>
              </View>
            )}
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#64748B" />
        ) : (
          <ChevronDown size={20} color="#64748B" />
        )}
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.dayContent}>
          {filteredLunchMenus.length > 0 && combinedData.preferences?.lunch?.enabled !== false && (
            <View style={styles.mealTypeSection}>
              <View style={[styles.mealTypeHeader, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <View style={styles.mealTypeHeaderLeft}>
                  <Sun size={18} color="#15803d" />
                  <Text weight='bold' style={[styles.mealTypeHeaderText, { color: '#15803d' }]}>
                    Lunch ({filteredLunchMenus.length})
                  </Text>
                </View>
              </View>
              
              <View style={styles.mealTypeContent}>
                {filteredLunchMenus.map(menu => (
                  <View key={menu._id} style={styles.mealTypeMenuCard}>
                    {renderMenuCard({ item: menu })}
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {filteredDinnerMenus.length > 0 && combinedData.preferences?.dinner?.enabled !== false && (
            <View style={styles.mealTypeSection}>
              <View style={[styles.mealTypeHeader, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                <View style={styles.mealTypeHeaderLeft}>
                  <Moon size={18} color="#15803d" />
                  <Text weight='bold' style={[styles.mealTypeHeaderText, { color: '#15803d' }]}>
                    Dinner ({filteredDinnerMenus.length})
                  </Text>
                </View>
              </View>
              
              <View style={styles.mealTypeContent}>
                {filteredDinnerMenus.map(menu => (
                  <View key={menu._id} style={styles.mealTypeMenuCard}>
                    {renderMenuCard({ item: menu })}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}, [expandedDays, selectedMealType, combinedData.preferences, toggleDay, renderMenuCard]);
  // Overlay animation
  useEffect(() => {
    if (isPreviewModalVisible) {
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
  }, [isPreviewModalVisible]);

  const closePreviewOverlay = () => {
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
      setIsPreviewModalVisible(false);
      setSelectedMenu(null);
    });
  };

  // Calculate selected dish count
  const totalSelectedDishes = useMemo(() => {
    return editItems.reduce((total, item) => total + item.dishIds.length, 0);
  }, [editItems]);

  // Render loading
  if (loading && combinedData.menus.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text weight='bold' style={styles.loadingText}>Loading menus...</Text>
      </View>
    );
  }

  // Render error
  if (error && combinedData.menus.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text weight='bold' style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchCombinedData()}
        >
          <Text weight='bold' style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container]}>
      {/* Meal Type Filter */}
      {showMealTabs && (
        <View style={styles.mealTypeFilter}>
          <TouchableOpacity
            style={[
              styles.mealTypeFilterBtn,
              selectedMealType === 'all' && styles.mealTypeFilterBtnActive
            ]}
            onPress={() => setSelectedMealType('all')}
          >
            <Text weight='extraBold' style={[
              styles.mealTypeFilterText,
              selectedMealType === 'all' && styles.mealTypeFilterTextActive
            ]}>
              All ({totalMenus})
            </Text>
          </TouchableOpacity>
          
          {availableMealTypes.map(mealType => {
            const isLunch = mealType.id === 'lunch';
            const isActive = selectedMealType === mealType.id;
            const mealCount = isLunch ? lunchMenus : dinnerMenus;
            const IconComponent = mealType.icon;
            
            return (
              <TouchableOpacity
                key={mealType.id}
                style={[
                  styles.mealTypeFilterBtn,
                  isActive && [styles.mealTypeFilterBtnActive, { backgroundColor: mealType.color }]
                ]}
                onPress={() => setSelectedMealType(mealType.id as 'lunch' | 'dinner')}
              >
                <IconComponent size={16} color={isActive ? '#fff' : mealType.color} />
                <Text weight='bold' style={[
                  styles.mealTypeFilterText,
                  isActive && styles.mealTypeFilterTextActive
                ]}>
                  {mealType.name} ({mealCount})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Day Filter */}
      <View style={styles.dayFilter}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={DAYS}
          keyExtractor={(day) => day}
          renderItem={({ item: day, index }) => {
            const dayMenus = groupedMenus[day];
            const count = dayMenus ? dayMenus.lunch.length + dayMenus.dinner.length : 0;
            const isSelected = selectedFilter === day;
            
            if (selectedFilter === 'all' && count === 0) return null;
            
            return (
              <TouchableOpacity
                style={[
                  styles.dayFilterBtn,
                  isSelected && styles.dayFilterBtnActive
                ]}
                onPress={() => setSelectedFilter(isSelected ? 'all' : day)}
              >
                <Text weight='bold' style={[
                  styles.dayFilterText,
                  isSelected && styles.dayFilterTextActive
                ]}>
                  {DAY_NAMES[index].slice(0, 3)}
                </Text>
                {count > 0 && (
                  <View style={styles.dayCountBadge}>
                    <Text weight='bold' style={[styles.dayCountText,isSelected && styles.daycountTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.dayFilterList}
        />
      </View>

      {/* Main Content */}
      <FlatList
        data={daysToShow}
        keyExtractor={(day) => day}
        renderItem={({ item: day }) => (
          <DayAccordion
            day={day}
            dayMenus={groupedMenus[day] || { lunch: [], dinner: [] }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text weight='bold' style={styles.emptyTitle}>No Menus Found</Text>
            <Text weight='bold' style={styles.emptySubtitle}>Create your first weekly menu to get started</Text>
            <TouchableOpacity
              style={styles.createMenuBtn}
              onPress={() => router.push('/menu')}
            >
              <Plus size={18} color="#fff" />
              <Text weight='bold' style={styles.createMenuBtnText}>Create New Menu</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCombinedData(true)}
            colors={['#15803d']}
          />
        }
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={7}
      />

      {/* Delete Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text weight='bold' style={styles.modalTitle}>Delete Menu</Text>
            <Text weight='bold' style={styles.modalText}>
              Are you sure you want to delete "{selectedMenu?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text weight='bold' style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text weight='bold' style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        visible={isDuplicateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDuplicateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text weight='bold' style={styles.modalTitle}>Duplicate "{selectedMenu?.name}"</Text>
            <Text weight='bold' style={styles.modalText}>
              Select a day to duplicate this menu to:
            </Text>
            
            <ScrollView style={styles.dayPicker}>
              {DAYS.map((day, index) => (
                day !== selectedMenu?.day && (
                  <TouchableOpacity
                    key={day}
                    style={styles.dayOption}
                    onPress={() => handleDuplicate(day)}
                  >
                    <Text weight='bold' style={styles.dayOptionText}>
                      {DAY_NAMES[index]}
                    </Text>
                  </TouchableOpacity>
                )
              ))}
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDuplicateModalVisible(false)}
              >
                <Text weight='bold' style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal - COMPACT VERSION */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text weight='bold' style={styles.modalTitle}>Edit Menu</Text>
              <TouchableOpacity 
                onPress={() => setIsEditModalVisible(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.editModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {isDishLoading ? (
                <ActivityIndicator size="large" color="#15803d" style={styles.loader} />
              ) : (
                <>
                  {/* Basic Information - COMPACT */}
                  <View style={styles.section}>
                    <Text weight='bold' style={styles.sectionLabel}>Menu Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editMenuName}
                      onChangeText={setEditMenuName}
                      placeholder="Enter menu name"
                      maxLength={50}
                    />
                    
                    <Text weight='bold' style={[styles.sectionLabel, { marginTop: 12 }]}>Special Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={specialNotes}
                      onChangeText={setSpecialNotes}
                      placeholder="Add notes (optional)"
                      multiline
                      numberOfLines={2}
                    />
                  </View>

                  {/* Price Section - COMPACT */}
                  <View style={styles.section}>
                    <Text weight='bold' style={styles.sectionLabel}>Price</Text>
                    <View style={styles.priceInputWrapper}>
                      <View style={styles.currencyBadge}>
                        <IndianRupee size={16} color="#15803d" />
                      </View>
                      <TextInput
                        style={styles.priceInput}
                        value={editPrice !== null ? editPrice.toString() : ''}
                        onChangeText={(text) => {
                          const value = text === '' ? null : parseFloat(text);
                          if (value === null || (!isNaN(value) && value >= 0)) {
                            setEditPrice(value);
                          }
                        }}
                        placeholder="0"
                        keyboardType="numeric"
                        maxLength={6}
                      />
                    </View>
                    <Text style={styles.originalPriceText}>
                      Original: ₹{editOriginalPrice || editPrice || 0}
                    </Text>
                  </View>

                  {/* Dish Selection - COMPACT */}
                  <View style={styles.section}>
                    <View style={styles.dishSectionHeader}>
                      <Text weight='bold' style={styles.sectionLabel}>Dishes ({totalSelectedDishes} selected)</Text>
                    </View>

                    {combinedData.categories.length === 0 ? (
                      <View style={styles.emptyStateCard}>
                        <Utensils size={24} color="#94A3B8" />
                        <Text style={styles.emptyStateText}>No categories available</Text>
                      </View>
                    ) : (
                      <View style={styles.categoriesContainer}>
                        {combinedData.categories.map(category => {
                          const categoryDishes = getDishesForCategory(category._id);
                          const categoryEditItem = editItems.find(item => item.categoryId === category._id);
                          const selectedCount = categoryEditItem ? categoryEditItem.dishIds.length : 0;
                          const isExpanded = expandedCategories[category._id] || false;

                          if (categoryDishes.length === 0) return null;

                          return (
                            <View key={category._id} style={styles.categoryItem}>
                              <TouchableOpacity
                                style={styles.categoryHeader}
                                onPress={() => toggleCategory(category._id)}
                                activeOpacity={0.7}
                              >
                                <Text weight='bold' style={styles.categoryName}>
                                  {category.name}
                                </Text>
                                <View style={styles.categoryInfo}>
                                  <View style={styles.countBadge}>
                                    <Text style={styles.countText}>{selectedCount}</Text>
                                  </View>
                                  {isExpanded ? (
                                    <ChevronUp size={16} color="#64748B" />
                                  ) : (
                                    <ChevronDown size={16} color="#64748B" />
                                  )}
                                </View>
                              </TouchableOpacity>

                              {isExpanded && (
                                <View style={styles.dishesContainer}>
                                  <View style={styles.dishGrid}>
                                    {categoryDishes.map(dish => {
                                      const isSelected = categoryEditItem ? 
                                        categoryEditItem.dishIds.includes(dish._id) : false;
                                      
                                      return (
                                        <TouchableOpacity
                                          key={dish._id}
                                          style={[
                                            styles.dishChip,
                                            isSelected && styles.dishChipSelected
                                          ]}
                                          onPress={() => {
                                            const newEditItems = [...editItems];
                                            const categoryIndex = newEditItems.findIndex(
                                              item => item.categoryId === category._id
                                            );
                                            
                                            if (categoryIndex === -1) {
                                              newEditItems.push({
                                                categoryId: category._id,
                                                dishIds: [dish._id]
                                              });
                                            } else {
                                              const currentDishIds = newEditItems[categoryIndex].dishIds;
                                              
                                              if (currentDishIds.includes(dish._id)) {
                                                newEditItems[categoryIndex].dishIds = currentDishIds.filter(
                                                  id => id !== dish._id
                                                );
                                                
                                                if (newEditItems[categoryIndex].dishIds.length === 0) {
                                                  newEditItems.splice(categoryIndex, 1);
                                                }
                                              } else {
                                                newEditItems[categoryIndex].dishIds = [...currentDishIds, dish._id];
                                              }
                                            }
                                            
                                            setEditItems(newEditItems);
                                          }}
                                          activeOpacity={0.6}
                                        >
                                          <Text
                                            style={[
                                              styles.dishChipText,
                                              isSelected && styles.dishChipTextSelected
                                            ]}
                                            numberOfLines={1}
                                          >
                                            {dish.name}
                                          </Text>
                                          {isSelected && (
                                            <View style={styles.selectedIndicator}>
                                              <Text style={styles.selectedIndicatorText}>✓</Text>
                                            </View>
                                          )}
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                  
                                  {categoryDishes.length > 2 && (
                                    <TouchableOpacity
                                      style={styles.selectAllButton}
                                      onPress={() => {
                                        const newEditItems = [...editItems];
                                        const categoryIndex = newEditItems.findIndex(
                                          item => item.categoryId === category._id
                                        );
                                        
                                        if (selectedCount === categoryDishes.length) {
                                          // Deselect all
                                          if (categoryIndex !== -1) {
                                            newEditItems.splice(categoryIndex, 1);
                                          }
                                        } else {
                                          // Select all
                                          if (categoryIndex === -1) {
                                            newEditItems.push({
                                              categoryId: category._id,
                                              dishIds: categoryDishes.map(dish => dish._id)
                                            });
                                          } else {
                                            newEditItems[categoryIndex].dishIds = categoryDishes.map(dish => dish._id);
                                          }
                                        }
                                        
                                        setEditItems(newEditItems);
                                      }}
                                    >
                                      <Text style={styles.selectAllText}>
                                        {selectedCount === categoryDishes.length ? 'Deselect All' : 'Select All'}
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text weight='bold' style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleUpdateMenu}
              >
                <Text weight='bold' style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      {selectedMenu && (
        <Modal
          visible={isPreviewModalVisible}
          animationType="none"
          transparent={true}
          onRequestClose={closePreviewOverlay}
          statusBarTranslucent
        >
          <BlurView intensity={30} tint="default" style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.overlayBackground, { opacity: overlayOpacity }]}>
              <Pressable style={styles.overlayPressable} onPress={closePreviewOverlay}>
                <View style={styles.overlayContainer}>
                  <Animated.View style={styles.centeredCardContainer}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                      <Animated.View style={[styles.overlayMenuCard, { 
                        transform: [{ scale: cardScale }], 
                        opacity: overlayOpacity 
                      }]}>
                        <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={false}>
                          <View style={styles.menuHeader}>
                            <View style={styles.menuTitleContainer}>
                              <Text weight='bold' style={styles.overlayMenuName}>
                                {selectedMenu.name}
                              </Text>
                              <View style={styles.overlayMenuMeta}>
                                <Text style={styles.overlayMenuDay}>
                                  {selectedMenu.day.charAt(0).toUpperCase() + selectedMenu.day.slice(1)}
                                </Text>
                                <Text style={styles.overlayMenuType}>
                                  • {selectedMenu.mealType.charAt(0).toUpperCase() + selectedMenu.mealType.slice(1)}
                                </Text>
                                {selectedMenu.pricing && (
                                  <Text style={styles.overlayMenuPrice}>
                                    • ₹{selectedMenu.pricing.price}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </View>
                          
                          <View style={styles.overlayMenuItems}>
                            {selectedMenu.items.map((item, index) => (
                              <View key={`${selectedMenu._id}-${index}`} style={styles.overlayMenuItem}>
                                <Text weight='bold' style={styles.overlayMenuItemCategory}>
                                  {item.categoryName}
                                </Text>
                                <Text style={styles.overlayMenuItemDishes}>
                                  {item.dishNames?.join(', ')}
                                </Text>
                              </View>
                            ))}
                          </View>
                          
                          {selectedMenu.note && (
                            <View style={styles.overlayNotes}>
                              <Text style={styles.overlayNotesText}>📝 {selectedMenu.note}</Text>
                            </View>
                          )}
                        </ScrollView>
                      </Animated.View>
                    </Pressable>
                  </Animated.View>
                </View>
              </Pressable>
            </Animated.View>
          </BlurView>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // paddingTop:130,
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // Meal Type Filter
  mealTypeFilter: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  mealTypeFilterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
    gap: 6,
  },
  mealTypeFilterBtnActive: {
    backgroundColor: '#15803d',
  },
  mealTypeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  mealTypeFilterTextActive: {
    color: '#fff',
  },
  // Day Filter
  dayFilter: {
    marginBottom: 10,
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayFilterList: {
    paddingHorizontal: 12,
  },
  dayFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayFilterBtnActive: {
    backgroundColor: '#15803d',
  },
  dayFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  dayFilterTextActive: {
    color: '#fff',
  },
  daycountTextActive: {
    color: '#fff',

  },
  dayCountBadge: {
    backgroundColor: 'rgba(242, 240, 240, 0.19)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dayCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  // Scroll Container
  scrollContainer: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  // Day Accordion Styles
  dayAccordion: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dayHeader: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dayStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    alignItems:'center',
    flexWrap:'wrap',
  },
    totalCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
   totalCountText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  mealTypeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(21, 128, 61, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.2)',
  },
   mealTypeCountText: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
    zeroCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
   zeroCountText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  dayContent: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  mealTypeSection: {
    marginBottom: 16,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom:12,
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  mealTypeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealTypeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  mealTypeContent: {
    paddingHorizontal: 8,
  },
  mealTypeMenuCard: {
    marginBottom: 8,
  },
  // Menu Card Styles
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    borderLeftWidth: 4,
  },
  menuHeader: {
    marginBottom: 12,
  },
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  menuInfo: {
    flex: 1,
    marginBottom: 12,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  menuDay: {
    fontSize: 12,
    color: '#64748b',
  },
  menuPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  menuItems: {
    marginBottom: 12,
  },
  menuCategory: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryLabel: {
    fontWeight: '600',
    color: '#333',
    fontSize: 12,
    minWidth: 80,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  categoryItems: {
    color: '#475569',
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  specialNotes: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#15803d',
  },
  specialNotesText: {
    color: '#d97706',
    fontSize: 13,
  },
  menuActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  // Modal Styles
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
    marginBottom: 13,
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
    paddingHorizontal: 50,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#afb1b4ff',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  cancelButtonText: {
    color: '#fdfdfeff',
    fontWeight: '600',
    fontSize: 16,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  // Duplicate Modal
  dayPicker: {
    marginBottom: 24,
    maxHeight: 300,
  },
  dayOption: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayOptionText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  // Loading and Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748b',
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
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  createMenuBtn: {
    backgroundColor: '#15803d',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createMenuBtnText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  // Instagram Style Overlay
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
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(253, 250, 250, 0.3)',
    borderRadius: 20,
  },
  centeredCardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  overlayMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: width - 40,
    maxWidth: 500,
    maxHeight: height * 0.7,
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
    marginBottom: 8,
  },
  overlayMenuMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 4,
  },
  overlayMenuDay: {
    fontSize: 14,
    color: '#64748B',
  },
  overlayMenuType: {
    fontSize: 14,
    color: '#15803d',
    fontWeight: '600',
  },
  overlayMenuPrice: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  overlayMenuItems: {
    marginBottom: 16,
  },
  overlayMenuItem: {
    marginBottom: 12,
  },
  overlayMenuItemCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  overlayMenuItemDishes: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  overlayNotes: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  overlayNotesText: {
    fontSize: 14,
    color: '#92400E',
    fontStyle: 'italic',
  },
  noDishesText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  // Edit Modal Styles - COMPACT VERSION
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  editModalScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  loader: {
    padding: 30,
  },
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dishSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  // Inputs
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    color: '#1E293B',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  // Price Input
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 8,
  },
  currencyBadge: {
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
  },
  originalPriceText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
  },
  // Categories & Dishes
  categoriesContainer: {
    gap: 8,
  },
  categoryItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  categoryName: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    backgroundColor: '#15803d',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  dishesContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dishGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  dishChipSelected: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  dishChipText: {
    fontSize: 13,
    color: '#475569',
    maxWidth: 100,
  },
  dishChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  selectedIndicator: {
    backgroundColor: '#fff',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    fontSize: 9,
    color: '#15803d',
    fontWeight: 'bold',
  },
  selectAllButton: {
    alignSelf: 'flex-end',
  },
  selectAllText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '500',
  },
  // Empty State
  emptyStateCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  // Action Buttons
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom:20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    backgroundColor: '#15803d',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SavedMenusScreen;