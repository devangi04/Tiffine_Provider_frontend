import React, { useState, useEffect, useRef } from 'react';
import { 
  View,  
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  ActivityIndicator
} from 'react-native';
import api from './api/api';

import {Text,TextStyles} from '@/components/ztext';

import { LinearGradient } from 'expo-linear-gradient';
const { width } = Dimensions.get('window');
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch } from './store/hooks';
import { setProvider, setLoading, clearProvider } from './store/slices/providerslice';
import OTPInputBoxes from '@/components/otpbox';
import { SafeAreaView } from 'react-native-safe-area-context';
import { persistor } from './store'; 
import { API_URL } from './config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import socketService from '../app/config/socketservice'; // Adjust path as needed
import { fetchTrialStatus } from '@/app/store/slices/providerslice';
import { registerForPushNotifications } from './config/notificationservice';

// Floating Input Component with auto-focus navigation
const FloatingInput = ({ 
  label, 
  value, 
  onChangeText, 
  keyboardType = 'default',
  secureTextEntry = false,
  showPasswordToggle = false,
  onTogglePassword,
  maxLength,
  autoCapitalize = 'none',
  autoCorrect = false,
  placeholder,
  onSubmitEditing,
  returnKeyType = 'next',
  inputRef,
  editable = true
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: any;
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  placeholder?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done' | 'go' | 'send';
  inputRef?: React.RefObject<TextInput>;
  editable?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
  const restoreAuth = async () => {
    const token = await AsyncStorage.getItem('providerToken');
  };

  restoreAuth();
}, []);

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
      outputRange: ['#9CA3AF', '#15803d'],
    }),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    fontWeight: '500',
    zIndex: 1,
  } as any;

  const containerStyle = {
    borderColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E7EB', '#15803d'],
    }),
  } as any;

  return (
    <View style={styles.floatingInputContainer}>
      <Animated.View style={[
        styles.floatingInputWrapper, 
        containerStyle,
        !editable && styles.disabledInputWrapper
      ]}>
        <Animated.Text style={[
          labelStyle,
          !editable && styles.disabledLabel
        ]}>
          {label}
        </Animated.Text>
        <TextInput
          ref={inputRef}
          style={[
            styles.floatingInput,
            showPasswordToggle && styles.floatingInputWithIcon,
            !editable && styles.disabledInputText
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          value={value}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          placeholder={isFocused ? placeholder : ''}
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={false}
          editable={editable}
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            style={styles.floatingEyeIcon}
            onPress={onTogglePassword}
          >
            <Ionicons 
              name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const AuthScreen = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { email: paramEmail, logout, timestamp } = useLocalSearchParams();
  
  const [activeTab, setActiveTab] = useState(paramEmail ? 'verify' : 'login');
  
  // Login form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginSubmitted, setIsLoginSubmitted] = useState(false);
  
  // Register form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegisterSubmitted, setIsRegisterSubmitted] = useState(false);
  
  // OTP verification states
  const [otp, setOtp] = useState('');
  const [verificationEmail, setVerificationEmail] = useState(paramEmail || '');
  
  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Enhanced tab animation with spring physics
  const tabSlideAnim = useRef(new Animated.Value(0)).current;

  // Input refs for auto-focus navigation - LOGIN
  const loginEmailRef = useRef<TextInput>(null);
  const loginPasswordRef = useRef<TextInput>(null);

  // Input refs for auto-focus navigation - REGISTER
  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Input refs for forgot password
  const forgotEmailRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const newConfirmPasswordRef = useRef<TextInput>(null);

  const nav = useNavigation();
  useEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  // Optimized logout effect
  const logoutProcessedRef = useRef(false);

useEffect(() => {
  // Only process logout if we have the logout param and not already processing
  if (logout !== 'true' || isLoggingOut) {
    return;
  }



  // Add this function to your AuthScreen component


  const performLogoutCleanup = async () => {
    try {
      setIsLoggingOut(true);
      
      // 1. Clear all forms and state first
      clearForms();
      setActiveTab('login');
      
      // 2. Short delay to ensure UI updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. Clear Redux store
      dispatch(clearProvider());
      
      // 4. Clear persisted data
      await persistor.purge();
      
      // 5. Reset the logout param to prevent re-execution
      // You'll need to update your router replace call in ProfileScreen
      // to clear the params after navigation
      
    } catch (error) {
    } finally {
      // Small delay before allowing new interactions
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 500);
    }
  };

  performLogoutCleanup();
}, [logout, dispatch]);

  useEffect(() => {
    if (paramEmail && typeof paramEmail === 'string') {
      setVerificationEmail(paramEmail);
      setActiveTab('verify');
    }
  }, [paramEmail]);

  // DEVELOPMENT ONLY - Replace with your computer's local IP
  const API_BASE_URL = API_URL;

  // Enhanced tab animation with spring effect
const animateTabChange = (newTab: string) => {
  // Calculate slide position based on tab
  let slideValue = 0;
  if (newTab === 'register') slideValue = 1;
  
  // Smooth slide animation with spring physics
  Animated.spring(tabSlideAnim, {
    toValue: slideValue,
    tension: 120,
    friction: 8,
    useNativeDriver: false,
  }).start();
  
  // Update active tab after animation starts
  setActiveTab(newTab);
};

const switchTab = (tab: string) => {
  if (tab === activeTab) return;
  
  // Reset all submission states BEFORE changing tabs
  setIsLoginSubmitted(false);
  setIsRegisterSubmitted(false);
  
  // Clear forms if switching between login/register
  if (tab !== 'verify' && tab !== 'forgot-otp' && tab !== 'reset-password') {
    clearForms();
  }
  
  // Animate and change tab
  animateTabChange(tab);
};

  // Enhanced auto-focus navigation with better timing
  const focusNextField = (nextRef: React.RefObject<TextInput>) => {
    setTimeout(() => {
      nextRef.current?.focus();
    }, 50);
  };

 // In your AuthScreen component
const handleLogin = async () => {
  setIsLoginSubmitted(false);
  if (!email || !password) {
    Alert.alert('Error', 'Please enter both email and password');
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  try {
    setIsLoading(true);
    setIsLoginSubmitted(true);
    dispatch(setLoading(true));

     // ✅ 1️⃣ Ask permission and get push token
    let pushToken = await registerForPushNotifications();
    // pushToken can be null or 'BLOCKED'

    const response = await api.post(
      `${API_BASE_URL}/api/auth/login`,
      { email, password ,pushToken},
      { timeout: 10000 }
    );
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed');
    }

    const providerData = response.data.data;
    const token = response.data.token;
    await AsyncStorage.setItem('providerToken', token);

  dispatch(setProvider({
  id: providerData.providerId,
  email: providerData.email,
  name: providerData.name,
  phone: providerData.phone || '',
  token,
  subscription: providerData.subscription || { status: 'inactive' },
  upiId: providerData.upiId || '',
  notificationsEnabled: providerData.notificationsEnabled ?? true,

  // ✅ REQUIRED FIELD
  hasMealPreferences: providerData.hasMealPreferences ?? false,
}));


    // 🔥 FETCH TRIAL STATUS ONCE — PROPERLY
    dispatch(fetchTrialStatus(providerData.providerId));

    // ❗ NO NAVIGATION HERE
    // AuthChecker WILL handle everything

  }  catch (error: any) {
    setIsLoginSubmitted(false);
    
    // Handle specific errors
    if (error.response?.data?.requiresVerification) {
      // If account exists but not verified
      const userEmail = error.response.data.email || email;
  Alert.alert(
      'Account Not Verified',
      'Please verify your email address first.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Verify Now',
          onPress: async () => {
            try {
              // Show loading
              setIsLoading(true);
              
              // ✅ AUTO-SEND NEW 4-DIGIT OTP
              const resendResponse = await api.post(
                `${API_BASE_URL}/api/providers/resend-otp`, 
                { email: userEmail }
              );
              
              if (resendResponse.data.success) {
                // Redirect to verification tab with the email
                setVerificationEmail(userEmail);
                setActiveTab('verify');
                
                // Reset tab animation
                Animated.spring(tabSlideAnim, {
                  toValue: 0,
                  tension: 120,
                  friction: 8,
                  useNativeDriver: false,
                }).start();
                
                // Show success message
                Alert.alert(
                  '4-digit OTP Sent', 
                  'New verification OTP has been sent to your email.'
                );
              } else {
                Alert.alert('Error', resendResponse.data.error || 'Failed to send OTP');
              }
            } catch (resendError: any) {
              Alert.alert(
                'Error', 
                resendError.response?.data?.error || 'Failed to send OTP'
              );
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
    } else if (error.response?.data?.error) {
      // Display specific error from backend
      Alert.alert('Login Failed', error.response.data.error);
    } else if (error.message?.includes('Network Error')) {
      Alert.alert('Network Error', 'Please check your internet connection');
    } else if (error.message?.includes('timeout')) {
      Alert.alert('Timeout', 'Request timed out. Please try again');
    } else {
      Alert.alert('Login Failed', error.message || 'Something went wrong');
    }
  } finally {
    setIsLoading(false);
    dispatch(setLoading(false));
  }
};


  const handleRegister = async () => {
     setIsRegisterSubmitted(false);
    if (!name || !email || !phone || !password) {
      Alert.alert('Error', 'All fields are required!');
      return;
    }
 // Name validation - at least 3 characters
  if (name.trim().length < 3) {
    Alert.alert('Error', 'Name must be at least 3 characters long');
    return;
  }

   // Phone validation - 10 digits
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone.trim())) {
    Alert.alert('Error', 'Phone number must be exactly 10 digits');
    return;
  }
 // Email validation
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    setIsRegisterSubmitted(true);

    try {
      const response = await api.post(`${API_BASE_URL}/api/providers/register`, {
          name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password
      });
      if (response.data.success) {
        setVerificationEmail(email);
        setActiveTab('verify');
        
        Alert.alert('Registration Successful', 'Please check your email for the OTP verification code.');
      } else {
        setIsRegisterSubmitted(false);
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      setIsRegisterSubmitted(false);
      if (error.response?.data?.error) {
      Alert.alert('Registration Failed', error.response.data.error);
    } else if (error.message?.includes('Network Error')) {
      Alert.alert('Network Error', 'Please check your internet connection');
    } else {
      Alert.alert('Registration Failed', 'An unexpected error occurred');
    }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 4) {
      Alert.alert("Error", "Please enter a valid 4-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(
        `${API_BASE_URL}/api/providers/verify-otp`, 
        { email: verificationEmail, otp }
      );

      if (response.data.success) {
        Alert.alert("Success", "Account verified successfully!", [
          {
            text: "Continue to Login",
            onPress: () => {
              // Auto-fill email in login form
              setEmail(verificationEmail);
              setOtp('');
              setVerificationEmail('');
              setActiveTab('login');
              setIsRegisterSubmitted(false);
              // Reset capsule to login position
              Animated.spring(tabSlideAnim, {
                toValue: 0,
                tension: 120,
                friction: 8,
                useNativeDriver: false,
              }).start();
            }
          }
        ]);
      } else {
        Alert.alert("Error", "OTP verification failed");
      }
    } catch (err: any) {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationOTP = async () => {
  if (!verificationEmail) {
    Alert.alert('Error', 'No email address found');
    return;
  }

  setIsLoading(true);

  try {
    const response = await api.post(`${API_BASE_URL}/api/providers/resend-otp`, {
      email: verificationEmail
    });

    if (response.data.success) {
      Alert.alert('Success', 'New OTP sent to your email');
    } else {
      Alert.alert('Error', response.data.error || 'Failed to resend OTP');
    }
  } catch (error: any) {
    Alert.alert(
      'Error',
      error.response?.data?.error || 'Failed to resend OTP'
    );
  } finally {
    setIsLoading(false);
  }
};
  // Forgot Password Functions
  const handleSendResetOTP = async () => {
    if (!forgotEmail || !/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`${API_BASE_URL}/api/providers/forgot-password`, { 
        email: forgotEmail 
      });
      
      if (response.data.success) {
        setActiveTab('forgot-otp');
        Alert.alert('Success', 'OTP sent to your email');
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyResetOTP = async () => {
    if (!resetOtp || resetOtp.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`${API_BASE_URL}/api/providers/verify-reset-otp`, {
        email: forgotEmail,
        otp: resetOtp
      });

      if (response.data.success) {
        setActiveTab('reset-password');
        Alert.alert('Success', 'OTP verified successfully');
      } else {
        throw new Error('Invalid OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !newConfirmPassword) {
      Alert.alert('Error', 'Please enter both passwords');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== newConfirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post(`${API_BASE_URL}/api/providers/reset-password`, {
        email: forgotEmail,
        otp: resetOtp,
        newPassword
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password reset successfully!', [
          { 
            text: 'OK', 
            onPress: () => {
              clearForms();
              setActiveTab('login');
              // Reset capsule to login position
              Animated.spring(tabSlideAnim, {
                toValue: 0,
                tension: 120,
                friction: 8,
                useNativeDriver: false,
              }).start();
            }
          }
        ]);
      } else {
        throw new Error('Password reset failed');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    if (!verificationEmail) {
      Alert.alert('Error', 'No email address found for resending OTP');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(`${API_BASE_URL}/api/providers/resend-otp`, {
        email: verificationEmail
      });

      if (response.data.success) {
        Alert.alert('Success', 'New OTP sent to your email');
      } else {
        Alert.alert('Error', 'Failed to resend OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const resendResetOTP = async () => {
    try {
      const response = await api.post(`${API_BASE_URL}/api/providers/resend-reset-otp`, { 
        email: forgotEmail 
      });
      if (response.data.success) {
        Alert.alert('Success', 'New OTP sent to your email');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  const clearForms = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setConfirmPassword('');
    setOtp('');
    setForgotEmail('');
    setResetOtp('');
    setNewPassword('');
    setNewConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowNewPassword(false);
    setShowNewConfirmPassword(false);
    setIsRegisterSubmitted(false);
    setIsLoginSubmitted(false);
  };

  const renderLoginForm = () => (
    <>
      <FloatingInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        inputRef={loginEmailRef}
        onSubmitEditing={() => focusNextField(loginPasswordRef)}
        returnKeyType="next"
        editable={!isLoginSubmitted}
      />

      <FloatingInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        showPasswordToggle={true}
        onTogglePassword={() => setShowPassword(!showPassword)}
        autoCorrect={false}
        inputRef={loginPasswordRef}
        onSubmitEditing={handleLogin}
        returnKeyType="done"
        editable={!isLoginSubmitted}
      />

      {/* Forgot Password */}
      <TouchableOpacity 
        style={styles.forgotPasswordContainer}
        onPress={() => switchTab('forgot-password')}
        disabled={isLoginSubmitted}
      >
        <Text style={[styles.forgotPassword, isLoginSubmitted && styles.disabledText]}>
          Forgot Password?
        </Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginBtnWrapper, (isLoading || isLoginSubmitted) && styles.disabledButton]}
        onPress={handleLogin}
        disabled={isLoading || isLoginSubmitted}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#15803d', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text  weight='bold' style={styles.loginBtnText}>
              {isLoginSubmitted ? 'Logging in...' : 'Login'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Sign Up Link */}
      <View style={styles.signupLink}>
        <Text weight='bold' style={styles.signupText}>Don't have an account? </Text>
        <TouchableOpacity 
          onPress={() => switchTab('register')}
          disabled={isLoginSubmitted}
        >
          <Text   weight='bold'style={[styles.signupLinkText, isLoginSubmitted && styles.disabledText]}>
            Sign Up
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderRegisterForm = () => (
    <>
      <FloatingInput
        label="Full Name"
        value={name}
       onChangeText={(text) => {
    // Limit to letters and spaces
    if (/^[a-zA-Z\s]*$/.test(text) || text === '') {
      setName(text);
    }
  }}

        autoCapitalize="words"
        autoCorrect={false}
        inputRef={nameRef}
        onSubmitEditing={() => focusNextField(emailRef)}
        returnKeyType="next"
        editable={!isRegisterSubmitted}
        maxLength={50}
        placeholder="Enter your full name"
      />

      <FloatingInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        inputRef={emailRef}
        onSubmitEditing={() => focusNextField(phoneRef)}
        returnKeyType="next"
        editable={!isRegisterSubmitted}
         placeholder="example@domain.com"
      />

      <FloatingInput
        label="Phone Number"
        value={phone}
        onChangeText={(text) => {
    // Only allow numbers
    const cleanedText = text.replace(/[^0-9]/g, '');
    // Limit to 10 digits
    if (cleanedText.length <= 10) {
      setPhone(cleanedText);
    }
  }}
        keyboardType="phone-pad"
        autoCorrect={false}
        maxLength={10}
        inputRef={phoneRef}
        onSubmitEditing={() => focusNextField(passwordRef)}
        returnKeyType="next"
        editable={!isRegisterSubmitted}
      />

      <FloatingInput
  label="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry={!showPassword}
  showPasswordToggle={true}
  onTogglePassword={() => setShowPassword(!showPassword)}
  autoCorrect={false}
  inputRef={passwordRef}
  onSubmitEditing={() => focusNextField(confirmPasswordRef)}
  returnKeyType="next"
  editable={!isRegisterSubmitted}
  placeholder="Minimum 4 characters"
/>

     <FloatingInput
  label="Confirm Password"
  value={confirmPassword}
  onChangeText={setConfirmPassword}
  secureTextEntry={!showConfirmPassword}
  showPasswordToggle={true}
  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
  autoCorrect={false}
  inputRef={confirmPasswordRef}
  onSubmitEditing={handleRegister}
  returnKeyType="done"
  editable={!isRegisterSubmitted}
  placeholder="Re-enter your password"
/>

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.loginBtnWrapper, (isLoading || isRegisterSubmitted) && styles.disabledButton]}
        onPress={handleRegister}
        disabled={isLoading || isRegisterSubmitted}
        activeOpacity={0.8}
      >
        <LinearGradient
         colors={['#15803d', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text  weight='bold' style={styles.loginBtnText}>
              {isRegisterSubmitted ? 'Submitted' : 'Create Account'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.signupLink}>
        <Text  weight='bold' style={styles.signupText}>Already have an account? </Text>
        <TouchableOpacity 
          onPress={() => switchTab('login')}
          disabled={isRegisterSubmitted}
        >
          <Text  weight='bold' style={[styles.signupLinkText, isRegisterSubmitted && styles.disabledText]}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderVerifyForm = () => (
    <>
      {/* Verification Icon */}
      <View style={styles.verifyIconContainer}>
        <View style={styles.verifyIcon}>
          <Ionicons name="mail-outline" size={60} color="#15803d" />
        </View>
      </View>

      {/* Email Display */}
      <FloatingInput
        label="Email"
        value={verificationEmail}
        onChangeText={() => {}}
        editable={false}
      />

      {/* OTP Input */}
      <View style={styles.inputGroup}>
        <Text  weight='bold' style={styles.label}>Enter OTP</Text>
        <OTPInputBoxes otp={otp} setOtp={setOtp} length={4} />
      </View>

      {/* Resend OTP */}
     <TouchableOpacity 
  style={styles.forgotPasswordContainer} 
  onPress={handleResendVerificationOTP}
  disabled={isLoading}
>
  <Text weight='bold' style={[styles.forgotPassword, isLoading && styles.disabledText]}>
    Resend OTP
  </Text>
</TouchableOpacity>

      {/* Verify Button */}
      <TouchableOpacity
        style={[styles.loginBtnWrapper, isLoading && styles.disabledButton]}
        onPress={handleVerifyOTP}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
         colors={['#15803d', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text  weight='bold' style={styles.loginBtnText}>Verify OTP</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.signupLink}>
        <Text  weight='bold' style={styles.signupText}>Want to go back? </Text>
        <TouchableOpacity onPress={() => switchTab('login')}>
          <Text style={styles.signupLinkText}>Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderForgotPasswordForm = () => (
    <>
      {/* Forgot Password Icon */}
      <View style={styles.verifyIconContainer}>
        <View style={styles.verifyIcon}>
          <Ionicons name="lock-closed-outline" size={60} color="#15803d" />
        </View>
      </View>

      <Text  weight='bold' style={styles.subtitle}>Enter your email to receive a password reset OTP</Text>
      
      <FloatingInput
        label="Email"
        value={forgotEmail}
        onChangeText={setForgotEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        inputRef={forgotEmailRef}
        onSubmitEditing={handleSendResetOTP}
        returnKeyType="send"
      />

      <TouchableOpacity
        style={[styles.loginBtnWrapper, isLoading && styles.disabledButton]}
        onPress={handleSendResetOTP}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
         colors={['#15803d', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Send OTP</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.signupLink}>
        <Text   weight='bold'style={styles.signupText}>Remember your password? </Text>
        <TouchableOpacity onPress={() => switchTab('login')}>
          <Text  weight='bold' style={styles.signupLinkText}>Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderForgotOTPForm = () => (
    <>
      {/* Verification Icon */}
      <View style={styles.verifyIconContainer}>
        <View style={styles.verifyIcon}>
          <Ionicons name="mail-outline" size={60} color="#15803d" />
        </View>
      </View>

      <Text  weight='bold' style={styles.subtitle}>Enter the 4-digit OTP sent to {forgotEmail}</Text>

      {/* Email Display */}
      <FloatingInput
        label="Email"
        value={forgotEmail}
        onChangeText={() => {}}
        editable={false}
      />
      
      {/* OTP Input */}
      <View style={styles.inputGroup}>
        <Text  weight='bold' style={styles.label}>Enter OTP</Text>
        <OTPInputBoxes otp={resetOtp} setOtp={setResetOtp} length={4} />
      </View>
      
      <TouchableOpacity 
        style={styles.forgotPasswordContainer} 
        onPress={resendResetOTP}
        disabled={isLoading}
      >
        <Text  weight='bold' style={[styles.forgotPassword, isLoading && styles.disabledText]}>
          Didn't receive OTP? Resend
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.loginBtnWrapper, isLoading && styles.disabledButton]}
        onPress={handleVerifyResetOTP}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
        colors={['#15803d', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginBtnText}>Verify OTP</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.signupLink}>
        <Text  weight='bold' style={styles.signupText}>Want to go back? </Text>
        <TouchableOpacity onPress={() => switchTab('login')}>
          <Text  weight='bold' style={styles.signupLinkText}>Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderResetPasswordForm = () => (
    <>
      {/* Reset Password Icon */}
      <View style={styles.verifyIconContainer}>
        <View style={styles.verifyIcon}>
          <Ionicons name="key-outline" size={60} color="#15803d" />
        </View>
      </View>

      <Text  weight='bold' style={styles.subtitle}>Create your new password</Text>
      
      <FloatingInput
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showNewPassword}
        showPasswordToggle={true}
        onTogglePassword={() => setShowNewPassword(!showNewPassword)}
        inputRef={newPasswordRef}
        onSubmitEditing={() => focusNextField(newConfirmPasswordRef)}
        returnKeyType="next"
      />

      <FloatingInput
        label="Confirm New Password"
        value={newConfirmPassword}
        onChangeText={setNewConfirmPassword}
        secureTextEntry={!showNewConfirmPassword}
        showPasswordToggle={true}
        onTogglePassword={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
        inputRef={newConfirmPasswordRef}
        onSubmitEditing={handleResetPassword}
        returnKeyType="done"
      />

      <TouchableOpacity
        style={[styles.loginBtnWrapper, isLoading && styles.disabledButton]}
        onPress={handleResetPassword}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
        colors={['#15803d', '#15803d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.loginBtn}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text  weight='bold' style={styles.loginBtnText}>Reset Password</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Back to Login Link */}
      <View style={styles.signupLink}>
        <Text  weight='bold' style={styles.signupText}>Want to go back? </Text>
        <TouchableOpacity onPress={() => switchTab('login')}>
          <Text   weight='bold' style={styles.signupLinkText}>Login</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'login': return 'Get Started With Us';
      case 'register': return 'Create an Account';
      case 'verify': return 'Verify Your Email';
      case 'forgot-password': return 'Forgot Password';
      case 'forgot-otp': return 'Verify OTP';
      case 'reset-password': return 'Reset Password';
      default: return 'Get Started With Us';
    }
  };

  const getHeaderSubtitle = () => {
    switch (activeTab) {
      case 'login': return 'Sign in to your Account';
      case 'register': return 'Signup your account';
      case 'verify': return 'Enter OTP';
      case 'forgot-password': return 'Reset your password';
      case 'forgot-otp': return 'Enter verification code';
      case 'reset-password': return 'Create new password';
      default: return 'Sign in to your Account';
    }
  };

  const renderTabs = () => {
    // Hide tabs for special flows
    if (['verify', 'forgot-password', 'forgot-otp', 'reset-password'].includes(activeTab)) {
      return null;
    }

    return (
      <Animated.View style={styles.tabContainer}>
        <Animated.View 
          style={[
            styles.tabIndicator,
            {
              transform: [{
                translateX: tabSlideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, width/2 - 34],
                })
              }],
              shadowOpacity: tabSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.4],
              }),
              elevation: tabSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [3, 5],
              }),
            }
          ]} 
        >
          <LinearGradient
           colors={['#15803d', '#15803d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabIndicatorGradient}
          />
        </Animated.View>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => switchTab('login')}
          activeOpacity={0.7}
        >
          <Text  weight='bold' style={[
            styles.tabText,
            activeTab === 'login' ? styles.activeTabText : styles.inactiveTabText
          ]}>
            Login
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => switchTab('register')}
          activeOpacity={0.7}
        >
          <Text  weight='bold' style={[
            styles.tabText,
            activeTab === 'register' ? styles.activeTabText : styles.inactiveTabText
          ]}>
            Register
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <>
      <SafeAreaView  edges={['left','right','bottom']} style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text  weight='bold' style={styles.headerTitle}>{getHeaderTitle()}</Text>
              <Text  weight='bold' style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
            </View>

            {/* Tab Buttons */}
            {renderTabs()}

            {/* Form Container */}
            <View style={styles.formContainer}>
              {activeTab === 'login' && renderLoginForm()}
              {activeTab === 'register' && renderRegisterForm()}
              {activeTab === 'verify' && renderVerifyForm()}
              {activeTab === 'forgot-password' && renderForgotPasswordForm()}
              {activeTab === 'forgot-otp' && renderForgotOTPForm()}
              {activeTab === 'reset-password' && renderResetPasswordForm()}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 30,
    paddingBottom: 40,
    backgroundColor: '#ffff',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 45,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  tabContainer: {
    position: 'relative',
    flexDirection: 'row',
    marginHorizontal: 30,
    marginBottom: 30,
    backgroundColor: '#e9ecef',
    borderRadius: 25,
    padding: 4,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 0,
    width: width/2 - 34,
    height: 42,
    borderRadius: 21,
    shadowColor: '#15803d',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden', // Important for gradient to respect borderRadius
  },
  tabIndicatorGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,      // 🔥 important
  elevation: 10,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '700',
  },
  inactiveTabText: {
    color: '#666',
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 30,
    flex: 1,
  },
  // Floating Input Styles
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
  floatingInputWithIcon: {
    paddingRight: 50,
  },
  floatingEyeIcon: {
    position: 'absolute',
    right: 16,
    top: 19,
    padding: 4,
  },
  disabledInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  disabledLabel: {
    position: 'absolute',
    left: 20,
    top: -10,
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    fontWeight: '500',
    zIndex: 1,
  },
  disabledInputText: {
    color: '#6B7280',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  // Button Styles
  loginBtnWrapper: {
    borderRadius: 25,
    height: 52,
    marginBottom: 30,
    shadowColor: '#15803d',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden', // Important for gradient
  },
  loginBtn: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Legacy styles for OTP section
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  verifyIconContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  verifyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#15803d',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPassword: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '500',
  },
  signupLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  signupText: {
    color: '#0f0e0eff',
    fontSize: 16,
  },
  signupLinkText: {
    color: '#15803d',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default AuthScreen;