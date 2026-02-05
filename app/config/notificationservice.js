// utils/notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './env';// Your backend URL
import Constants from 'expo-constants';

// Configure how notifications appear when app is in foreground
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications() {
  // Only physical devices
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return null;
  }

  // 1️⃣ Check permission
  const permission = await Notifications.getPermissionsAsync();

  if (!permission.granted) {
    if (permission.canAskAgain) {
      const request = await Notifications.requestPermissionsAsync();
      if (!request.granted) {
        console.log('Notification permission denied');
        return null;
      }
    } else {
      // 🚨 Permanently blocked
      console.log('Notification permission BLOCKED');
      return 'BLOCKED';
    }
  }

  // 2️⃣ Get Expo push token (IMPORTANT)
  try {
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
    ).data;

    await AsyncStorage.setItem('expoPushToken', token);
    return token;
  } catch (error) {
    console.error('Error getting Expo push token:', error);
    return null;
  }
}


// Save token to your backend
export async function savePushTokenToBackend(token, providerId) {
  try {
    const response = await axios.post(`${API_URL}/api/provider/save-push-token`, {
      providerId,
      expoPushToken: token
    });
    
    return response.data;
  } catch (error) {
    console.error('Error saving push token to backend:', error);
    throw error;
  }
}

// Check if notifications are enabled
export async function checkNotificationPermissions() {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted;
}

// Setup notification listeners for when app is in foreground
export function setupNotificationListeners(navigation) {
  // Listen for notifications received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
  });

  // Listen for user tapping on notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data.type === 'auto_confirm') {
      navigation.navigate('Responses', { 
        date: data.date,
        mealType: data.mealType 
      });
    } else if (data.type === 'menu') {
      navigation.navigate('Menu');
    }
  });

  // Return cleanup functions
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

// Send a local notification (for testing)
export async function sendLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Send immediately
  });
}