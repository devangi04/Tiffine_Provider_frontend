// DashboardHeader.tsx - Header without search
import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../app/store/hooks';
import { Text } from '@/components/ztext';

interface DashboardHeaderProps {
  profileImage?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ profileImage }) => {
  const router = useRouter();
  const provider = useAppSelector((state) => state.provider);
  const providerName = provider.name || 'User';
  
  // Get first initial from provider name
  const getInitial = () => {
    if (!providerName || providerName.trim().length === 0) return 'U';
    return providerName.charAt(0).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.profileSection}>
          {/* Moved initial display to the left side */}
          <TouchableOpacity 
            style={styles.initialContainer}
            onPress={() => router.push('./profile')}
          >
            <Text weight='bold' style={styles.initialText}>
              {getInitial()}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.nameContainer}>
            <Text weight='bold' style={styles.greeting}>Hello,</Text>
            <Text weight='bold' style={styles.userName}>{providerName}</Text>
          </View>
        </View>

        {/* Changed bell icon to profile icon */}
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('./profile')}
        >
          <Ionicons name="person-outline" size={24} color="#004C99" />
        </TouchableOpacity>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    backgroundColor: '#004C99',
    paddingTop: Platform.OS === 'ios' ? 80 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  initialContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  initialText: {
    fontSize: 22,
    color: '#004C99',
  },
  nameContainer: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default DashboardHeader;