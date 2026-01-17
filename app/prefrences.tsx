import React, { useState, useEffect } from 'react';
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
  Animated,
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
import { MealService, MealType } from './store/types/meals';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  MealPreferences: undefined;
  ProviderDashboard: undefined;
};

type MealPreferencesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MealPreferences'
>;

// Enhanced Clock Time Picker Component
const ClockTimePicker = ({ 
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
  const clockSize = Math.min(width * 0.7, 320);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (currentTime) {
      try {
        const [time, period] = currentTime.split(' ');
        const [h, m] = time.split(':').map(Number);
        const hour12 = h % 12 || 12;
        setHour(hour12);
        setMinute(m);
        setIsAM(period === 'AM');
      } catch (error) {
        // Handle error silently
      }
    }
  }, [currentTime]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleHourSelect = (selectedHour: number) => {
    setHour(selectedHour);
  };

  const handleMinuteSelect = (selectedMinute: number) => {
    setMinute(selectedMinute);
  };

  const handleConfirm = () => {
    const militaryHour = isAM 
      ? (hour === 12 ? 0 : hour)
      : (hour === 12 ? 12 : hour + 12);
    const timeString = `${militaryHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const displayTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
    onTimeSelect(displayTime);
    onClose();
  };

  const renderClockFace = () => {
    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const center = clockSize / 2;
    const markerRadius = clockSize / 2 - 40;

    return (
      <View style={[styles.clockFace, { 
        width: clockSize, 
        height: clockSize,
        borderRadius: clockSize / 2 
      }]}>
        {/* Clock ticks */}
        {Array.from({ length: 60 }).map((_, index) => {
          const angle = index * 6 * (Math.PI / 180);
          const isHourTick = index % 5 === 0;
          const tickLength = isHourTick ? 12 : 6;
          const tickWidth = isHourTick ? 3 : 1;
          const radius = clockSize / 2 - 20;
          
          return (
            <View
              key={index}
              style={[
                styles.clockTick,
                {
                  position: 'absolute',
                  top: center - tickLength / 2,
                  left: center - tickWidth / 2,
                  width: tickWidth,
                  height: tickLength,
                  backgroundColor: isHourTick ? '#007AFF' : '#CBD5E1',
                  transform: [
                    { rotate: `${index * 6}deg` },
                    { translateY: -radius },
                  ],
                  transformOrigin: 'center',
                },
              ]}
            />
          );
        })}

        {/* Hour markers */}
        {hours.map((h, index) => {
          const angle = (index * 30) * (Math.PI / 180);
          const x = center + markerRadius * Math.sin(angle) - 20;
          const y = center - markerRadius * Math.cos(angle) - 20;

          return (
            <TouchableOpacity
              key={h}
              style={[
                styles.hourMarker,
                {
                  left: x,
                  top: y,
                  backgroundColor: hour === h ? '#007AFF' : 'transparent',
                },
              ]}
              onPress={() => handleHourSelect(h)}
            >
              <Text
                style={[
                  styles.hourText,
                  { color: hour === h ? '#FFFFFF' : '#334155' },
                ]}
              >
                {h}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Center dot */}
        <Animated.View 
          style={[
            styles.clockCenter, 
            { 
              left: center - 8, 
              top: center - 8,
              transform: [{ scale: pulseAnim }],
            }
          ]} 
        />
        
        {/* Hour hand */}
        <View
          style={[
            styles.hourHand,
            {
              transform: [
                { rotate: `${(hour % 12) * 30 + minute * 0.5}deg` },
                { translateX: -3 },
              ],
              left: center,
              top: center,
            },
          ]}
        />
        
        {/* Minute hand */}
        <View
          style={[
            styles.minuteHand,
            {
              transform: [
                { rotate: `${minute * 6}deg` },
                { translateX: -2 },
              ],
              left: center,
              top: center,
            },
          ]}
        />
      </View>
    );
  };

  const renderMinuteSelector = () => {
    const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return (
      <View style={styles.minuteGrid}>
        {minutes.map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.minuteOption,
              minute === m && styles.selectedMinuteOption,
            ]}
            onPress={() => handleMinuteSelect(m)}
          >
            <Text
              style={[
                styles.minuteOptionText,
                minute === m && styles.selectedMinuteOptionText,
              ]}
            >
              {m.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalOverlay}>
          <View style={styles.clockPickerContainer}>
            <View style={styles.clockPickerHeader}>
              <Text style={styles.clockPickerTitle}>Select Time</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.clockDisplay}>
              <View style={styles.timeDisplayContainer}>
                <Text style={styles.currentTimeDisplay}>
                  {hour.toString().padStart(2, '0')}
                </Text>
                <Text style={styles.timeSeparator}>:</Text>
                <Text style={styles.currentTimeDisplay}>
                  {minute.toString().padStart(2, '0')}
                </Text>
              </View>
              <View style={styles.ampmSelector}>
                <TouchableOpacity
                  style={[styles.ampmOption, isAM && styles.selectedAmpmOption]}
                  onPress={() => setIsAM(true)}
                >
                  <Text style={[styles.ampmText, isAM && styles.selectedAmpmText]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmOption, !isAM && styles.selectedAmpmOption]}
                  onPress={() => setIsAM(false)}
                >
                  <Text style={[styles.ampmText, !isAM && styles.selectedAmpmText]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.clockContainer}>
              {renderClockFace()}
            </View>

            <View style={styles.minuteSection}>
              <Text style={styles.minuteLabel}>Select Minutes</Text>
              {renderMinuteSelector()}
            </View>

            <View style={styles.clockPickerActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
              >
                <Icon name="check" size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Set Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Enhanced Price Input Component
const PriceInput = ({ 
  label, 
  value, 
  onChange, 
  placeholder = "0",
  disabled = false 
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  return (
    <View style={styles.priceInputContainer}>
      <Text style={styles.priceLabel}>{label}</Text>
      <View style={[styles.priceInputWrapper, disabled && styles.priceInputWrapperDisabled]}>
        <View style={styles.currencyIcon}>
          <Icon name="currency-rupee" size={18} color="#64748B" />
        </View>
        <TextInput
          style={[styles.priceInput, disabled && styles.priceInputDisabled]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          editable={!disabled}
        />
        <Text style={styles.perMealText}>per meal</Text>
      </View>
    </View>
  );
};

// Time Input Component
const TimeInput = ({ 
  label, 
  value, 
  onPress 
}: {
  label: string;
  value: string;
  onPress: () => void;
}) => {
  return (
    <View style={styles.timeInputContainer}>
      <Text style={styles.timeLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.timeInputWrapper}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon name="access-time" size={20} color="#007AFF" />
        <View style={styles.timeInputContent}>
          <Text style={styles.timeDisplay}>{value}</Text>
          <Text style={styles.timeDescription}>Orders accepted until this time</Text>
        </View>
        <Icon name="chevron-right" size={24} color="#94A3B8" />
      </TouchableOpacity>
    </View>
  );
};

const MealPreferencesScreen = () => {
  const navigation = useNavigation<MealPreferencesScreenNavigationProp>();
  const dispatch = useAppDispatch();
  
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

  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [currentEditingMeal, setCurrentEditingMeal] = useState<MealType | null>(null);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

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
    return () => {
      dispatch(resetMealPreferences());
    };
  }, [dispatch]);

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
      }
    } catch (error: any) {
      // Error is handled by the slice
    }
  };

  const renderMealSection = (mealType: MealType, mealName: string) => {
    const meal = mealService[mealType];
    if (!meal) return null;

    return (
      <Animated.View 
        style={[
          styles.mealSection,
          { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0]
          })}] }
        ]}
      >
        <View style={styles.mealHeader}>
          <View style={styles.mealIconContainer}>
            <View style={[
              styles.mealIconWrapper,
              meal.enabled && styles.mealIconWrapperActive
            ]}>
              <Icon 
                name={mealType === 'lunch' ? "restaurant" : "restaurant-menu"} 
                size={24} 
                color={meal.enabled ? "#FFFFFF" : "#64748B"} 
              />
            </View>
            <View style={styles.mealTitleContainer}>
              <Text style={styles.mealTitle}>{mealName} Service</Text>
              <Text style={styles.mealSubtitle}>
                {meal.enabled ? 'Available for booking' : 'Currently disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={meal.enabled}
            onValueChange={() => toggleMealEnabled(mealType)}
            trackColor={{ false: '#E2E8F0', true: '#B3E0FF' }}
            thumbColor={meal.enabled ? '#007AFF' : '#F8FAFC'}
            ios_backgroundColor="#E2E8F0"
          />
        </View>

        {meal.enabled && (
          <View style={styles.mealOptions}>
            <View style={styles.optionsGrid}>
              <View style={styles.priceCard}>
                <Icon name="attach-money" size={20} color="#10B981" style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Price</Text>
                <PriceInput
                  label="Price per meal"
                  value={meal.price}
                  onChange={(value) => updatePrice(mealType, value)}
                  placeholder="70"
                />
              </View>
              
              <View style={styles.timeCard}>
                <Icon name="schedule" size={20} color="#3B82F6" style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Cutoff Time</Text>
                <TimeInput
                  label="Last order time"
                  value={meal.cutoffTime}
                  onPress={() => openTimePicker(mealType)}
                />
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  if (loading && !preferences) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your preferences...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Icon name="arrow-back-ios" size={20} color="#475569" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Meal Preferences</Text>
            <Text style={styles.headerSubtitle}>Manage your meal service settings</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          <View style={styles.content}>
            <View style={styles.infoCard}>
              <Icon name="info" size={24} color="#3B82F6" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>How it works</Text>
                <Text style={styles.infoText}>
                  Enable meals you want to offer, set prices and cutoff times. Orders will be auto-confirmed after cutoff.
                </Text>
              </View>
            </View>

            {renderMealSection('lunch', 'Lunch')}
            {renderMealSection('dinner', 'Dinner')}
          </View>
        </ScrollView>

        <ClockTimePicker
          visible={timePickerVisible}
          onClose={() => setTimePickerVisible(false)}
          onTimeSelect={handleTimeSelect}
          currentTime={currentEditingMeal ? mealService[currentEditingMeal]!.cutoffTime : '10:30 AM'}
        />

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSavePreferences}
            disabled={saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
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
    color: '#64748B',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  mealSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  mealIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mealIconWrapperActive: {
    backgroundColor: '#007AFF',
  },
  mealTitleContainer: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  mealSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  mealOptions: {
    padding: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  priceCard: {
    flex: 1,
    minWidth: width > 400 ? '48%' : '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  timeCard: {
    flex: 1,
    minWidth: width > 400 ? '48%' : '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 16,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  priceInputContainer: {
    marginBottom: 0,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
  },
  priceInputWrapperDisabled: {
    backgroundColor: '#F8FAFC',
  },
  currencyIcon: {
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  priceInputDisabled: {
    color: '#94A3B8',
  },
  perMealText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 8,
  },
  timeInputContainer: {
    marginBottom: 0,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  timeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
  },
  timeInputContent: {
    flex: 1,
    marginLeft: 12,
  },
  timeDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  timeDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowColor: 'transparent',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Clock Time Picker Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  clockPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  clockPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  clockPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 8,
  },
  clockDisplay: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentTimeDisplay: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
  },
  timeSeparator: {
    fontSize: 48,
    fontWeight: '700',
    color: '#CBD5E1',
    marginHorizontal: 4,
  },
  ampmSelector: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  ampmOption: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  selectedAmpmOption: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedAmpmText: {
    color: '#FFFFFF',
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  clockFace: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  clockTick: {
    position: 'absolute',
  },
  clockCenter: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    zIndex: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  hourHand: {
    position: 'absolute',
    width: 6,
    height: '35%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
    marginLeft: -3,
    marginTop: '-35%',
    transformOrigin: 'bottom center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  minuteHand: {
    position: 'absolute',
    width: 4,
    height: '45%',
    backgroundColor: '#475569',
    borderRadius: 2,
    marginLeft: -2,
    marginTop: '-45%',
    transformOrigin: 'bottom center',
    zIndex: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  hourMarker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  hourText: {
    fontSize: 16,
    fontWeight: '600',
  },
  minuteSection: {
    marginBottom: 32,
  },
  minuteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 16,
    textAlign: 'center',
  },
  minuteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  minuteOption: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  selectedMinuteOption: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  minuteOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedMinuteOptionText: {
    color: '#FFFFFF',
  },
  clockPickerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 18,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MealPreferencesScreen;