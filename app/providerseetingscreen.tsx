// screens/MealPreferencesScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  SafeAreaView,
  Modal,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated
} from 'react-native';
import { Text } from '@/components/ztext';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { 
  fetchMealPreferences, 
  updateMealPreferences, 
  clearError,
  resetMealPreferences 
} from './store/slices/mealsslice';
import { fetchUpiId, saveUpiId } from './store/slices/upislice';
import { MealService, MealType } from './store/types/meals';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  MealPreferences: undefined;
  ProviderDashboard: undefined;
};

type MealPreferencesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MealPreferences'
>;

// Fixed Time Picker Component (remove the useEffect with preferences from here)
const TimePickerModal = ({ 
  visible, 
  onClose, 
  onTimeSelect,
  currentTime 
}: {
  visible: boolean;
  onClose: () => void;
  onTimeSelect: (time: string) => void;
  currentTime: string;
}) => {
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(30);
  const [isAM, setIsAM] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Refs for scroll views
  const hourWheelRef = useRef<ScrollView>(null);
  const minuteWheelRef = useRef<ScrollView>(null);
  const ampmWheelRef = useRef<ScrollView>(null);

  const ITEM_HEIGHT = 44;
  const VISIBLE_ITEMS = 5;

  // Time options
  const hours = Array.from({ length: 12 }, (_, i) => i === 0 ? 12 : i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const ampm = ['AM', 'PM'];

  // Parse time string to extract hour, minute, and period
  const parseTimeString = (timeStr: string) => {
    try {
      let timePart = timeStr;
      let period = 'AM';
      
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const parts = timeStr.split(' ');
        timePart = parts[0];
        period = parts[1];
      }
      
      const [h, m] = timePart.split(':').map(Number);
      
      let hour12 = h % 12;
      if (hour12 === 0) hour12 = 12;
      
      if (!timeStr.includes('AM') && !timeStr.includes('PM')) {
        period = h < 12 ? 'AM' : 'PM';
      }
      
      const minuteVal = Math.round(m / 5) * 5;
      
      return {
        hour: hour12,
        minute: minuteVal,
        isAM: period === 'AM'
      };
    } catch (error) {
      return {
        hour: 10,
        minute: 30,
        isAM: true
      };
    }
  };

  // Initialize time picker
  useEffect(() => {
    if (visible && !isInitialized) {
      const parsedTime = parseTimeString(currentTime);
      setHour(parsedTime.hour);
      setMinute(parsedTime.minute);
      setIsAM(parsedTime.isAM);
      setIsInitialized(true);
    }
  }, [visible, currentTime, isInitialized]);

  // Reset when modal closes
  useEffect(() => {
    if (!visible) {
      setIsInitialized(false);
    }
  }, [visible]);

  // Scroll to positions after state is set
  useEffect(() => {
    if (visible && isInitialized) {
      const hourIndex = hours.indexOf(hour);
      const minuteIndex = minutes.indexOf(minute);
      const ampmIndex = isAM ? 0 : 1;
      
      setTimeout(() => {
        if (hourIndex !== -1 && hourWheelRef.current) {
          hourWheelRef.current.scrollTo({
            y: hourIndex * ITEM_HEIGHT,
            animated: false
          });
        }
        
        if (minuteIndex !== -1 && minuteWheelRef.current) {
          minuteWheelRef.current.scrollTo({
            y: minuteIndex * ITEM_HEIGHT,
            animated: false
          });
        }
        
        if (ampmIndex !== -1 && ampmWheelRef.current) {
          ampmWheelRef.current.scrollTo({
            y: ampmIndex * ITEM_HEIGHT,
            animated: false
          });
        }
      }, 50);
    }
  }, [visible, isInitialized, hour, minute, isAM]);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible, slideAnim, fadeAnim]);

  const handleConfirm = () => {
    let hour24;
    if (isAM) {
      hour24 = hour === 12 ? 0 : hour;
    } else {
      hour24 = hour === 12 ? 12 : hour + 12;
    }
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
    onTimeSelect(timeString);
    onClose();
  };

  const handleScrollEnd = (
    event: any, 
    items: Array<string | number>, 
    setter: (value: any) => void,
    wheelType: 'hour' | 'minute' | 'ampm'
  ) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    
    if (index >= 0 && index < items.length) {
      const newValue = items[index];
      setter(newValue);
      
      setTimeout(() => {
        let ref;
        switch(wheelType) {
          case 'hour':
            ref = hourWheelRef;
            break;
          case 'minute':
            ref = minuteWheelRef;
            break;
          case 'ampm':
            ref = ampmWheelRef;
            break;
        }
        
        if (ref && ref.current) {
          ref.current.scrollTo({
            y: index * ITEM_HEIGHT,
            animated: true
          });
        }
      }, 100);
    }
  };

