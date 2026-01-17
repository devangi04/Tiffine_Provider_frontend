// AddCustomerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Text } from '@/components/ztext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { 
  createCustomer, 
  updateCustomer, 
  setCurrentCustomer,
  fetchLocationFromPincode 
} from './store/slices/customerslice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  AddCustomer: { customer?: Customer };
  CustomerList: undefined;
  Profile: undefined;
};

type AddCustomerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AddCustomer'
>;

type Props = {
  navigation: AddCustomerScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'AddCustomer'>;
};

type CustomerPreference = 'veg' | 'non-veg' | 'jain';

type Customer = {
  _id?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  pincode: string;
  city: string;
  state: string;
  area?: string;
  preference: CustomerPreference;
  isActive: boolean;
  providerId: string;
};

// Character limits
const CHAR_LIMITS = {
  NAME: 70,
  PHONE: 10,
  EMAIL: 100,
  ADDRESS: 250,
  AREA: 100,
  PINCODE: 6,
  CITY: 50,
  STATE: 50,
};

// Modern Input Component
const ModernInput = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
  maxLength,
  prefix,
  editable = true,
  error = false,
  showCharCount = false,
  charLimit,
  touched = false,
  icon,
  loading = false,
  placeholder = '',
  containerStyle,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  maxLength?: number;
  prefix?: string;
  editable?: boolean;
  error?: boolean;
  showCharCount?: boolean;
  charLimit?: number;
  touched?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  placeholder?: string;
  containerStyle?: any;
}) => {
  return (
    <View style={[styles.inputContainer, containerStyle]}>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {showCharCount && charLimit && (
          <Text style={[
            styles.charCount,
            value.length >= charLimit && styles.charCountLimit,
            value.length > charLimit * 0.8 && value.length < charLimit && styles.charCountWarning
          ]}>
            {value.length}/{charLimit}
          </Text>
        )}
      </View>
      
      <View style={[
        styles.inputWrapper,
        error && touched && styles.inputWrapperError,
        !editable && styles.inputWrapperDisabled
      ]}>
        {icon && (
          <View style={styles.iconContainer}>
            {loading ? <ActivityIndicator size="small" color="#15803d" /> : icon}
          </View>
        )}
        {prefix && (
          <View style={[styles.prefixContainer, !editable && styles.prefixDisabled]}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            prefix && styles.inputWithPrefix,
            icon && styles.inputWithIcon,
            multiline && styles.multilineInput,
            !editable && styles.inputDisabled
          ]}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
          editable={editable}
          selectTextOnFocus={editable}
          placeholderTextColor="#9CA3AF"
          placeholder={placeholder}
        />
      </View>

      {error && touched && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#DC2626" />
          <Text style={styles.errorText}>
            {label.includes('Name') && (value.length === 0 ? 'Name is required' : `Maximum ${CHAR_LIMITS.NAME} characters allowed`)}
            {label.includes('Phone') && (value.length < 10 ? 'Phone number must be 10 digits' : 'Phone number is required')}
            {label.includes('Email') && (value.length === 0 ? 'Email is required' : 'Please enter a valid email address')}
            {label.includes('Address') && (value.length === 0 ? 'Address is required' : `Maximum ${CHAR_LIMITS.ADDRESS} characters allowed`)}
            {label.includes('Area') && (value.length === 0 ? '' : `Maximum ${CHAR_LIMITS.AREA} characters allowed`)}
            {label.includes('Pincode') && (value.length < 6 ? 'Pincode must be 6 digits' : 'Pincode is required')}
            {label.includes('City') && (value.length === 0 ? 'City is required' : `Maximum ${CHAR_LIMITS.CITY} characters allowed`)}
            {label.includes('State') && (value.length === 0 ? 'State is required' : `Maximum ${CHAR_LIMITS.STATE} characters allowed`)}
          </Text>
        </View>
      )}
    </View>
  );
};

