import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from './api/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks';
import { setProvider } from '@/app/store/slices/providerslice';
import {Text,TextStyles} from '@/components/ztext';
import { API_URL } from './config/env';

const { height } = Dimensions.get('window');

const API_BASE_URL = API_URL;

// Updated Floating Input Component with editable prop
const FloatingInput = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  inputRef,
  multiline = false,
  iconName,
  onSubmitEditing,
  returnKeyType = 'next',
  maxLength,
  editable = true // Add editable prop
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  inputRef?: React.RefObject<TextInput>;
  multiline?: boolean;
  iconName?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
  maxLength?: number;
  editable?: boolean; // Add this
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, isFocused, value]);

  const labelStyle = {
    position: 'absolute',
    left: 20,
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
      outputRange: ['#9CA3AF', editable ? '#15803d' : '#6B7280'], // Change color based on editable
    }),
    backgroundColor: '#f8fafc',
    paddingHorizontal: 4,
    fontWeight: '500',
    zIndex: 1,
  } as any;

  const containerStyle = {
    borderColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E7EB', editable ? '#15803d' : '#D1D5DB'], // Change border color
    }),
    backgroundColor: editable ? '#FFFFFF' : '#F9FAFB', // Different background for disabled
  } as any;

  const iconColor = editable ? '#9CA3AF' : '#D1D5DB';

  return (
    <View style={styles.floatingInputContainer}>
      <Animated.View style={[styles.floatingInputWrapper, containerStyle]}>
        <Animated.Text style={labelStyle}>
          {label}
        </Animated.Text>
        <TextInput
          ref={inputRef}
          style={[
            styles.floatingInput,
            multiline && styles.multilineInput,
            iconName && styles.floatingInputWithIcon,
            !editable && styles.disabledInput, // Add disabled style
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          value={value}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={false}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
          maxLength={maxLength}
          editable={editable} // Pass editable prop
          selectTextOnFocus={editable} // Only allow text selection if editable
        />
        {iconName && (
          <MaterialIcons
            name={iconName}
            size={20}
            color={iconColor}
            style={styles.floatingInputIcon}
          />
        )}
        {!editable && (
          <MaterialIcons
            name="lock-outline"
            size={16}
            color="#9CA3AF"
            style={styles.lockIcon}
          />
        )}
      </Animated.View>
      {!editable && (
        <Text style={styles.disabledHint}>
          This field cannot be edited
        </Text>
      )}
    </View>
  );
};

const EditProfileScreen = () => {
  const router = useRouter();
  const reduxProvider = useAppSelector((state) => state.provider);
  const dispatch = useAppDispatch();
  

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [image, setImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  
  // Input refs
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  // Direct API call to fetch fresh provider data
  useEffect(() => {
    const fetchProviderDirectly = async () => {
      try {
        setFetching(true);
        
        const providerId = reduxProvider?.id;
        
        if (!providerId) {
          setFetching(false);
          return;
        }

        const response = await api.get(
          `${API_BASE_URL}/api/providers/${providerId}`,
          {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            withCredentials: true
          }
        );

        if (response.data.success) {
          const providerData = response.data.data;
          
          // Update form data
          setFormData({
            name: providerData.name || '',
            email: providerData.email || '',
            phone: providerData.phone || '',
          });
          
          // Update Redux state as well
      dispatch(setProvider({
  id: providerData.id || reduxProvider.id || '',             // required string
  token: reduxProvider.token || '',                          // keep existing token
  hasMealPreferences: reduxProvider.hasMealPreferences ?? false, // required boolean
  name: providerData.name || reduxProvider.name || '',
  email: providerData.email || reduxProvider.email || '',
  phone: providerData.phone || reduxProvider.phone || '',
  subscription: providerData.subscription || reduxProvider.subscription,
 
}));
        } else {
          // Fallback to Redux data
          if (reduxProvider) {
            setFormData({
              name: reduxProvider.name || '',
              email: reduxProvider.email || '',
              phone: reduxProvider.phone || '',
            });
          }
        }
      } catch (error: any) {       
        // Fallback to Redux data
        if (reduxProvider) {
          setFormData({
            name: reduxProvider.name || '',
            email: reduxProvider.email || '',
            phone: reduxProvider.phone || '',
          });
        }
      } finally {
        setFetching(false);
      }
    };

    fetchProviderDirectly();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    // Only allow phone to be changed
    if (field === 'phone') {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const focusNextField = (nextRef: React.RefObject<TextInput>) => {
    setTimeout(() => {
      nextRef.current?.focus();
    }, 50);
  };

  const handleSaveProfile = async () => {
    if (loading) return;

    // Validate phone number
    if (formData.phone && formData.phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Check if phone number has actually changed
    const phoneChanged = formData.phone !== reduxProvider.phone;
    if (!phoneChanged) {
      Alert.alert('No Changes', 'Phone number is unchanged.');
      return;
    }

    setLoading(true);
    try {
      // Only send phone number to API
      const updateData = {
        phone: formData.phone
      };

      const response = await api.put(
        `${API_BASE_URL}/api/providers/${reduxProvider.id}`,
        updateData,
        { 
          withCredentials: true,
          timeout: 10000
        }
      );

      if (response.data.success) {
        Alert.alert('Success', 'Phone number updated successfully!');
        
        // Update Redux with new phone
       dispatch(setProvider({
  id: reduxProvider.id,
  email: reduxProvider.email,
  name: reduxProvider.name,
  phone: formData.phone,
  subscription: reduxProvider.subscription || {},
  token: reduxProvider.token || '',                  // <--- keep token
  hasMealPreferences: reduxProvider.hasMealPreferences ?? false // keep boolean
}));

        
        router.back();
      } else {
        throw new Error(response.data.error || 'Failed to update phone number');
      }
    } catch (error: any) {      
      let errorMessage = 'Failed to update phone number. Please try again.';
      if (error.response) {
        errorMessage = error.response.data?.error || `Server error (${error.response.status})`;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (!formData.name) return 'PK';
    return formData.name.charAt(0).toUpperCase();
  };

  const renderAvatar = () => {
    if (image) {
      return <Image source={{ uri: image }} style={styles.avatarImage} />;
    }
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>
          {getInitials()}
        </Text>
      </View>
    );
  };

  // Show loading while fetching
  if (fetching) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Loading profile data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Scrollable Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile Photo Section */}
          <View style={styles.profilePhotoSection}>
            <TouchableOpacity
              style={styles.profilePhoto}
              activeOpacity={0.8}
            >
              {renderAvatar()}
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <FloatingInput
              label="Business/Provider name"
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              autoCapitalize="words"
              inputRef={nameRef}
              onSubmitEditing={() => focusNextField(emailRef)}
              returnKeyType="next"
              iconName="store"
              editable={false} // Disabled
            />

            <FloatingInput
              label="Contact email"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              inputRef={emailRef}
              onSubmitEditing={() => focusNextField(phoneRef)}
              returnKeyType="next"
              iconName="email"
              editable={false} // Disabled
            />

            <FloatingInput
              label="Contact number"
              value={formData.phone}
              onChangeText={(text) => handleInputChange('phone', text)}
              keyboardType="phone-pad"
              maxLength={10}
              inputRef={phoneRef}
              onSubmitEditing={handleSaveProfile}
              returnKeyType="done"
              iconName="phone"
              editable={true} // Enabled - only editable field
            />
          </View>
        </ScrollView>

        {/* Fixed Save Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSaveProfile}
            activeOpacity={0.9}
            disabled={loading || fetching || formData.phone === reduxProvider.phone}
          >
            <LinearGradient
              colors={['#15803d', '#15803d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.submitGradient,
                (formData.phone === reduxProvider.phone) && styles.submitGradientDisabled
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialIcons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>
                    {formData.phone === reduxProvider.phone ? 'No Changes' : 'Save Changes'}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop:120,
    backgroundColor: "#f8fafc",
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#15803d',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  profilePhotoSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#f8fafc',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#fff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  changePhotoButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  changePhotoText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '500',
  },
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  floatingInputContainer: {
    marginBottom: 20,
  },
  floatingInputWrapper: {
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    minHeight: 58,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  floatingInput: {
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontWeight: '400',
    minHeight: 58,
  },
  multilineInput: {
    minHeight: 80,
    paddingTop: 20,
    paddingBottom: 16,
  },
  floatingInputWithIcon: {
    paddingRight: 50,
  },
  disabledInput: {
    color: '#6B7280',
  },
  floatingInputIcon: {
    position: 'absolute',
    right: 16,
    top: 19,
  },
  lockIcon: {
    position: 'absolute',
    right: 42, // Position next to other icon
    top: 20,
  },
  disabledHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 12 : 20,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  submitButton: {
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: '#15803d',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    height: 52,
  },
  submitGradient: {
    flex: 1,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitGradientDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
});

export default EditProfileScreen;