const renderWheel = (
  items: Array<string | number>,
  selectedValue: string | number,
  wheelType: 'hour' | 'minute' | 'ampm'
) => {
  // FIXED: Calculate padding to center the content properly
  const wheelHeight = 240;
  const itemHeight = ITEM_HEIGHT;
  const visibleItems = VISIBLE_ITEMS;
  
  // The padding should make the selected item appear in the center
  const paddingTop = (wheelHeight - itemHeight) / 2;
  const paddingBottom = (wheelHeight - itemHeight) / 2;
  
  const wheelRef = wheelType === 'hour' ? hourWheelRef : 
                  wheelType === 'minute' ? minuteWheelRef : 
                  ampmWheelRef;

  return (
    <View style={[
      styles.wheelContainer,
      wheelType === 'ampm' && styles.ampmWheelContainer
    ]}>
      <ScrollView
        ref={wheelRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => handleScrollEnd(e, items, 
          wheelType === 'hour' ? setHour : 
          wheelType === 'minute' ? setMinute : 
          (val) => setIsAM(val === 'AM'),
          wheelType
        )}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop,
          paddingBottom,
        }}
      >
        {items.map((item, index) => (
          <View
            key={`${wheelType}-${index}`}
            style={[
              styles.wheelItem,
              wheelType === 'ampm' && styles.ampmWheelItem
            ]}
          >
            <Text style={[
              styles.wheelItemText,
              wheelType === 'ampm' && styles.ampmWheelItemText,
              item === selectedValue && styles.wheelItemTextSelected,
            ]}>
              {wheelType === 'hour' || wheelType === 'minute' 
                ? item.toString().padStart(2, '0') 
                : item.toString()
              }
            </Text>
          </View>
        ))}
      </ScrollView>
      
      {/* Selection highlight - positioned correctly */}
      <View style={[
        styles.selectionHighlight,
        wheelType === 'ampm' && styles.ampmSelectionHighlight
      ]} pointerEvents="none">
        <View style={styles.selectionHighlightLine} />
        <View style={styles.selectionHighlightLine} />
      </View>
    </View>
  );
};
  if (!modalVisible && !visible) return null;

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.timePickerHeader}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
              <Text style={styles.confirmButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Time Display Preview */}
          <View style={styles.timeDisplayPreview}>
            <Text style={styles.previewTime}>
              {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
            </Text>
            <Text style={styles.previewPeriod}>
              {isAM ? 'AM' : 'PM'}
            </Text>
          </View>

          {/* iOS-style Wheel Picker - Fixed Alignment */}
          <View style={styles.iosWheelContainer}>
            {renderWheel(hours, hour, 'hour')}
            
            <View style={styles.wheelSeparator}>
              <Text style={styles.wheelSeparatorText}>:</Text>
            </View>
            
            {renderWheel(minutes, minute, 'minute')}
            
            <View style={styles.emptySeparator}>
              <Text style={styles.wheelSeparatorText} />
            </View>
            
            {renderWheel(ampm, isAM ? 'AM' : 'PM', 'ampm')}
          </View>

          {/* Bottom button for confirm */}
          <TouchableOpacity
            style={styles.iosConfirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.iosConfirmButtonText}>
              Set Time
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Card Component for sections
const Card = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <View style={[styles.card, style]}>
    {children}
  </View>
);

// Section Header Component
const SectionHeader = ({ 
  icon, 
  title, 
  subtitle,
  rightElement 
}: { 
  icon: string; 
  title: string; 
  subtitle?: string;
  rightElement?: React.ReactNode;
}) => (
  <View style={styles.sectionHeader}>
    <View style={styles.iconCircle}>
      <Icon name={icon} size={22} color="#15803d" />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
    {rightElement}
  </View>
);

