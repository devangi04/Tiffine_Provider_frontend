import axios from 'axios';
import Constants from 'expo-constants';
import { API_URL } from '@/app/config/env';

const APP_KEY = Constants.expoConfig?.extra?.APP_KEY;

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  if (APP_KEY) {
    config.headers['x-app-key'] = APP_KEY;
  }
  return config;
});

export default api;
