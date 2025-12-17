// app/forgotpassword.tsx
import React, { useState, useRef } from 'react';
import { 
  View,  
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import FloatingInput from '@/components/floatinginput';
import OTPInputBoxes from '@/components/otpbox';
import {TextStyles} from '@/components/ztext';
import { API_URL } from './config/env';

const API_BASE_URL = API_URL;

const ForgotPasswordScreen = () => {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOTP = async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/providers/forgot-password`, { email });
      
      if (response.data.success) {
        setStep('otp');
        Alert.alert('Success', 'OTP sent to your email');
      } else {
        throw new Error(response.data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 4) {
      Alert.alert('Error', 'Please enter a valid 4-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/providers/verify-reset-otp`, {
        email,
        otp
      });

      if (response.data.success) {
        setStep('reset');
        Alert.alert('Success', 'OTP verified successfully');
      } else {
        throw new Error(response.data.error || 'Invalid OTP');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter both passwords');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/providers/reset-password`, {
        email,
        otp,
        newPassword
      });

      if (response.data.success) {
        Alert.alert('Success', 'Password reset successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error(response.data.error || 'Password reset failed');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/providers/resend-reset-otp`, { email });
      if (response.data.success) {
        Alert.alert('Success', 'New OTP sent to your email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={styles.subtitle}>Enter your email to receive a password reset OTP</Text>
      
      <FloatingInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        onSubmitEditing={handleSendOTP}
        returnKeyType="send"
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleSendOTP}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderOTPStep = () => (
    <>
      <Text style={styles.subtitle}>Enter the 4-digit OTP sent to {email}</Text>
      
      <OTPInputBoxes otp={otp} setOtp={setOtp} length={4} />
      
      <TouchableOpacity style={styles.resendContainer} onPress={resendOTP}>
        <Text style={styles.resendText}>Didn't receive OTP? Resend</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleVerifyOTP}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderResetStep = () => (
    <>
      <Text style={styles.subtitle}>Create your new password</Text>
      
      <FloatingInput
        label="New Password"
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showPassword}
        showPasswordToggle={true}
        onTogglePassword={() => setShowPassword(!showPassword)}
      />

      <FloatingInput
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirmPassword}
        showPasswordToggle={true}
        onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        onSubmitEditing={handleResetPassword}
        returnKeyType="done"
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.disabledButton]}
        onPress={handleResetPassword}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Forgot Password</Text>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, step === 'email' && styles.activeStep]}>
              <Text style={[styles.stepText, step === 'email' && styles.activeStepText]}>1</Text>
            </View>
            <View style={[styles.progressLine, step !== 'email' && styles.activeLine]} />
            <View style={[styles.progressStep, step === 'otp' && styles.activeStep]}>
              <Text style={[styles.stepText, step === 'otp' && styles.activeStepText]}>2</Text>
            </View>
            <View style={[styles.progressLine, step === 'reset' && styles.activeLine]} />
            <View style={[styles.progressStep, step === 'reset' && styles.activeStep]}>
              <Text style={[styles.stepText, step === 'reset' && styles.activeStepText]}>3</Text>
            </View>
          </View>

          <View style={styles.formContainer}>
            {step === 'email' && renderEmailStep()}
            {step === 'otp' && renderOTPStep()}
            {step === 'reset' && renderResetStep()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#007AFF',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeStepText: {
    color: '#fff',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e9ecef',
    marginHorizontal: 10,
  },
  activeLine: {
    backgroundColor: '#007AFF',
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#99c2ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;