const MealPreferencesScreen = () => {
  const navigation = useNavigation<MealPreferencesScreenNavigationProp>();
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  
  const hasRedirectedRef = useRef(false);

  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  
  const { preferences, loading, saving, error } = useAppSelector((state) => 
    state.mealPreferences || {
      preferences: null,
      loading: false,
      saving: false,
      error: null
    }
  );

  const upi = useAppSelector((state) => state.upi);

  const [mealService, setMealService] = useState<MealService>({
    lunch: {
      enabled: false,
      price: '0',
      cutoffTime: '10:30 AM',
    },
    dinner: {
      enabled: false,
      price: '0',
      cutoffTime: '06:30 PM',
    },
  });

  const [localUpiId, setLocalUpiId] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [currentEditingMeal, setCurrentEditingMeal] = useState<MealType | null>(null);
  const [hasJustSaved, setHasJustSaved] = useState(false);

  // Get parameters for redirect
  const isRequiredSetup = params.requireSetup === 'true';
  const redirectFrom = params.redirectFrom as string;


  useEffect(() => {
  const isRequiredSetup = params.requireSetup === 'true';
  const redirectFrom = params.redirectFrom as string;

  // Handle redirect after successful save when required setup ONLY
  if (preferences?.mealService && isRequiredSetup && hasJustSaved) {
    const hasMealPreferences = preferences.mealService && 
      (preferences.mealService.lunch?.enabled || 
       preferences.mealService.dinner?.enabled);
    
    if (hasMealPreferences) {
      // Small delay to show success message
      setTimeout(() => {
        if (redirectFrom) {
          router.replace(redirectFrom);
        } else {
          router.replace('/dashboard');
        }
      }, 1500);
    }
    setHasJustSaved(false);
  }
}, [preferences, params, router, hasJustSaved]);
  // Handle redirect after successful save when required setup
useEffect(() => {
  if (
    hasRedirectedRef.current ||
    !hasJustSaved ||
    !isRequiredSetup ||
    !preferences?.mealService
  ) return;

  const hasMealPreferences =
    preferences.mealService.lunch?.enabled ||
    preferences.mealService.dinner?.enabled;

  if (!hasMealPreferences) return;

  hasRedirectedRef.current = true; // ✅ consume redirect
  setHasJustSaved(false);

  setTimeout(() => {
    router.replace(redirectFrom || '/dashboard');
  }, 800);
}, [hasJustSaved, preferences, isRequiredSetup, redirectFrom]);

  useEffect(() => {
    if (error) {      
      let errorMessage = error;
      if (error.includes('Network error')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      } else if (error.includes('401')) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.includes('404')) {
        errorMessage = 'Service not found. Please check the API endpoint.';
      }

      Alert.alert('Error', errorMessage);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (providerId) {
      dispatch(fetchMealPreferences());
      dispatch(fetchUpiId());
    } else {
      Alert.alert('Error', 'Provider information not found. Please login again.');
    }
  }, [dispatch, providerId]);

  useEffect(() => {
    if (preferences?.mealService) {
      setMealService(prev => ({
        lunch: { 
          ...prev.lunch, 
          ...preferences.mealService.lunch,
          price: preferences.mealService.lunch?.price?.toString() || '0',
          cutoffTime: preferences.mealService.lunch?.cutoffTime || '10:30 AM'
        },
        dinner: { 
          ...prev.dinner, 
          ...preferences.mealService.dinner,
          price: preferences.mealService.dinner?.price?.toString() || '0',
          cutoffTime: preferences.mealService.dinner?.cutoffTime || '06:30 PM'
        },
      }));
    }
  }, [preferences]);

  useEffect(() => {
    if (upi.upiId) {
      setLocalUpiId(upi.upiId);
    }
  }, [upi.upiId]);

  const toggleMealEnabled = (mealType: MealType): void => {
    setMealService(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType]!,
        enabled: !prev[mealType]!.enabled,
      },
    }));
  };

  const updatePrice = (mealType: MealType, value: string): void => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setMealService(prev => ({
      ...prev,
      [mealType]: {
        ...prev[mealType]!,
        price: numericValue,
      },
    }));
  };

  const openTimePicker = (mealType: MealType): void => {
    setCurrentEditingMeal(mealType);
    setTimePickerVisible(true);
  };

  const handleTimeSelect = (time: string): void => {
    if (currentEditingMeal) {
      setMealService(prev => ({
        ...prev,
        [currentEditingMeal]: {
          ...prev[currentEditingMeal]!,
          cutoffTime: time,
        },
      }));
    }
    setCurrentEditingMeal(null);
  };

  const handleSaveUpiId = async () => {
    if (!localUpiId.trim()) {
      Alert.alert('Error', 'Please enter your UPI ID');
      return;
    }

    const upiRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/;
    if (!upiRegex.test(localUpiId)) {
      Alert.alert('Invalid Format', 'Please enter a valid UPI ID (e.g., username@oksbi)');
      return;
    }

    try {
      setSavingUpi(true);
      await dispatch(saveUpiId(localUpiId)).unwrap();
      Alert.alert('Success', 'UPI ID saved successfully!');
    } catch (error: any) {
      Alert.alert('Error', error || 'Failed to save UPI ID');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleSavePreferences = async (): Promise<void> => {
    try {
      if (!providerId) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      for (const mealType of ['lunch', 'dinner'] as MealType[]) {
        const meal = mealService[mealType];
        if (meal?.enabled && (!meal.price || parseFloat(meal.price) <= 0)) {
          Alert.alert('Error', `Please enter a valid price for ${mealType}`);
          return;
        }
      }

      const payload: any = {
        lunch: mealService.lunch?.enabled ? {
          ...mealService.lunch,
          price: parseFloat(mealService.lunch.price) || 0,
        } : {
          enabled: false,
          price: 0,
          cutoffTime: ""
        },
        dinner: mealService.dinner?.enabled ? {
          ...mealService.dinner,
          price: parseFloat(mealService.dinner.price) || 0,
        } : {
          enabled: false,
          price: 0,
          cutoffTime: ""
        },
      };

      const result = await dispatch(updateMealPreferences(payload)).unwrap();
      
      if (result) {
        Alert.alert('Success', 'Meal preferences updated successfully!');
        router.push('/dashboard');
        setHasJustSaved(true);
      }
    } catch (error: any) {
      // Error handled by reducer
    }
  };

  const renderMealSection = (mealType: MealType, mealName: string) => {
    const meal = mealService[mealType];
    if (!meal) return null;

    return (
      <Card style={styles.mealCard}>
        <SectionHeader
          icon={mealType === 'lunch' ? "restaurant" : "restaurant"}
          title={`${mealName} Service`}
          subtitle={meal.enabled ? "Active" : "Inactive"}
          rightElement={
            <Switch
              value={meal.enabled}
              onValueChange={() => toggleMealEnabled(mealType)}
              trackColor={{ false: '#E5E7EB', true: '#d3f4dbff' }}
              thumbColor={meal.enabled ? '#15803d' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
            />
          }
        />
        
        {meal.enabled && (
          <>
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.inputLabel}>Daily Price</Text>
                <View style={styles.inputContainer}>
                  <Icon name="currency-rupee" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={meal.price}
                    onChangeText={(value) => updatePrice(mealType, value)}
                    placeholder="70"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <View style={styles.formColumn}>
                <Text style={styles.inputLabel}>Cutoff Time</Text>
                <TouchableOpacity 
                  style={styles.timeSelector}
                  onPress={() => openTimePicker(mealType)}
                >
                  <Icon name="access-time" size={20} color="#15803d" />
                  <View style={styles.timeSelectorContent}>
                    <Text style={styles.timeDisplay}>{meal.cutoffTime}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* <View style={styles.mealInfo}>
              <Icon name="info" size={16} color="#15803d" />
              <Text style={styles.mealInfoText}>
                Orders will auto-confirm after this time
              </Text>
            </View> */}
          </>
        )}
      </Card>
    );
  };

  const renderInfoCard = () => (
    <Card style={styles.infoCard}>
      <SectionHeader
        icon="lightbulb"
        title="How It Works"
      />
      
      <View style={styles.infoList}>
        <View style={styles.infoItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.infoText}>Enable meals you want to offer</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.infoText}>Set competitive prices for each meal</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.infoText}>Configure cutoff times for order management</Text>
        </View>
        <View style={styles.infoItem}>
          <Icon name="check-circle" size={18} color="#4CAF50" />
          <Text style={styles.infoText}>System automatically confirms orders after cutoff</Text>
        </View>
        
      </View>
    </Card>
  );

  if (loading && !preferences) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
      
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
         <StatusBar barStyle="light-content" />
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderMealSection('lunch', 'Lunch')}
          {renderMealSection('dinner', 'Dinner')}
          {renderInfoCard()}
          
          <View style={styles.spacer} />
        </ScrollView>

        <TimePickerModal
          visible={timePickerVisible}
          onClose={() => setTimePickerVisible(false)}
          onTimeSelect={handleTimeSelect}
          currentTime={currentEditingMeal ? mealService[currentEditingMeal]!.cutoffTime : '10:30 AM'}
        />

        {/* Fixed Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, (saving || savingUpi) && styles.saveButtonDisabled]}
            onPress={handleSavePreferences}
            disabled={saving || savingUpi}
          >
            <LinearGradient
              colors={['#15803d', '#15803d']}
              style={[styles.saveButtonGradient, (saving || savingUpi) && styles.saveButtonGradientDisabled]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save All Settings</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'System',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  spacer: {
    height: 20,
  },
  // Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#d3f4dbff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
    marginTop: 2,
  },
  // Form Styles
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
    fontFamily: 'System',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontFamily: 'System',
    paddingVertical: 0,
  },
  // Meal Card
  mealCard: {
    backgroundColor: '#FFFFFF',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  formColumn: {
    flex: 1,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  timeSelectorContent: {
    flex: 1,
    marginLeft: 12,
  },
  timeDisplay: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    fontFamily: 'System',
  },
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#edf4efff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
  },
  mealInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#15803d',
    fontFamily: 'System',
  },
  // Info Card
  infoCard: {
    backgroundColor: '#f0fff4ff',
    borderWidth: 1,
    borderColor: '#d3f4dbff',
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#15803d',
    fontFamily: 'System',
    lineHeight: 20,
  },
  // Footer
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveButtonGradientDisabled: {
    opacity: 0.7,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  // Time Picker Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 17,
    color: '#15803d',
    fontWeight: '400',
    fontFamily: 'System',
  },
  timePickerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'System',
  },
  confirmButton: {
    padding: 8,
  },
  confirmButtonText: {
    fontSize: 17,
    color: '#15803d',
    fontWeight: '600',
    fontFamily: 'System',
  },
  timeDisplayPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#F8F8F8',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  previewTime: {
    fontSize: 48,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'System',
    letterSpacing: 1,
  },
  previewPeriod: {
    fontSize: 24,
    fontWeight: '500',
    color: '#666666',
    fontFamily: 'System',
    marginLeft: 12,
    marginTop: 12,
  },
  iosWheelContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 240,
    marginTop: 20,
    marginBottom: 20,
  },
  wheelContainer: {
    height: 240,
    flex:1,
    maxWidth: 90,
    width: 80,
    position: 'relative',
  },
  ampmWheelContainer: {
    height: 240,
    width: 70,
    position: 'relative',
  },
  wheelItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ampmWheelItem: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  wheelItemText: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '400',
    fontFamily: 'System',
    textAlign: 'center',
  },
  ampmWheelItemText: {
    fontSize: 22,
    color: '#666666',
    fontWeight: '400',
    fontFamily: 'System',
    textAlign: 'center',
    width: '100%',
  },
  wheelItemTextSelected: {
    color: '#000000',
    fontWeight: '500',
    fontSize: 26,
  },
  selectionHighlight: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    height: 44,
    marginTop: -22,
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  ampmSelectionHighlight: {
    position: 'absolute',
    top: '50%',
    left: 8,
    right: 8,
    height: 44,
    marginBottom:20,
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  selectionHighlightLine: {
    height: 2,
    backgroundColor: '#898484',
    marginHorizontal: 8,
  },
  wheelSeparator: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  emptySeparator: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    minWidth: 10,
  },
  wheelSeparatorText: {
    fontSize: 24,
    color: '#000000',
    fontWeight: '500',
    fontFamily: 'System',
  },
  iosConfirmButton: {
    backgroundColor: '#15803d',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  iosConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'System',
  },
});

export default MealPreferencesScreen;