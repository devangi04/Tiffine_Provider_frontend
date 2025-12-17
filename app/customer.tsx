// AddCustomerScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import {Text} from '@/components/ztext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { createCustomer, updateCustomer, setCurrentCustomer } from './store/slices/customerslice';
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
  area: string;
  preference: CustomerPreference;
  isActive: boolean;
  providerId: string;
};

// Floating Input Component
const FloatingInput = ({ 
  label, 
  value, 
  onChangeText, 
  keyboardType = 'default',
  multiline = false,
  maxLength,
  prefix
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  multiline?: boolean;
  maxLength?: number;
  prefix?: string;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: prefix ? 60 : 20,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, -10],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 13],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#9CA3AF', '#004C99'],
    }),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    fontWeight: '500',
    zIndex: 1,
  } as any;

  const containerStyle = {
    borderColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E7EB', '#004C99'],
    }),
  } as any;

  return (
    <View style={styles.inputContainer}>
      <Animated.View style={[styles.inputWrapper, containerStyle]}>
        <Animated.Text style={labelStyle}>
          {label}
        </Animated.Text>
        {prefix && (
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            prefix && styles.inputWithPrefix,
            multiline && styles.multilineInput
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          value={value}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </Animated.View>
    </View>
  );
};

const AddCustomerScreen: React.FC<Props> = ({ navigation, route }) => {
  const provider = useAppSelector((state) => state.provider);
  const { currentCustomer, loading } = useAppSelector((state) => state.customer);
  const providerId = provider.id;
  const dispatch = useAppDispatch();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('');
  const [preference, setPreference] = useState<CustomerPreference>('veg');
  const [isActive, setIsActive] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const hasInitializedFromRedux = useRef(false);
  const scrollViewRef = useRef<any>(null);
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  
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
      if (!loading) {
        dispatch(setCurrentCustomer(null));
        hasInitializedFromRedux.current = false;
      }
    };
  }, [loading, dispatch]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !email.trim()) {
      Alert.alert('Required Fields', 'Please fill all required fields');
      return;
    }

    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    if (!providerId) {
      Alert.alert('Error', 'Provider information is missing. Please try again.');
      return;
    }

    const customerData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      area: area.trim(),
      preference,
      isActive,
      providerId,
    };

    try {
      if (isEditing && currentCustomer?._id) {
        await dispatch(updateCustomer({
          id: currentCustomer._id,
          customerData
        })).unwrap();
        
        dispatch(setCurrentCustomer(null));
        
        Alert.alert(
          'Success', 
          'Customer updated successfully!', 
          [{ text: 'OK', onPress: () => nav.goBack() }]
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
                hasInitializedFromRedux.current = false;
              }
            },
            { 
              text: 'Done', 
              onPress: () => nav.goBack()
            }
          ]
        );
      }
    } catch (error: any) {
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
    setArea('');
    setPreference('veg');
    setIsActive(true);
    setIsEditing(false);
  };

  const preferences = [
    { 
      key: 'veg', 
      label: 'Veg', 
      icon: <Ionicons name="leaf" size={20} color="#22C55E" />, 
      color: '#22C55E' 
    },
    { 
      key: 'non-veg', 
      label: 'Non-Veg', 
      icon: <MaterialIcons name="set-meal" size={20} color="#EF4444" />, 
      color: '#EF4444' 
    },
    { 
      key: 'jain', 
      label: 'Jain', 
      icon: <Feather name="feather" size={20} color="#F59E0B" />, 
      color: '#F59E0B' 
    },
  ];

  // Calculate dynamic content height
  const formHeight = 
    100 + // top spacing
    (5 * 78) + // 5 input fields at ~78px each
    (address ? 50 : 0) + // extra for multiline if needed
    140 + // preference section
    80 + // active section
    120; // button area

  const shouldScroll = formHeight > (height - insets.top - insets.bottom - 100);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#FFFFFF" />
      
      {shouldScroll ? (
        // Use ScrollView only when needed
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.form}>
            <FloatingInput
              label="Full Name *"
              value={name}
              onChangeText={setName}
            />
            
            <FloatingInput
              label="Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              prefix="+91"
            />
            
            <FloatingInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <FloatingInput
              label="Address *"
              value={address}
              onChangeText={setAddress}
              multiline={true}
            />
            
            <FloatingInput
              label="Area / Locality (Optional)"
              value={area}
              onChangeText={setArea}
            />

            <View style={styles.preferenceSection}>
              <Text weight='extraBold' style={styles.preferenceTitle}>Food Preference *</Text>
              <View style={styles.preferenceContainer}>
                {preferences.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.preferenceItem,
                      preference === item.key && {
                        backgroundColor: `${item.color}15`,
                        borderColor: item.color,
                      }
                    ]}
                    onPress={() => setPreference(item.key as CustomerPreference)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.preferenceContent}>
                      <View style={styles.preferenceIcon}>
                        {item.icon}
                      </View>
                      <Text weight='extraBold' style={[
                        styles.preferenceText,
                        preference === item.key && { color: item.color }
                      ]}>
                        {item.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.activeSection}>
              <View style={styles.activeLabelContainer}>
                <Text weight='extraBold' style={styles.activeLabel}>Active Status</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#E5E7EB', true: '#2c44f8ff' }}
                thumbColor={isActive ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
            
            <View style={styles.buttonSpacer} />
          </View>
        </ScrollView>
      ) : (
        // Regular View when no scrolling needed
        <View style={styles.noScrollContainer}>
          <View style={styles.form}>
            <FloatingInput
              label="Full Name *"
              value={name}
              onChangeText={setName}
            />
            
            <FloatingInput
              label="Phone Number *"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              prefix="+91"
            />
            
            <FloatingInput
              label="Email *"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />

            <FloatingInput
              label="Address *"
              value={address}
              onChangeText={setAddress}
              multiline={true}
            />
            
            <FloatingInput
              label="Area / Locality (Optional)"
              value={area}
              onChangeText={setArea}
            />

            <View style={styles.preferenceSection}>
              <Text weight='extraBold' style={styles.preferenceTitle}>Food Preference *</Text>
              <View style={styles.preferenceContainer}>
                {preferences.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.preferenceItem,
                      preference === item.key && {
                        backgroundColor: `${item.color}15`,
                        borderColor: item.color,
                      }
                    ]}
                    onPress={() => setPreference(item.key as CustomerPreference)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.preferenceContent}>
                      <View style={styles.preferenceIcon}>
                        {item.icon}
                      </View>
                      <Text weight='extraBold' style={[
                        styles.preferenceText,
                        preference === item.key && { color: item.color }
                      ]}>
                        {item.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.activeSection}>
              <View style={styles.activeLabelContainer}>
                <Text weight='extraBold' style={styles.activeLabel}>Active Status</Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{ false: '#E5E7EB', true: '#2c44f8ff' }}
                thumbColor={isActive ? '#FFFFFF' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>
      )}
      
      {/* Fixed Button at Bottom */}
      <View style={[
        styles.fixedBottomContainer,
        { 
          paddingBottom: Math.max(insets.bottom, 16),
          paddingTop: 16,
        }
      ]}>
        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.9}
          disabled={loading}
        >
          <LinearGradient
            colors={['#004C99', '#5695edff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text weight='extraBold' style={styles.submitText}>
                {isEditing ? 'Update Customer' : 'Add Customer'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  noScrollContainer: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  prefixContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#F9FAFB',
  },
  prefixText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontWeight: '400',
    minHeight: 58,
  },
  inputWithPrefix: {
    paddingLeft: 65,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 24,
    paddingBottom: 20,
  },
  preferenceSection: {
    marginBottom: 20,
  },
  preferenceTitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    marginLeft: 4,
  },
  preferenceContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  preferenceItem: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  preferenceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  preferenceIcon: {
    // Icon styling is handled in the icon component itself
  },
  preferenceText: {
    fontSize: 14,
    color: '#6B7280',
  },
  activeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 16,
  },
  activeLabelContainer: {
    flex: 1,
  },
  activeLabel: {
    fontSize: 15,
    color: '#374151',
  },
  buttonSpacer: {
    height: 100,
  },
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  submitButton: {
    borderRadius: 16,
    shadowColor: '#004C99',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 17,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
});

export default AddCustomerScreen;