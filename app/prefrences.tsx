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
import {Text,TextStyles} from '@/components/ztext';

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

const { width } = Dimensions.get('window');

type RootStackParamList = {
  MealPreferences: undefined;
  ProviderDashboard: undefined;
};

type MealPreferencesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'MealPreferences'
>;

// Clock Time Picker Component
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
  const clockSize = Math.min(width * 0.7, 350);

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
     
      }
    }
  }, [currentTime]);

  const handleHourSelect = (selectedHour: number) => {
    setHour(selectedHour);
  };

  const handleMinuteSelect = (selectedMinute: number) => {
    setMinute(selectedMinute);
  };

  const handleConfirm = () => {
    const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
    onTimeSelect(timeString);
    onClose();
  };

  const renderClockFace = () => {
    const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const center = clockSize / 2;
    const markerRadius = clockSize / 2 - 35;

    return (
      <View style={[styles.clockFace, { 
        width: clockSize, 
        height: clockSize,
        borderRadius: clockSize / 2 
      }]}>
        {hours.map((h, index) => {
          const angle = (index * 30) * (Math.PI / 180);
          const x = center + markerRadius * Math.sin(angle) - 22;
          const y = center - markerRadius * Math.cos(angle) - 22;

          return (
            <TouchableOpacity
              key={h}
              style={[
                styles.hourMarker,
                {
                  left: x,
                  top: y,
                  backgroundColor: hour === h ? '#007AFF' : '#FFFFFF',
                  borderColor: hour === h ? '#0056CC' : '#E5E7EB',
                },
              ]}
              onPress={() => handleHourSelect(h)}
            >
              <Text
                style={[
                  styles.hourText,
                  { color: hour === h ? '#FFFFFF' : '#1F2937' },
                ]}
              >
                {h}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Center dot */}
        <View style={[styles.clockCenter, { 
          left: center - 6, 
          top: center - 6 
        }]} />
        
        {/* Hour hand */}
        <Animated.View
          style={[
            styles.hourHand,
            {
              transform: [
                { rotate: `${(hour % 12) * 30 + minute * 0.5}deg` },
                { translateX: -2.5 },
              ],
              left: center,
              top: center,
            },
          ]}
        />
        
        {/* Minute hand */}
        <Animated.View
          style={[
            styles.minuteHand,
            {
              transform: [
                { rotate: `${minute * 6}deg` },
                { translateX: -1.5 },
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.minuteSelector}
        contentContainerStyle={styles.minuteSelectorContent}
      >
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
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.clockPickerContainer}>
          <View style={styles.clockPickerHeader}>
            <Text style={styles.clockPickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.clockDisplay}>
            <Text style={styles.currentTimeDisplay}>
              {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
            </Text>
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
              <Text style={styles.confirmButtonText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Price Input Component
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
      <View style={styles.priceInputWrapper}>
        <Icon name="currency-rupee" size={20} color="#666" />
        <TextInput
          style={[styles.priceInput, disabled && styles.priceInputDisabled]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          editable={!disabled}
        />
      </View>
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
    }
  };

  const renderMealSection = (mealType: MealType, mealName: string) => {
    const meal = mealService[mealType];
    if (!meal) return null;

    return (
      <View style={styles.mealSection}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleContainer}>
            <Icon 
              name={mealType === 'lunch' ? "lunch-dining" : "dinner-dining"} 
              size={24} 
              color={meal.enabled ? "#007AFF" : "#666"} 
            />
            <Text style={styles.mealTitle}>{mealName} Service</Text>
          </View>
          <Switch
            value={meal.enabled}
            onValueChange={() => toggleMealEnabled(mealType)}
            trackColor={{ false: '#E5E7EB', true: '#BBDEFB' }}
            thumbColor={meal.enabled ? '#007AFF' : '#9CA3AF'}
            ios_backgroundColor="#E5E7EB"
          />
        </View>

        {meal.enabled && (
          <View style={styles.mealOptions}>
            <View style={styles.priceSection}>
              <Text style={styles.sectionLabel}>Price</Text>
              <PriceInput
                label={`${mealName} Price`}
                value={meal.price}
                onChange={(value) => updatePrice(mealType, value)}
                placeholder="70"
              />
            </View>

            <View style={styles.timeSection}>
              <Text style={styles.sectionLabel}>Cutoff Time</Text>
              <TouchableOpacity 
                style={styles.timeInputContainer}
                onPress={() => openTimePicker(mealType)}
              >
                <Icon name="access-time" size={20} color="#007AFF" />
                <View style={styles.timeInputContent}>
                  <Text style={styles.timeDisplay}>
                    {meal.cutoffTime}
                  </Text>
                  <Text style={styles.timeNote}>
                    Tap to set cutoff time
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !preferences) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Icon name="arrow-back" size={24} color="#050000ff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Meal Preferences</Text>
            <Text style={styles.headerSubtitle}>Configure your meal services</Text>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            {renderMealSection('lunch', 'Lunch')}
            {renderMealSection('dinner', 'Dinner')}

            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon name="info" size={20} color="#1976d2" />
                <Text style={styles.infoTitle}>How it works</Text>
              </View>
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>Enable meals you want to offer</Text>
                </View>
                <View style={styles.infoItem}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>Set price for each meal</Text>
                </View>
                <View style={styles.infoItem}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>Set cutoff times for each meal</Text>
                </View>
                <View style={styles.infoItem}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.infoText}>System auto-confirms orders after cutoff</Text>
                </View>
              </View>
            </View>
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
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="save" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Preferences</Text>
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
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#050000ff',
    fontFamily: 'System',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'System',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  form: {
    padding: 20,
  },
  mealSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mealTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
  },
  mealOptions: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
    fontFamily: 'System',
  },
  priceSection: {
    marginBottom: 20,
  },
  priceInputContainer: {
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: 'System',
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontFamily: 'System',
    marginLeft: 8,
  },
  priceInputDisabled: {
    color: '#9CA3AF',
  },
  timeSection: {
    marginBottom: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeInputContent: {
    flex: 1,
    marginLeft: 12,
  },
  timeDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    fontFamily: 'System',
  },
  timeNote: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'System',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    fontFamily: 'System',
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#424242',
    fontFamily: 'System',
    flex: 1,
  },
  // Clock Time Picker Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  clockPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  clockPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  clockPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'System',
  },
  closeButton: {
    padding: 4,
  },
  clockDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  currentTimeDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: '#007AFF',
    fontFamily: 'System',
    marginBottom: 8,
  },
  ampmSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  ampmOption: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedAmpmOption: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'System',
  },
  selectedAmpmText: {
    color: '#FFFFFF',
  },
  clockContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  clockFace: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  clockCenter: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
    marginLeft: -5,
    marginTop: -5,
    zIndex: 10,
  },
  hourHand: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 4,
    height: width * 0.15,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginLeft: -2,
    marginTop: -width * 0.15,
    transformOrigin: 'bottom center',
    zIndex: 5,
  },
  minuteHand: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 3,
    height: width * 0.2,
    backgroundColor: '#666',
    borderRadius: 1.5,
    marginLeft: -1.5,
    marginTop: -width * 0.2,
    transformOrigin: 'bottom center',
    zIndex: 6,
  },
  hourMarker: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',

    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  hourText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  minuteSection: {
    marginBottom: 24,
  },
  minuteLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
    fontFamily: 'System',
    textAlign: 'center',
  },
  minuteSelector: {
    maxHeight: 50,
  },
  minuteSelectorContent: {
    paddingHorizontal: 10,
  },
  minuteOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMinuteOption: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  minuteOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'System',
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
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    fontFamily: 'System',
  },
  confirmButton: {
    flex: 1,
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
});

export default MealPreferencesScreen;