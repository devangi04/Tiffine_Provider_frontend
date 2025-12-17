// app/config/env.ts - SUPER SIMPLE VERSION

// Single environment variable for everything
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.3:5000';

// Log for debugging
console.log('🔗 Using API URL:', API_URL);


