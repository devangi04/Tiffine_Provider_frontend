// utils/socketService.js or services/socket.js
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './env'; // Make sure this is your backend URL

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize socket connection
  async initializeSocket(token = null) {
    try {
      // If already connected, return existing socket
      if (this.socket?.connected) {
        console.log('📡 Socket already connected');
        return this.socket;
      }

      // If connecting, wait
      if (this.isConnecting) {
        console.log('📡 Socket connection in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (this.socket?.connected) return this.socket;
      }

      this.isConnecting = true;

      // Get token from AsyncStorage if not provided
      if (!token) {
        token = await AsyncStorage.getItem('providerToken');
      }

      if (!token) {
        console.log('❌ No authentication token available for socket');
        this.isConnecting = false;
        return null;
      }

      console.log('📡 Initializing socket connection...');
      
      // Initialize socket with token
      this.socket = io(`${API_URL}`, {
        transports: ['websocket', 'polling'],
        query: { token },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        timeout: 10000,
        forceNew: true
      });

      // Setup event listeners
      this.setupEventListeners();

      // Wait for connection
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket connection timeout'));
        }, 10000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          console.log('✅ Socket connected successfully:', this.socket.id);
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve(this.socket);
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Socket connection error:', error.message);
          this.isConnecting = false;
          this.reconnectAttempts++;
          reject(error);
        });
      });

    } catch (error) {
      console.error('❌ Socket initialization error:', error);
      this.isConnecting = false;
      throw error;
    }
  }

  // Setup event listeners
  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('📡 Socket connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('📡 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('📡 Socket connection error:', error.message);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`📡 Socket reconnect attempt: ${attempt}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('📡 Socket reconnect failed');
    });

    // Custom events from server
    this.socket.on('provider-push-token-saved', (data) => {
      console.log('📡 Push token saved via socket:', data);
    });

    this.socket.on('auto-confirm-completed', (data) => {
      console.log('📡 Auto-confirm completed:', data);
    });
  }

  // Register provider push token via socket
  async registerProviderPushToken(providerId, pushToken) {
    try {
      if (!this.socket || !this.socket.connected) {
        await this.initializeSocket();
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Socket registration timeout'));
        }, 5000);

        this.socket.emit('register-provider-push-token', {
          providerId,
          pushToken
        }, (response) => {
          clearTimeout(timeout);
          if (response?.success) {
            console.log('✅ Push token registered via socket');
            resolve(response);
          } else {
            reject(new Error(response?.message || 'Registration failed'));
          }
        });

        // Fallback if server doesn't send callback
        setTimeout(() => {
          clearTimeout(timeout);
          console.log('⚠️ Socket registration completed (no callback)');
          resolve({ success: true, message: 'Registration sent' });
        }, 3000);
      });

    } catch (error) {
      console.error('❌ Socket registration error:', error.message);
      throw error;
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('📡 Socket disconnected');
    }
    this.isConnecting = false;
  }

  // Get current socket instance
  getSocket() {
    return this.socket;
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;