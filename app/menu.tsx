import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
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
  Modal
} from 'react-native';
import { Check, X, Edit2, Sun, Moon } from 'lucide-react-native';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';
import { useAppSelector } from './store/hooks';
import { KeyboardAwareScrollView } from '@/components/scrollable/KeyboardAwareScrollView';
import { LinearGradient } from 'expo-linear-gradient';
import {Text,TextStyles} from '@/components/ztext';
import { API_URL } from './config/env';

const API_BASE_URL = `${API_URL}/api`;
const DISH_API_URL = `${API_URL}/api/dish`;
const CATEGORY_API_URL = `${API_URL}/api/category`;
const MENU_API_URL = `${API_URL}/api/menu`;
const PROVIDER_API_URL = `${API_URL}/api/provider`;


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
  { id: 'lunch', name: 'Lunch', icon: Sun, color: '#DA291C' },
  { id: 'dinner', name: 'Dinner', icon: Moon, color: '#DA291C' }
];

const DailyMenuScreen: React.FC = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const mealPreferences = useAppSelector((state) => state.mealPreferences.preferences?.mealService);

  const router = useRouter();
  const { day } = useLocalSearchParams(); 
  const todayIndex = new Date().getDay();
  const today = DAYS[todayIndex === 0 ? 6 : todayIndex - 1].id;
  
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<SelectedDishes>({});
  const [menuName, setMenuName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [isNoteFocused, setIsNoteFocused] = useState<boolean>(false);
  
  const [mealOptions, setMealOptions] = useState<MealOptions>({
    price: 0
  });
  
  const [isSpecialPricing, setIsSpecialPricing] = useState<boolean>(false);
  const [specialPricingNote, setSpecialPricingNote] = useState<string>('');
  const [showPricingModal, setShowPricingModal] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const noteInputRef = useRef<TextInput>(null);
  const navigation = useNavigation();

  // Fetch meal preferences
  const [mealPrefs, setMealPrefs] = useState<any>(null);
  const [prefsLoading, setPrefsLoading] = useState<boolean>(true);

  // Fetch meal preferences on component mount
  useEffect(() => {
    fetchMealPreferences();
  }, []);

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
        
        // Determine which meal types are enabled
        const lunchEnabled = mealService?.lunch?.enabled === true;
        const dinnerEnabled = mealService?.dinner?.enabled === true;
        
        // Set default meal type based on preferences
        if (lunchEnabled && !dinnerEnabled) {
          setSelectedMealType('lunch');
        } else if (!lunchEnabled && dinnerEnabled) {
          setSelectedMealType('dinner');
        } else if (!lunchEnabled && !dinnerEnabled) {
          // If neither is enabled, default to lunch
          setSelectedMealType('lunch');
        }
      } else {
        // Default to showing both if API fails
        setMealPrefs({
          lunch: { enabled: true },
          dinner: { enabled: true }
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      // Default to showing both if API fails
      setMealPrefs({
        lunch: { enabled: true },
        dinner: { enabled: true }
      });
    } finally {
      setPrefsLoading(false);
    }
  };

  // Get active meal types based on fetched preferences
  const getActiveMealTypes = () => {
    if (!mealPrefs) {
      return []; // Return empty array while loading
    }
    
    const activeMealTypes = [];
    
    if (mealPrefs.lunch?.enabled === true) {
      activeMealTypes.push(MEAL_TYPES[0]); // lunch
    }
    
    if (mealPrefs.dinner?.enabled === true) {
      activeMealTypes.push(MEAL_TYPES[1]); // dinner
    }
    
    // If no preferences or both disabled, show both by default
    if (activeMealTypes.length === 0) {
      return MEAL_TYPES;
    }
    
    return activeMealTypes;
  };

  const activeMealTypes = getActiveMealTypes();
  const hasMultipleMealTypes = activeMealTypes.length > 1;
  
  // Auto-select the only available meal type
  useEffect(() => {
    if (!hasMultipleMealTypes && activeMealTypes.length === 1) {
      setSelectedMealType(activeMealTypes[0].id as 'lunch' | 'dinner');
    }
  }, [mealPrefs]);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Load static data only once
  useEffect(() => {
    if (!providerId) {
      router.push('/');
      return;
    }

    if (!prefsLoading) {
      fetchStaticData();
      fetchProviderPreferencesForMealType(selectedMealType);
    }
  }, [providerId, prefsLoading, selectedMealType]);

  const fetchProviderPreferencesForMealType = async (mealType: 'lunch' | 'dinner') => {
    try {
      const response = await axios.get(`${PROVIDER_API_URL}/preferences`, {
        headers: { Authorization: `Bearer ${provider.token}` }
      });
      
      if (response.data.success) {
        const prefs = response.data.data.mealService;
        const currentMealPrefs = prefs[mealType] || {
          price: 0
        };
        
        setMealOptions({
          price: currentMealPrefs.price || 0
        });

        setMenuName(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Menu`);
      }
    } catch (error) {
      // Set default values on error
      setMealOptions({ price: 0 });
      setMenuName(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Menu`);
    }
  };

  const fetchStaticData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch categories
      const categoriesResponse = await axios.get(`${CATEGORY_API_URL}/provider/${providerId}`);
      const activeCategories = categoriesResponse.data.data.filter((cat: DishCategory) => cat.isActive);
      
      activeCategories.sort((a: DishCategory, b: DishCategory) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        return a.name.localeCompare(b.name);
      });
      
      setCategories(activeCategories);
      
      // Initialize selected dishes with empty arrays
      const initialSelectedDishes: SelectedDishes = {};
      activeCategories.forEach((cat: DishCategory) => {
        initialSelectedDishes[cat._id] = [];
      });
      setSelectedDishes(initialSelectedDishes);
      
      // Fetch dishes
      let activeDishes: Dish[] = [];
      
      try {
        const dishesResponse = await axios.get(`${DISH_API_URL}/provider/${providerId}`);
        
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
        console.error('Dish fetch error:', dishError);
      }

      setDishes(activeDishes);
      setLoading(false);
      
    } catch (error) {
      setError('Failed to load data. Please try again.');
      setLoading(false);
    }
  };

  const getDishesByCategoryId = (categoryId: string): Dish[] => {
    return dishes.filter(dish => dish.categoryId === categoryId);
  };

  const handleDayChange = (day: string) => {
    if (day === selectedDay) return;
    setSelectedDay(day);
  };

  const handleMealTypeChange = (mealType: 'lunch' | 'dinner') => {
    if (mealType === selectedMealType) return;
    
    setSelectedMealType(mealType);
    setMenuName(`${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Menu`);
    fetchProviderPreferencesForMealType(mealType);
  };

  const toggleDishSelection = (categoryId: string, dishId: string) => {
    setSelectedDishes(prev => ({
      ...prev,
      [categoryId]: prev[categoryId]?.includes(dishId)
        ? prev[categoryId].filter(id => id !== dishId)
        : [...(prev[categoryId] || []), dishId]
    }));
  };

  const isDishSelected = (categoryId: string, dishId: string) => {
    return selectedDishes[categoryId]?.includes(dishId) || false;
  };

  const clearSelectedDishes = () => {
    const clearedSelectedDishes: SelectedDishes = {};
    categories.forEach((cat: DishCategory) => {
      clearedSelectedDishes[cat._id] = [];
    });
    setSelectedDishes(clearedSelectedDishes);
    setNote('');
    setMenuName(`${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu`);
    setIsSpecialPricing(false);
    setSpecialPricingNote('');
  };

  const hasSelectedDishes = (): boolean => {
    return Object.values(selectedDishes).some(category => 
      category.length > 0
    );
  };

  const saveMenu = async () => {
    try {
      if (!hasSelectedDishes()) {
        Alert.alert('No Dishes Selected', 'Please select at least one dish for the menu.');
        return;
      }

      if (mealOptions.price <= 0) {
        Alert.alert('Invalid Price', 'Please set a valid price for the menu.');
        return;
      }

      setSaving(true);
      setError(null);
      
      const formattedItems = Object.keys(selectedDishes)
        .filter(categoryId => selectedDishes[categoryId].length > 0)
        .map(categoryId => ({
          categoryId,
          dishIds: selectedDishes[categoryId]
        }));

      const menuData = {
        providerId,
        day: selectedDay,
        mealType: selectedMealType,
        items: formattedItems,
        note: note.trim() || undefined,
        name: menuName.trim() || `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu`,
        mealOptions: {
          price: mealOptions.price
        },
        isSpecialPricing: isSpecialPricing,
        specialPricingNote: specialPricingNote.trim() || undefined
      };

      const response = await axios.post(`${MENU_API_URL}`, menuData);
      
      if (response.data.success) {
        clearSelectedDishes();
        Alert.alert('Success', `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} menu saved successfully!`);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || error.message 
        : 'Failed to save menu';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const focusNoteInput = () => {
    setIsNoteFocused(true);
    setTimeout(() => {
      noteInputRef.current?.focus();
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
      'lunch': ['#DA291C', '#DA291C'],
      'dinner': ['#DA291C', '#DA291C']
    };
    return gradientMap[selectedMealType] || ['#DA291C', '#818cf8'];
  };

  const updateMealPrice = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setMealOptions(prev => ({
      ...prev,
      price: numericValue ? parseInt(numericValue) : 0
    }));
  };

  // Render Meal Type Selector (only if multiple meal types)
  const renderMealTypeSelector = () => {
    // Show loading while preferences are loading
    if (prefsLoading) {
      return (
        <View style={styles.mealTypeContainer}>
          <ActivityIndicator size="small" color="#2c95f8" />
          <Text weight='bold' style={styles.loadingText}>Loading meal types...</Text>
        </View>
      );
    }

    // If only one meal type is available, don't show selector
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
        // No meal types available
        return (
          <View style={styles.singleMealHeader}>
            <Text weight='extraBold' style={styles.singleMealText}>
              No meal types configured
            </Text>
          </View>
        );
      }
    }

    // Show tabs if multiple meal types are available
    return (
      <View style={styles.mealTypeContainer}>
        <View style={styles.mealTypeGrid}>
          {activeMealTypes.map((mealType) => {
            const IconComponent = mealType.icon;
            const isActive = mealType.id === selectedMealType;
            
            return (
              <LinearGradient
                key={mealType.id}
                colors={isActive ? [mealType.color, mealType.color] : ['#F8FAFC', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.mealTypeTab, isActive && styles.activeMealTypeTab]}
              >
                <TouchableOpacity
                  style={styles.mealTypeTabContent}
                  onPress={() => handleMealTypeChange(mealType.id as 'lunch' | 'dinner')}
                  activeOpacity={0.9}
                >
                  <IconComponent size={20} color={isActive ? '#fff' : mealType.color} />
                  <Text weight='extraBold' style={[styles.mealTypeText, isActive && styles.activeMealTypeText]}>
                    {mealType.name}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            );
          })}
        </View>
      </View>
    );
  };

  // Render Day Selector
  const renderDaySelector = () => {
    return (
      <View style={[styles.daysContainer, { marginTop: hasMultipleMealTypes ? 4 : 10 }]}>
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

  // Render Category for Dish Selection
  const renderCategory = (category: DishCategory) => {
    const categoryDishes = getDishesByCategoryId(category._id);
    const gradientColors = getMealTypeGradient();

    const selectedDishNames = dishes
      .filter(dish => selectedDishes[category._id]?.includes(dish._id))
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
                    isDishSelected(category._id, dish._id) && [styles.selectedDishButton, { backgroundColor: gradientColors[0] }],
                  ]}
                  onPress={() => toggleDishSelection(category._id, dish._id)}
                >
                  <Text weight='bold' style={[
                    styles.dishText,
                    isDishSelected(category._id, dish._id) && styles.selectedDishText,
                  ]}>
                    {dish.name}
                  </Text>
                  {isDishSelected(category._id, dish._id) && (
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
  const renderMealOptions = () => {
    const gradientColors = getMealTypeGradient();
    const totalSelectedDishes = Object.values(selectedDishes).reduce((acc, curr) => acc + (curr?.length || 0), 0);
    
    return (
      <View style={[styles.mealOptionsContainer, { borderLeftColor: gradientColors[0] }]}>
        <View style={styles.sectionHeader}>
          <View>
            <Text weight='bold' style={styles.sectionTitle}>
              {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Options
            </Text>
            <Text weight='bold' style={styles.sectionSubtitle}>
              {totalSelectedDishes} dishes selected
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.editPricingButton, { backgroundColor: `${gradientColors[0]}15` }]}
            onPress={() => setShowPricingModal(true)}
          >
            <Edit2 size={16} color={gradientColors[0]} />
            <Text weight='bold' style={[styles.editPricingText, { color: gradientColors[0] }]}>Edit Price</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceSection}>
          <Text weight='bold' style={styles.priceLabel}>Price</Text>
          <View style={styles.priceInputContainer}>
            <Text weight='bold' style={[styles.currencySymbol, { color: gradientColors[0] }]}>₹</Text>
            <TextInput
              style={styles.priceInputField}
              value={mealOptions.price?.toString() || '0'}
              onChangeText={updateMealPrice}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>

        <View style={styles.specialPricingContainer}>
          <View style={styles.specialPricingHeader}>
            <Text weight='bold' style={styles.specialPricingTitle}>Special Pricing</Text>
            <Switch
              value={isSpecialPricing}
              onValueChange={setIsSpecialPricing}
              trackColor={{ false: '#767577', true: `${gradientColors[0]}80` }}
              thumbColor={isSpecialPricing ? gradientColors[0] : '#f4f3f4'}
            />
          </View>
          {isSpecialPricing && (
            <TextInput
              style={styles.specialPricingInput}
              placeholder="Add note about special pricing (optional)"
              value={specialPricingNote}
              onChangeText={setSpecialPricingNote}
              multiline
            />
          )}
        </View>
      </View>
    );
  };

  // Render Pricing Modal
  const renderPricingModal = () => {
    const gradientColors = getMealTypeGradient();
    
    return (
      <Modal
        visible={showPricingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPricingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text weight='bold' style={styles.modalTitle}>Edit {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Price</Text>
              <TouchableOpacity
                onPress={() => setShowPricingModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text weight='bold' style={styles.modalDescription}>
              Set price for this meal. This price will be used for billing.
            </Text>

            <View style={styles.pricingInput}>
              <Text weight='bold' style={styles.pricingLabel}>Price</Text>
              <View style={styles.priceInputRow}>
                <Text weight='bold' style={[styles.currencySymbol, { color: gradientColors[0] }]}>₹</Text>
                <TextInput
                  style={styles.pricingInputField}
                  value={mealOptions.price?.toString() || '0'}
                  onChangeText={updateMealPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPricingModal(false)}
              >
                <Text weight='bold' style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: gradientColors[0] }]}
                onPress={() => setShowPricingModal(false)}
              >
                <Text weight='bold' style={styles.saveButtonText}>Save Price</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Show loading while preferences are loading
  if (prefsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text weight='bold' style={styles.loadingText}>Loading meal preferences...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
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
    <View style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderMealTypeSelector()}
        {renderDaySelector()}
        
        <View style={styles.inputContainer}>
          <Text weight='bold' style={styles.inputLabel}>Menu Name</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter menu name"
            value={menuName}
            onChangeText={setMenuName}
          />
        </View>
        
        {renderMealOptions()}
        
        {categories.map(category => renderCategory(category))}
        
        <View style={styles.notesContainer}>
          <Text weight='bold' style={styles.notesTitle}>📝 Notes (Optional)</Text>
          <TouchableOpacity 
            style={styles.notesInputTouchable}
            onPress={focusNoteInput}
            activeOpacity={0.7}
          >
            <TextInput
              ref={noteInputRef}
              style={styles.notesInput}
              placeholder="E.g., 'Special paneer today!'"
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              onFocus={() => setIsNoteFocused(true)}
              onBlur={() => setIsNoteFocused(false)}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
      
      {renderPricingModal()}
      
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: getMealTypeGradient()[0] }, (!hasSelectedDishes() || saving) && styles.disabledButton]}
          onPress={saveMenu}
          disabled={!hasSelectedDishes() || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text weight='bold' style={styles.buttonText}>
              Save {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Add these new styles to your existing styles:
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  scrollContainer: {
    paddingHorizontal: 4,
    flexGrow: 1,
    paddingBottom: 100,
  },
  scrollView: {
    flex: 1,
  },
  mealTypeContainer: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeTab: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mealTypeTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    position: 'relative',
  },
  activeMealTypeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    transform: [{ translateY: -2 }],
  },
  mealTypeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 6,
  },
  activeMealTypeText: {
    color: '#fff',
  },
  daysContainer: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.5)',
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 1,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activeDayText: {
    color: '#fff',
  },
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
  editPricingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editPricingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
  specialPricingContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  specialPricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialPricingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369A1',
  },
  specialPricingInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    minHeight: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  pricingInput: {
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pricingInputField: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
  },
  saveButton: {
    backgroundColor: '#DA291C',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
    fontSize: 16,
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
    backgroundColor: '#DA291C',
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
    marginBottom: 20,
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
});

export default DailyMenuScreen;