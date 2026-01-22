// app/verifyotp.tsx
import React, { useState, useEffect } from "react";
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import api from './api/api';
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import {Text,TextStyles} from '@/components/ztext';
import { API_URL } from "./config/env";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { email } = useLocalSearchParams();
  const router = useRouter();

  const API_BASE_URL = API_URL;

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const startCountdown = () => {
    setCountdown(60); // 60 seconds
  };

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    if (!email) {
      Alert.alert("Error", "Email not found. Please try registering again.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(
        `${API_BASE_URL}/api/providers/verify-otp`, 
        { 
          email: Array.isArray(email) ? email[0] : email, 
          otp 
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        Alert.alert("Success", "Account verified successfully!", [
          {
            text: "Continue to Login",
            onPress: () => {
              router.replace("/auth");
            }
          }
        ]);
      } else {
        Alert.alert("Error", response.data.error || "OTP verification failed");
      }
    } catch (err: any) {
      let errorMessage = "OTP verification failed. Please try again.";
      
      if (err.response) {
        errorMessage = err.response.data?.error || 
                      err.response.data?.message || 
                      `Server error (${err.response.status})`;
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      Alert.alert("Error", "Email not found");
      return;
    }

    setResendLoading(true);

    try {
      const response = await api.post(
        `${API_BASE_URL}/api/providers/resend-otp`,
        { email: Array.isArray(email) ? email[0] : email },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      if (response.data.success) {
        Alert.alert("Success", "OTP has been resent to your email");
        startCountdown();
      } else {
        throw new Error(response.data.error || "Failed to resend OTP");
      }
    } catch (err: any) {
      let errorMessage = "Failed to resend OTP. Please try again.";
      
      if (err.response) {
        errorMessage = err.response.data?.error || 
                      err.response.data?.message || 
                      `Server error (${err.response.status})`;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const displayEmail = Array.isArray(email) ? email[0] : email;

  return (
    <SafeAreaView style={styles.container}>
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
            <Ionicons name="mail-outline" size={80} color="#007AFF" style={styles.icon} />
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit verification code sent to
            </Text>
            <Text style={styles.emailText}>{displayEmail}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.inputContainer}>
            <TextInput
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#999"
              value={otp}
              onChangeText={setOtp}
              style={styles.input}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus={true}
              editable={!isLoading}
            />
          </View>

          {/* Verify Button */}
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.disabledButton]} 
            onPress={handleVerify}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          {/* Resend OTP Section */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity 
              onPress={handleResendOtp} 
              disabled={resendLoading || countdown > 0}
            >
              <Text style={[
                styles.resendButtonText,
                (resendLoading || countdown > 0) && styles.disabledResendText
              ]}>
                {resendLoading ? "Sending..." : 
                 countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back to Login */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace("/auth")}
          >
            <Ionicons name="arrow-back" size={16} color="#007AFF" />
            <Text style={styles.backButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
    marginTop: 5,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e5e9",
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: "center",
    backgroundColor: "#fff",
    fontWeight: "600",
    letterSpacing: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 25,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: "#99c2ff",
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    flexWrap: "wrap",
  },
  resendText: {
    color: "#666",
    fontSize: 14,
  },
  resendButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledResendText: {
    color: "#999",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
});