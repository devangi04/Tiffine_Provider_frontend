import axios from 'axios';
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  FlatList
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { Plus, Copy, Edit, Trash2, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppSelector } from './store/hooks';
import { Text } from '@/components/ztext';
import { API_URL } from './config/env';

const API_BASE_URL = `${API_URL}/api`;
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#DA291C' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#DA291C' }
];

// Memoized Components
const MenuCard = memo(({ 
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
  const mealTypeColor = '#DA291C';
  
  return (
    <TouchableOpacity 
      style={[styles.menuCard, { borderLeftColor: mealTypeColor }]}
      onPress={() => onPreview(item)}
    >
      <View style={styles.menuHeader}>
        <View style={styles.mealTypeBadge}>
          <MealTypeIcon size={14} color={mealTypeColor} />
          <Text weight='bold' style={[styles.mealTypeText, { color: mealTypeColor }]}>
            {item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1)}
          </Text>
        </View>
        {item.pricing && (
          <Text weight='bold' style={styles.menuPrice}>₹{item.pricing.price}</Text>
        )}
      </View>
      
      <View style={styles.menuInfo}>
        <Text weight='bold' style={styles.menuName}>{item.name || 'Unnamed Menu'}</Text>
        <Text weight='bold' style={styles.menuTime}>
          {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown time'}
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
          style={[styles.actionBtn, styles.duplicateBtn]} 
          onPress={(e) => {
            e.stopPropagation();
            onDuplicate(item);
          }}
        >
          <Copy size={16} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.editBtn]} 
          onPress={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
        >
          <Edit size={16} color="#DA291C" />
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

const MealTypeFilter = memo(({ 
  selectedMealType, 
  onSelectMealType,
  availableMealTypes,
  totalMenus,
  lunchMenus,
  dinnerMenus
}: { 
  selectedMealType: 'all' | 'lunch' | 'dinner';
  onSelectMealType: (type: 'all' | 'lunch' | 'dinner') => void;
  availableMealTypes: any[];
  totalMenus: number;
  lunchMenus: number;
  dinnerMenus: number;
}) => {
  if (availableMealTypes.length <= 1) return null;

  return (
    <View style={styles.mealTypeFilter}>
      <TouchableOpacity
        style={[
          styles.mealTypeFilterBtn,
          selectedMealType === 'all' && styles.mealTypeFilterBtnActive
        ]}
        onPress={() => onSelectMealType('all')}
      >
        <Text weight='bold' style={[
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
            onPress={() => onSelectMealType(mealType.id as 'lunch' | 'dinner')}
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
  );
});

const DayAccordion = memo(({ 
  day, 
  dayMenus, 
  isExpanded, 
  onToggle,
  selectedMealType,
  mealPrefs,
  renderMenuCard 
}: { 
  day: string;
  dayMenus: { lunch: MenuWithPopulatedData[], dinner: MenuWithPopulatedData[] };
  isExpanded: boolean;
  onToggle: () => void;
  selectedMealType: 'all' | 'lunch' | 'dinner';
  mealPrefs: any;
  renderMenuCard: any;
}) => {
  const mealExpanded = { lunch: false, dinner: false }; // Simplified - you can manage this state if needed
  const dayName = day ? day.charAt(0).toUpperCase() + day.slice(1) : 'Unknown Day';
  const lunchCount = dayMenus.lunch.length;
  const dinnerCount = dayMenus.dinner.length;
  
  const filteredLunchMenus = selectedMealType === 'all' || selectedMealType === 'lunch' ? dayMenus.lunch : [];
  const filteredDinnerMenus = selectedMealType === 'all' || selectedMealType === 'dinner' ? dayMenus.dinner : [];
  const hasVisibleMenus = filteredLunchMenus.length > 0 || filteredDinnerMenus.length > 0;
  
  if (!hasVisibleMenus) return null;

  return (
    <View style={styles.dayAccordion}>
      <TouchableOpacity 
        style={[styles.dayHeader, isExpanded && styles.dayHeaderExpanded]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View>
          <Text weight='bold' style={styles.dayTitle}>{dayName}</Text>
          <View style={styles.dayStats}>
            {lunchCount > 0 && (
              <View style={styles.mealTypeCount}>
                <Sun size={12} color="#DA291C" />
                <Text weight='bold' style={styles.mealTypeCountText}>{lunchCount} Lunch</Text>
              </View>
            )}
            {dinnerCount > 0 && (
              <View style={styles.mealTypeCount}>
                <Moon size={12} color="#DA291C" />
                <Text weight='bold' style={styles.mealTypeCountText}>{dinnerCount} Dinner</Text>
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
          {filteredLunchMenus.length > 0 && mealPrefs?.lunch?.enabled !== false && (
            <View style={styles.mealTypeSection}>
              <View style={[styles.mealTypeHeader, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <View style={styles.mealTypeHeaderLeft}>
                  <Sun size={18} color="#DA291C" />
                  <Text weight='bold' style={[styles.mealTypeHeaderText, { color: '#DA291C' }]}>
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
          
          {filteredDinnerMenus.length > 0 && mealPrefs?.dinner?.enabled !== false && (
            <View style={styles.mealTypeSection}>
              <View style={[styles.mealTypeHeader, { backgroundColor: 'rgba(79, 70, 229, 0.1)' }]}>
                <View style={styles.mealTypeHeaderLeft}>
                  <Moon size={18} color="#DA291C" />
                  <Text weight='bold' style={[styles.mealTypeHeaderText, { color: '#DA291C' }]}>
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
});

const SavedMenusScreen: React.FC = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();
  const navigation = useNavigation();
  
  // State Management
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
    menus: [] as MenuWithPopulatedData[],
    allDishes: [] as DishItem[],
    allCategories: [] as CategoryItem[],
    mealPrefs: null as any,
    hasMultipleMealTypes: true
  });
  
  const [uiState, setUiState] = useState({
    selectedMenu: null as MenuWithPopulatedData | null,
    isDeleteModalVisible: false,
    isDuplicateModalVisible: false,
    isEditModalVisible: false,
    isPreviewModalVisible: false,
    newDay: '',
    specialNotes: '',
    editItems: [] as MenuItemWithIds[],
    editMenuName: '',
    selectedFilter: 'all',
    isDropdownOpen: false,
    selectedMealType: 'all' as 'all' | 'lunch' | 'dinner',
    expandedDays: {} as Record<string, boolean>
  });
  
  // Navigation setup
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Main data fetch
  useEffect(() => {
    if (!providerId) {
      router.push('/login');
      return;
    }

    fetchAllData();
  }, [providerId]);

  // Optimized data fetching
  const fetchAllData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Fetch all data in parallel
      const [prefsResponse, menusResponse, categoriesResponse, dishesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/Provider/preferences`, {
          headers: { Authorization: `Bearer ${providerId}` }
        }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_BASE_URL}/menu?providerId=${providerId}&isActive=true`).catch(() => ({ data: { menus: [] } })),
        axios.get(`${API_BASE_URL}/category/provider/${providerId}`).catch(() => ({ data: { success: false, data: [] } })),
        axios.get(`${API_BASE_URL}/dish/provider/${providerId}`).catch(() => ({ data: { success: false, data: [] } }))
      ]);
      
      // Process data efficiently
      const mealService = prefsResponse.data.success ? prefsResponse.data.data.mealService : {
        lunch: { enabled: true },
        dinner: { enabled: true }
      };
      
      const hasMultipleMealTypes = !!(mealService?.lunch?.enabled && mealService?.dinner?.enabled);
      
      // Process menus
      let activeMenus: MenuWithPopulatedData[] = [];
      if (menusResponse.data.menus) {
        activeMenus = menusResponse.data.menus
          .filter((menu: Menu) => menu && menu.isActive)
          .sort((a: Menu, b: Menu) => 
            DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
      
      // Process categories
      const categories = categoriesResponse.data.success ? categoriesResponse.data.data : [];
      
      // Process dishes efficiently
      let dishes: DishItem[] = [];
      if (dishesResponse.data.success && dishesResponse.data.data) {
        dishesResponse.data.data.forEach((categoryData: any) => {
          if (categoryData.categoryId && categoryData.dishes) {
            categoryData.dishes.forEach((dish: any) => {
              if (dish && dish._id && dish.isActive !== false) {
                dishes.push({
                  _id: dish._id,
                  name: dish.name || 'Unnamed Dish',
                  description: dish.description || '',
                  categoryId: categoryData.categoryId,
                  isActive: dish.isActive !== false
                });
              }
            });
          }
        });
      }
      
      // Update state once
      setState({
        loading: false,
        error: null,
        menus: activeMenus,
        allDishes: dishes,
        allCategories: categories,
        mealPrefs: mealService,
        hasMultipleMealTypes
      });
      
      // Initialize UI state
      if (activeMenus.length > 0) {
        const firstDay = activeMenus[0].day;
        setUiState(prev => ({
          ...prev,
          selectedMealType: !hasMultipleMealTypes ? 
            (mealService?.lunch?.enabled ? 'lunch' : 'dinner') : 'all',
          expandedDays: { [firstDay]: true }
        }));
      }
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load data. Please try again.'
      }));
    }
  };

  // Memoized calculations
  const processedMenus = useMemo(() => {
    if (!state.menus.length || !state.allCategories.length || !state.allDishes.length) {
      return state.menus;
    }
    
    // Create lookup maps for faster access
    const categoryMap = new Map(state.allCategories.map(cat => [cat._id, cat.name]));
    const dishMap = new Map(state.allDishes.map(dish => [dish._id, dish.name]));
    
    return state.menus.map(menu => ({
      ...menu,
      items: menu.items.map(item => ({
        ...item,
        categoryName: categoryMap.get(item.categoryId) || '',
        dishNames: item.dishIds
          .map(id => dishMap.get(id))
          .filter(Boolean) as string[]
      }))
    }));
  }, [state.menus, state.allCategories, state.allDishes]);

  const groupedMenus = useMemo(() => {
    return processedMenus.reduce((acc, menu) => {
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
  }, [processedMenus]);

  const availableMealTypes = useMemo(() => {
    if (!state.mealPrefs) return MEAL_TYPES;
    
    const available = [];
    if (state.mealPrefs.lunch?.enabled === true) {
      available.push({ id: 'lunch', name: 'Lunch', icon: Sun, color: '#DA291C' });
    }
    if (state.mealPrefs.dinner?.enabled === true) {
      available.push({ id: 'dinner', name: 'Dinner', icon: Moon, color: '#DA291C' });
    }
    
    return available.length > 0 ? available : MEAL_TYPES;
  }, [state.mealPrefs]);

  const { totalMenus, lunchMenus, dinnerMenus } = useMemo(() => {
    const total = processedMenus.length;
    const lunch = processedMenus.filter(menu => menu.mealType === 'lunch').length;
    const dinner = processedMenus.filter(menu => menu.mealType === 'dinner').length;
    
    return { totalMenus: total, lunchMenus: lunch, dinnerMenus: dinner };
  }, [processedMenus]);

  // Memoized handlers
  const handleRefresh = useCallback(() => {
    fetchAllData();
  }, [providerId]);

  const handleDuplicate = useCallback(async (day: string) => {
    if (!uiState.selectedMenu) return;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/menu/${uiState.selectedMenu._id}/duplicate`, 
        { 
          day: day,
          name: `Copy of ${uiState.editMenuName || uiState.selectedMenu.name || 'Menu'}`,
          mealType: uiState.selectedMenu.mealType
        }
      );
      
      if (response.data.success) {
        setUiState(prev => ({ ...prev, isDuplicateModalVisible: false, newDay: day }));
        fetchAllData();
        Alert.alert('Success', 'Menu duplicated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate menu');
    }
  }, [uiState.selectedMenu, uiState.editMenuName]);

  const handleDelete = useCallback(async () => {
    if (!uiState.selectedMenu) return;
    try {
      await axios.delete(`${API_BASE_URL}/menu/${uiState.selectedMenu._id}`);
      setUiState(prev => ({ ...prev, isDeleteModalVisible: false }));
      fetchAllData();
      Alert.alert('Success', 'Menu deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete menu');
    }
  }, [uiState.selectedMenu]);

  const handleEdit = useCallback((menu: MenuWithPopulatedData) => {
    const editItemsData: MenuItemWithIds[] = (menu.items || []).map(item => ({
      categoryId: item.categoryId,
      dishIds: item.dishIds || []
    })).filter(item => item.categoryId);
    
    setUiState(prev => ({
      ...prev,
      selectedMenu: menu,
      editMenuName: menu.name || '',
      specialNotes: menu.note || '',
      editItems: editItemsData,
      isEditModalVisible: true
    }));
  }, []);

  const handleUpdateMenu = useCallback(async () => {
    if (!uiState.selectedMenu) return;
    try {
      await axios.put(`${API_BASE_URL}/menu`, {
        _id: uiState.selectedMenu._id,
        items: uiState.editItems,
        note: uiState.specialNotes,
        name: uiState.editMenuName,
        providerId: uiState.selectedMenu.providerId,
        day: uiState.selectedMenu.day,
        mealType: uiState.selectedMenu.mealType
      });
      setUiState(prev => ({ ...prev, isEditModalVisible: false }));
      fetchAllData();
      Alert.alert('Success', 'Menu updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update menu');
    }
  }, [uiState.selectedMenu, uiState.editItems, uiState.specialNotes, uiState.editMenuName]);

  // Memoized render functions
  const renderMenuCard = useCallback(({ item }: { item: MenuWithPopulatedData }) => (
    <MenuCard
      item={item}
      onPreview={(menu) => setUiState(prev => ({ ...prev, selectedMenu: menu, isPreviewModalVisible: true }))}
      onDuplicate={(menu) => setUiState(prev => ({ ...prev, selectedMenu: menu, isDuplicateModalVisible: true }))}
      onEdit={handleEdit}
      onDelete={(menu) => setUiState(prev => ({ ...prev, selectedMenu: menu, isDeleteModalVisible: true }))}
    />
  ), [handleEdit]);

  const toggleDay = useCallback((day: string) => {
    setUiState(prev => ({
      ...prev,
      expandedDays: {
        ...prev.expandedDays,
        [day]: !prev.expandedDays[day]
      }
    }));
  }, []);

  // Render loading
  if (state.loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text weight='bold' style={styles.loadingText}>Loading menus...</Text>
      </View>
    );
  }

  // Render error
  if (state.error) {
    return (
      <View style={styles.errorContainer}>
        <Text weight='bold' style={styles.errorText}>{state.error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchAllData}
        >
          <Text weight='bold' style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Filter days to show
  const daysToShow = uiState.selectedFilter === 'all' 
    ? DAYS.filter(day => groupedMenus[day] && (
        groupedMenus[day].lunch.length > 0 || 
        groupedMenus[day].dinner.length > 0
      ))
    : [uiState.selectedFilter];

  return (
    <View style={styles.container}>
      {/* Show meal type filter only if multiple types available */}
      {state.hasMultipleMealTypes && (
        <MealTypeFilter
          selectedMealType={uiState.selectedMealType}
          onSelectMealType={(type) => setUiState(prev => ({ ...prev, selectedMealType: type }))}
          availableMealTypes={availableMealTypes}
          totalMenus={totalMenus}
          lunchMenus={lunchMenus}
          dinnerMenus={dinnerMenus}
        />
      )}

      {/* Day filter dropdown */}
      {uiState.selectedMealType === 'all' && (
        <View style={styles.dropdownContainer}>
          <TouchableOpacity 
            style={styles.dropdownToggle}
            onPress={() => setUiState(prev => ({ ...prev, isDropdownOpen: !prev.isDropdownOpen }))}
          >
            <View style={styles.dropdownToggleInner}>
              <Text weight='bold' style={styles.dropdownToggleText}>
                {uiState.selectedFilter === 'all' ? 'All Days' : DAY_NAMES[DAYS.indexOf(uiState.selectedFilter)]}
              </Text>
              <Text weight='bold' style={styles.dayCount}>
                {uiState.selectedFilter === 'all' ? totalMenus : 
                 groupedMenus[uiState.selectedFilter] ? 
                 groupedMenus[uiState.selectedFilter].lunch.length + groupedMenus[uiState.selectedFilter].dinner.length : 0}
              </Text>
            </View>
          </TouchableOpacity>
          
          {uiState.isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity
                style={[styles.dropdownItem, uiState.selectedFilter === 'all' && styles.activeDropdownItem]}
                onPress={() => setUiState(prev => ({ ...prev, selectedFilter: 'all', isDropdownOpen: false }))}
              >
                <Text weight='bold' style={styles.dropdownItemText}>All Days</Text>
                <Text weight='bold' style={styles.dayCount}>{totalMenus}</Text>
              </TouchableOpacity>
              
              {DAYS.map((day, index) => {
                const dayMenus = groupedMenus[day];
                const count = dayMenus ? dayMenus.lunch.length + dayMenus.dinner.length : 0;
                if (count > 0) {
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dropdownItem, uiState.selectedFilter === day && styles.activeDropdownItem]}
                      onPress={() => setUiState(prev => ({ ...prev, selectedFilter: day, isDropdownOpen: false }))}
                    >
                      <Text weight='bold' style={styles.dropdownItemText}>{DAY_NAMES[index]}</Text>
                      <Text weight='bold' style={styles.dayCount}>{count}</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })}
            </View>
          )}
        </View>
      )}

      {/* Main content */}
      <FlatList
        data={daysToShow}
        keyExtractor={(day) => day}
        renderItem={({ item: day }) => (
          <DayAccordion
            day={day}
            dayMenus={groupedMenus[day] || { lunch: [], dinner: [] }}
            isExpanded={!!uiState.expandedDays[day]}
            onToggle={() => toggleDay(day)}
            selectedMealType={uiState.selectedMealType}
            mealPrefs={state.mealPrefs}
            renderMenuCard={renderMenuCard}
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
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      {/* Delete Modal */}
      <Modal
        visible={uiState.isDeleteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUiState(prev => ({ ...prev, isDeleteModalVisible: false }))}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text weight='bold' style={styles.modalTitle}>Delete Menu</Text>
            <Text weight='bold' style={styles.modalText}>
              Are you sure you want to delete this menu? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setUiState(prev => ({ ...prev, isDeleteModalVisible: false }))}
              >
                <Text weight='bold' style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Text weight='bold' style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Modal */}
      <Modal
        visible={uiState.isDuplicateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUiState(prev => ({ ...prev, isDuplicateModalVisible: false }))}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text weight='bold' style={styles.modalTitle}>Select Day to Duplicate To</Text>
            
            <View style={styles.dayPicker}>
              {DAYS.map((day, index) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayOption,
                    uiState.newDay === day && styles.selectedDayOption
                  ]}
                  onPress={() => handleDuplicate(day)}
                >
                  <Text weight='bold' style={[
                    styles.dayOptionText,
                    uiState.newDay === day && styles.selectedDayOptionText
                  ]}>
                    {DAY_NAMES[index]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancellButton]}
                onPress={() => setUiState(prev => ({ ...prev, isDuplicateModalVisible: false }))}
              >
                <Text weight='bold' style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Modal - Simplified for performance */}
      {uiState.selectedMenu && (
        <Modal
          visible={uiState.isPreviewModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setUiState(prev => ({ ...prev, isPreviewModalVisible: false }))}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text weight='bold' style={styles.modalTitle}>Menu Preview</Text>
                <TouchableOpacity 
                  onPress={() => setUiState(prev => ({ ...prev, isPreviewModalVisible: false }))}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.previewModalScroll}>
                <Text weight='bold' style={styles.previewMenuName}>{uiState.selectedMenu.name}</Text>
                <Text weight='bold' style={styles.previewDay}>
                  {uiState.selectedMenu.day} - {uiState.selectedMenu.mealType}
                </Text>
                
                {uiState.selectedMenu.pricing && (
                  <Text weight='bold' style={styles.previewPrice}>₹{uiState.selectedMenu.pricing.price}</Text>
                )}
                
                {uiState.selectedMenu.note && (
                  <Text weight='bold' style={styles.previewNoteText}>{uiState.selectedMenu.note}</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  // Meal Type Filter Styles
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
    backgroundColor: '#DA291C',
  },
  mealTypeFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  mealTypeFilterTextActive: {
    color: '#fff',
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
  },
  mealTypeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mealTypeCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
    borderRadius: 12,
    justifyContent: 'space-between',
  },
  mealTypeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealTypeHeaderText: {
    fontSize: 16,
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
    marginTop: 2,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    borderLeftWidth: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  menuTime: {
    fontSize: 12,
    color: '#64748b',
  },
  menuPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 4,
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
    borderLeftColor: '#DA291C',
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
  duplicateBtn: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  editBtn: {
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  deleteBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  // Dropdown Styles
  dropdownContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 8,
    marginBottom: 8,
    zIndex: 10,
    backgroundColor: '#F8FAFC',
  },
  dropdownToggle: {
    backgroundColor: 'rgba(120, 142, 253, 0.11)',
    borderRadius: 14,
    padding: 14,
  },
  dropdownToggleInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownToggleText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dayCount: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
  },
  dropdownMenu: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 14,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  activeDropdownItem: {
    backgroundColor: 'rgba(85, 95, 184, 0.1)',
    borderRadius: 14,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#64748b',
  },
  previewModalScroll: {
    paddingVertical: 16,
  },
  // Duplicate Modal
  dayPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dayOption: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedDayOption: {
    backgroundColor: '#DA291C',
    borderColor: '#DA291C',
  },
  dayOptionText: {
    color: '#64748b',
    fontWeight: '500',
  },
  selectedDayOptionText: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancellButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: "100%",
    alignItems: 'center',
    backgroundColor: '#b5b7b9ff',
  },
  cancelButton: {
    backgroundColor: '#b5b7b9ff',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontWeight: '600',
    fontSize: 14,
    color: 'white',
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
    backgroundColor: '#DA291C',
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
    backgroundColor: '#DA291C',
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
  // Preview Modal Styles
  previewMenuName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  previewDay: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 16,
  },
  previewPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 16,
  },
  previewNoteText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  noDishesText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});

export default SavedMenusScreen;