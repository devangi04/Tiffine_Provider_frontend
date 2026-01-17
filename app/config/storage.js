// // utils/storage.js
// import { MMKV } from 'react-native-mmkv';

// // Create MMKV instance
// export const storage = new MMKV();

// // Helper functions for typed storage
// export const Storage = {
//   // Set value with expiry timestamp
//   set: (key, value, ttlMinutes = 5) => {
//     try {
//       const data = {
//         value,
//         timestamp: Date.now(),
//         expiry: ttlMinutes * 60 * 1000 // Convert minutes to milliseconds
//       };
//       storage.set(key, JSON.stringify(data));
//     } catch (error) {
//       console.error('Storage set error:', error);
//     }
//   },
  
//   // Get value with expiry check
//   get: (key) => {
//     try {
//       const json = storage.getString(key);
//       if (!json) return null;
      
//       const data = JSON.parse(json);
//       const now = Date.now();
      
//       // Check if cache has expired
//       if (now - data.timestamp > data.expiry) {
//         storage.delete(key); // Clean up expired cache
//         return null;
//       }
      
//       return data.value;
//     } catch (error) {
//       console.error('Storage get error:', error);
//       return null;
//     }
//   },
  
//   // Delete key
//   delete: (key) => {
//     storage.delete(key);
//   },
  
//   // Clear all cache for this provider
//   clearProviderCache: (providerId) => {
//     const keys = storage.getAllKeys();
//     keys.forEach(key => {
//       if (key.includes(`provider_${providerId}`)) {
//         storage.delete(key);
//       }
//     });
//   },
  
//   // Check if cache exists and is valid
//   hasValidCache: (key) => {
//     const value = Storage.get(key);
//     return value !== null;
//   }
// };