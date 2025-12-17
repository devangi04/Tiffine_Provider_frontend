// app/verifyotp.tsx
import React, { useState } from "react";
import { 
  View, 
  TextInput,  
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ActivityIndicator 
} from "react-native";
import axios from "axios";
import { useRouter, useLocalSearchParams } from "expo-router";
import {Text,TextStyles} from '@/components/ztext';
import { API_URL } from "./config/env";
API_URL
export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { email } = useLocalSearchParams();
  const router = useRouter();

  const API_BASE_URL = API_URL;

  const handleVerify = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Error", "Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/providers/verify-otp`, 
        { email, otp }
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
    } catch (err) {
      Alert.alert("Error", err.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>Enter OTP sent to {email}</Text>
      
      <TextInput
        placeholder="6-digit OTP"
        value={otp}
        onChangeText={setOtp}
        style={styles.input}
        keyboardType="number-pad"
        maxLength={6}
      />
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.disabledButton]} 
        onPress={handleVerify}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", marginBottom: 30, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 15, fontSize: 18, marginBottom: 20, textAlign: "center" },
  button: { backgroundColor: "#007AFF", padding: 15, borderRadius: 8, alignItems: "center" },
  disabledButton: { backgroundColor: "#99C2FF" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" }
});