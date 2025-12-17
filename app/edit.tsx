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
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '@/app/store/hooks'; // Add useAppDispatch
import { setProvider } from '@/app/store/slices/providerslice'; // Import setProvider
import {Text,TextStyles} from '@/components/ztext';
import { API_URL } from './config/env';

const { height } = Dimensions.get('window');

const API_BASE_URL = API_URL;

// Floating Input Component (unchanged, but add maxLength prop)
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
  maxLength // Add this
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
  maxLength?: number; // Add this
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
      outputRange: ['#9CA3AF', '#004C99'],
    }),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
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
          maxLength={maxLength} // Add this
        />
        {iconName && (
          <MaterialIcons
            name={iconName}
            size={20}
            color="#9CA3AF"
            style={styles.floatingInputIcon}
          />
        )}
      </Animated.View>
    </View>
  );
};

const EditProfileScreen = () => {
  const router = useRouter();
  const reduxProvider = useAppSelector((state) => state.provider);
  const dispatch = useAppDispatch(); // Add dispatch

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true); // Add fetching state
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

        // Direct API call like your dashboard
        const response = await axios.get(
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
            phone: providerData.phone || '', // This should now have the phone
          });
          
          // Update Redux state as well
          dispatch(setProvider({
            id: providerData.id || providerId,
            email: providerData.email || '',
            name: providerData.name || '',
            phone: providerData.phone || '', // Ensure phone is included
            subscription: providerData.subscription || {}
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
        
        let errorMessage = 'Failed to fetch profile data.';
        if (error.response) {
          errorMessage = error.response.data?.error || `Server error (${error.response.status})`;
        } else if (error.code === 'ECONNABORTED') {
          errorMessage = 'Request timeout.';
        } else if (error.message.includes('Network Error')) {
          errorMessage = 'Cannot connect to server.';
        }
        
        
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
  }, []); // Empty dependency array - only run once on mount

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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

    setLoading(true);
    try {
      const response = await axios.put(
        `${API_BASE_URL}/api/providers/${reduxProvider.id}`,
        formData,
        { 
          withCredentials: true,
          timeout: 10000
        }
      );


      if (response.data.success) {
        Alert.alert('Success', 'Profile updated successfully!');
        
        // Update Redux with new data
        dispatch(setProvider({
          id: reduxProvider.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone, // Update phone in Redux
          subscription: reduxProvider.subscription || {}
        }));
        
        router.back();
      } else {
        throw new Error(response.data.error || 'Failed to update profile');
      }
    } catch (error: any) {
      
      let errorMessage = 'Failed to update profile. Please try again.';
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
        <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c95f8" />
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
        {/* Header */}
        {/* <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#004C99" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerPlaceholder} />
        </View> */}

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
            />
          </View>

          {/* Debug Button (optional - remove in production) */}
      
        </ScrollView>

        {/* Fixed Save Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSaveProfile}
            activeOpacity={0.9}
            disabled={loading || fetching}
          >
            <LinearGradient
              colors={['#004C99', '#007AFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <MaterialIcons name="save" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>Save Changes</Text>
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
    color: '#004C99',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120, // Add padding for button
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
    backgroundColor: '#004C99',
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
    color: '#004C99',
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
  floatingInputIcon: {
    position: 'absolute',
    right: 16,
    top: 19,
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
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: -2,
    // },
    // shadowOpacity: 0.1,
    // shadowRadius: 4,
    // elevation: 5,
  },
  submitButton: {
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: '#004C99',
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