const AddCustomerScreen: React.FC<Props> = ({ navigation, route }) => {
  const provider = useAppSelector((state) => state.provider);
  const { currentCustomer, loading, location } = useAppSelector((state) => state.customer);
  const providerId = provider.id;
  const dispatch = useAppDispatch();

  // Local state variables
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [area, setArea] = useState('');
  const [preference, setPreference] = useState<CustomerPreference>('veg');
  const [isActive, setIsActive] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation states
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    phone: false,
    email: false,
    address: false,
    pincode: false,
    city: false,
    state: false,
    area: false,
  });

  const [fieldErrors, setFieldErrors] = useState({
    name: false,
    phone: false,
    email: false,
    address: false,
    pincode: false,
    city: false,
    state: false,
    area: false,
  });

  const hasInitializedFromRedux = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  // Validation functions
  const validateField = (field: string, value: string): boolean => {
    switch (field) {
      case 'name':
        return value.trim().length > 0 && value.trim().length <= CHAR_LIMITS.NAME;
      case 'phone':
        return /^\d{10}$/.test(value.trim());
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value.trim()) && value.trim().length <= CHAR_LIMITS.EMAIL;
      case 'address':
        return value.trim().length > 0 && value.trim().length <= CHAR_LIMITS.ADDRESS;
      case 'pincode':
        return /^\d{6}$/.test(value.trim());
      case 'city':
        return value.trim().length > 0 && value.trim().length <= CHAR_LIMITS.CITY;
      case 'state':
        return value.trim().length > 0 && value.trim().length <= CHAR_LIMITS.STATE;
      case 'area':
        return value.trim().length <= CHAR_LIMITS.AREA; // Area is optional
      default:
        return true;
    }
  };

  const validateAllFields = () => {
    const errors = {
      name: !validateField('name', name),
      phone: !validateField('phone', phone),
      email: !validateField('email', email),
      address: !validateField('address', address),
      pincode: !validateField('pincode', pincode),
      city: !validateField('city', city),
      state: !validateField('state', state),
      area: !validateField('area', area),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(error => error);
  };

  // Function to fetch city/state from pincode
  const handlePincodeLookup = async (pincodeValue: string) => {
    if (!/^\d{6}$/.test(pincodeValue)) return;
    
    try {
      const result = await dispatch(fetchLocationFromPincode(pincodeValue)).unwrap();
      
      // Update local state with the result
      setCity(result.city || '');
      setState(result.state || '');
      
      // Auto-fill area with city if area is empty
      if (!area.trim() && result.city) {
        setArea(result.city);
      }
      
      // Show success alert
      // Alert.alert(
      //   'Location Found',
      //   `City: ${result.city}\nState: ${result.state}`,
      //   [{ text: 'OK' }]
      // );
      
    } catch (error: any) {
      Alert.alert(
        'Location Error',
        error.message || 'Could not fetch location. Please enter city and state manually.'
      );
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (field === 'pincode' && location.loading) {
      return; // Don't allow changes while searching
    }

    // Apply character limits
    switch (field) {
      case 'name':
        if (value.length <= CHAR_LIMITS.NAME) {
          setName(value);
        }
        break;
      case 'phone':
        const phoneNumbers = value.replace(/[^0-9]/g, '');
        if (phoneNumbers.length <= CHAR_LIMITS.PHONE) {
          setPhone(phoneNumbers);
        }
        break;
      case 'email':
        if (value.length <= CHAR_LIMITS.EMAIL) {
          setEmail(value);
        }
        break;
      case 'address':
        if (value.length <= CHAR_LIMITS.ADDRESS) {
          setAddress(value);
        }
        break;
      case 'pincode':
        if (location.loading) return;
        const numbersOnly = value.replace(/[^0-9]/g, '');
        
        if (numbersOnly.length <= CHAR_LIMITS.PINCODE) {
          setPincode(numbersOnly);
          
          // Auto-fetch when 6 digits entered
          if (numbersOnly.length === 6) {
            handlePincodeLookup(numbersOnly);
          }
        }
        break;
      case 'city':
        if (value.length <= CHAR_LIMITS.CITY) {
          setCity(value);
        }
        break;
      case 'state':
        if (value.length <= CHAR_LIMITS.STATE) {
          setState(value);
        }
        break;
      case 'area':
        if (value.length <= CHAR_LIMITS.AREA) {
          setArea(value);
        }
        break;
    }

    // Update touched state
    if (!touchedFields[field as keyof typeof touchedFields]) {
      setTouchedFields(prev => ({ ...prev, [field]: true }));
    }

    // Validate field
    const isValid = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: !isValid }));
  };

  // Handle manual lookup button press
  const handleManualLookup = () => {
    if (pincode.length === 6) {
      handlePincodeLookup(pincode);
    }
  };

  useEffect(() => {
    nav.setOptions({
      headerShown: false,
    });

    if (currentCustomer && currentCustomer._id && !hasInitializedFromRedux.current) {
      setIsEditing(true);
      setName(currentCustomer.name);
      setPhone(currentCustomer.phone);
      setEmail(currentCustomer.email || '');
      setAddress(currentCustomer.address);
      setPincode(currentCustomer.pincode || '');
      setCity(currentCustomer.city || '');
      setState(currentCustomer.state || '');
      setArea(currentCustomer.area || '');
      setPreference(currentCustomer.preference);
      setIsActive(currentCustomer.isActive);
      hasInitializedFromRedux.current = true;
    } else if (!currentCustomer && !hasInitializedFromRedux.current) {
      resetForm();
      hasInitializedFromRedux.current = true;
    }
  }, [nav, currentCustomer]);

  useEffect(() => {
    return () => {
      if (!loading && !submitting) {
        dispatch(setCurrentCustomer(null));
        hasInitializedFromRedux.current = false;
      }
    };
  }, [loading, submitting, dispatch]);

  const handleSubmit = async () => {
    if (submitting) return;

    // Mark all fields as touched
    setTouchedFields({
      name: true,
      phone: true,
      email: true,
      address: true,
      pincode: true,
      city: true,
      state: true,
      area: true,
    });

    // Validate all fields
    if (!validateAllFields()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form');
      return;
    }

    if (!providerId) {
      Alert.alert('Error', 'Provider information is missing. Please try again.');
      return;
    }

    setSubmitting(true);

    const normalizedEmail = email.toLowerCase().trim();
    const customerData = {
      name: name.trim(),
      phone: phone.trim(),
      email: normalizedEmail,
      address: address.trim(),
      pincode: pincode.trim(),
      city: city.trim(),
      state: state.trim(),
      area: area.trim(),
      preference,
      isActive,
      providerId,
    };

    try {
      if (isEditing && currentCustomer?._id) {
        await dispatch(updateCustomer({ id: currentCustomer._id, customerData })).unwrap();
        dispatch(setCurrentCustomer(null));
        Alert.alert(
          'Success',
          'Customer updated successfully!',
          [{ text: 'OK', onPress: () => { setSubmitting(false); nav.goBack(); }}]
        );
      } else {
        await dispatch(createCustomer(customerData)).unwrap();
        Alert.alert(
          'Success',
          'Customer added successfully!',
          [
            {
              text: 'Add Another',
              onPress: () => {
                resetForm();
                setSubmitting(false);
                hasInitializedFromRedux.current = false;
              }
            },
            {
              text: 'Done',
              onPress: () => {
                setSubmitting(false);
                nav.goBack();
              }
            }
          ]
        );
      }
    } catch (error: any) {
      setSubmitting(false);
      if (error.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else if (error.message && error.message.includes('Phone number already exists')) {
        Alert.alert('Error', 'This phone number is already registered for a customer');
      } else {
        Alert.alert('Error', `Failed to ${isEditing ? 'update' : 'add'} customer. Please try again.`);
      }
    }
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPincode('');
    setCity('');
    setState('');
    setArea('');
    setPreference('veg');
    setIsActive(true);
    setIsEditing(false);
    setSubmitting(false);
    setTouchedFields({
      name: false,
      phone: false,
      email: false,
      address: false,
      pincode: false,
      city: false,
      state: false,
      area: false,
    });
    setFieldErrors({
      name: false,
      phone: false,
      email: false,
      address: false,
      pincode: false,
      city: false,
      state: false,
      area: false,
    });
  };

  const preferences = [
    { key: 'veg', label: 'Veg', icon: 'leaf', color: '#22C55E' },
    { key: 'non-veg', label: 'Non-Veg', icon: 'restaurant', color: '#EF4444' },
    { key: 'jain', label: 'Jain', icon: 'flower', color: '#F59E0B' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formCard}>
            {/* Personal Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={20} color="#15803d" />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <ModernInput
                label="Full Name"
                value={name}
                onChangeText={(text) => handleFieldChange('name', text)}
                editable={!submitting}
                error={fieldErrors.name}
                touched={touchedFields.name}
                maxLength={CHAR_LIMITS.NAME}
                icon={<Ionicons name="person" size={20} color="#6B7280" />}
              />

              <ModernInput
                label="Phone Number"
                value={phone}
                onChangeText={(text) => handleFieldChange('phone', text)}
                keyboardType="phone-pad"
                maxLength={CHAR_LIMITS.PHONE}
                prefix="+91"
                editable={!submitting}
                error={fieldErrors.phone}
                touched={touchedFields.phone}
              />

              <ModernInput
                label="Email Address"
                value={email}
                onChangeText={(text) => handleFieldChange('email', text)}
                keyboardType="email-address"
                editable={!submitting}
                error={fieldErrors.email}
                touched={touchedFields.email}
                maxLength={CHAR_LIMITS.EMAIL}
                icon={<Ionicons name="mail" size={20} color="#6B7280" />}
              />
            </View>

            {/* Location Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={20} color="#15803d" />
                <Text style={styles.sectionTitle}>Location Details</Text>
              </View>

              {/* Pincode Row - Fixed Alignment */}
              <View style={styles.pincodeRow}>
                <View style={styles.pincodeInputContainer}>
                  <ModernInput
                    label="Pincode"
                    value={pincode}
                    onChangeText={(text) => handleFieldChange('pincode', text)}
                    keyboardType="number-pad"
                    maxLength={CHAR_LIMITS.PINCODE}
                    editable={!submitting && !location.loading}
                    error={fieldErrors.pincode}
                    touched={touchedFields.pincode}
                    icon={location.loading ? 
                      <ActivityIndicator size="small" color="#15803d" /> : 
                      <Ionicons name="location" size={20} color="#6B7280" />
                    }
                    placeholder="Enter 6-digit pincode"
                    containerStyle={styles.pincodeInputCustom}
                  />
                </View>
                <View style={styles.lookupButtonWrapper}>
                  <TouchableOpacity
                    style={styles.lookupButton}
                    onPress={handleManualLookup}
                    disabled={pincode.length !== 6 || location.loading || submitting}
                  >
                    <LinearGradient
                      colors={pincode.length === 6 ? ['#15803d', '#16a34a'] : ['#9CA3AF', '#9CA3AF']}
                      style={styles.lookupGradient}
                    >
                      {location.loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Ionicons name="search" size={20} color="#FFFFFF" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* City and State in Row */}
              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <ModernInput
                    label="City"
                    value={city}
                    onChangeText={(text) => handleFieldChange('city', text)}
                    editable={!submitting}
                    error={fieldErrors.city}
                    touched={touchedFields.city}
                    maxLength={CHAR_LIMITS.CITY}
                    icon={<Ionicons name="business" size={20} color="#6B7280" />}
                    placeholder="Auto-filled from pincode"
                  />
                </View>
                <View style={styles.halfInput}>
                  <ModernInput
                    label="State"
                    value={state}
                    onChangeText={(text) => handleFieldChange('state', text)}
                    editable={!submitting}
                    error={fieldErrors.state}
                    touched={touchedFields.state}
                    maxLength={CHAR_LIMITS.STATE}
                    icon={<Ionicons name="flag" size={20} color="#6B7280" />}
                    placeholder="Auto-filled from pincode"
                  />
                </View>
              </View>

              {/* Area - Optional */}
              <ModernInput
                label="Area/Locality (Optional)"
                value={area}
                onChangeText={(text) => handleFieldChange('area', text)}
                editable={!submitting}
                maxLength={CHAR_LIMITS.AREA}
                icon={<Ionicons name="navigate" size={20} color="#6B7280" />}
                placeholder="e.g., Downtown, Suburb"
              />

              <ModernInput
                label="Full Address"
                value={address}
                onChangeText={(text) => handleFieldChange('address', text)}
                multiline={true}
                editable={!submitting}
                error={fieldErrors.address}
                touched={touchedFields.address}
                showCharCount
                charLimit={CHAR_LIMITS.ADDRESS}
                maxLength={CHAR_LIMITS.ADDRESS}
                icon={<Ionicons name="home" size={20} color="#6B7280" />}
                placeholder="House no, Building, Street"
              />
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={20} color="#15803d" />
                <Text style={styles.sectionTitle}>Food Preference</Text>
              </View>

              <View style={styles.preferencesGrid}>
                {preferences.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.preferenceCard,
                      preference === item.key && styles.preferenceCardActive,
                      preference === item.key && { borderColor: item.color }
                    ]}
                    onPress={() => !submitting && setPreference(item.key as CustomerPreference)}
                    activeOpacity={0.7}
                    disabled={submitting}
                  >
                    <View style={[
                      styles.preferenceIconCircle,
                      preference === item.key && { backgroundColor: item.color + '20' }
                    ]}>
                      <Ionicons 
                        name={item.icon as any} 
                        size={24} 
                        color={preference === item.key ? item.color : '#9CA3AF'} 
                      />
                    </View>
                    <Text style={[
                      styles.preferenceLabel,
                      preference === item.key && { color: item.color, fontWeight: '600' }
                    ]}>
                      {item.label}
                    </Text>
                    {preference === item.key && (
                      <View style={[styles.checkMark, { backgroundColor: item.color }]}>
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Status Section */}
            <View style={styles.section}>
              <View style={styles.statusCard}>
                <View style={styles.statusLeft}>
                  <View style={[styles.statusIconCircle, isActive && styles.statusIconCircleActive]}>
                    <Ionicons 
                      name={isActive ? "checkmark-circle" : "close-circle"} 
                      size={24} 
                      color={isActive ? "#15803d" : "#9CA3AF"} 
                    />
                  </View>
                  <View>
                    <Text style={styles.statusTitle}>Active Status</Text>
                    <Text style={styles.statusSubtitle}>
                      {isActive ? 'Customer is active' : 'Customer is inactive'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#E5E7EB', true: '#86efac' }}
                  thumbColor={isActive ? '#15803d' : '#f4f3f4'}
                  disabled={submitting}
                />
              </View>
            </View>

            {/* Spacer for button */}
            {/* <View style={{ height: 100 }} /> */}
          </View>
        </ScrollView>

        {/* Fixed Submit Button */}
        <View style={[styles.fixedBottomContainer, { paddingBottom: insets.bottom}]}>
          <TouchableOpacity
            style={[styles.submitButton, (loading || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || submitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#15803d', '#16a34a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading || submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name={isEditing ? "checkmark-circle" : "add-circle"} size={24} color="#FFFFFF" />
                  <Text style={styles.submitText}>
                    {isEditing ? 'Update Customer' : 'Add Customer'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // paddingTop:30,
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formCard: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  charCountWarning: {
    color: '#F59E0B',
  },
  charCountLimit: {
    color: '#DC2626',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    minHeight: 56,
  },
  inputWrapperError: {
    borderColor: '#DC2626',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    paddingLeft: 14,
    minWidth: 24,
  },
  prefixContainer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  prefixDisabled: {
    backgroundColor: '#F9FAFB',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 16,
    paddingHorizontal: 14,
    fontWeight: '400',
    minHeight: 24,
  },
  inputWithPrefix: {
    paddingLeft: 12,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: 16,
    paddingBottom: 16,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    color: '#9CA3AF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  // Pincode specific styles for perfect alignment
  pincodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  pincodeInputContainer: {
    flex: 1,
  },
  pincodeInputCustom: {
    marginBottom: 0, // Override the default margin
  },
  lookupButtonWrapper: {
    marginTop: 30, // This aligns perfectly with the input field (8px label margin + 22px label height)
    height: 50,
    justifyContent: 'center',
  },
  lookupButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
  },
  lookupGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  preferencesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  preferenceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  preferenceCardActive: {
    borderWidth: 2,
    backgroundColor: '#FAFAFA',
  },
  preferenceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  preferenceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  checkMark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconCircleActive: {
    backgroundColor: '#dcfce7',
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  fixedBottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});

export default AddCustomerScreen;