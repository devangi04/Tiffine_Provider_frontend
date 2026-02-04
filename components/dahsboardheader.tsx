// DashboardHeader.tsx - Header without search
import React from 'react';
import { View, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../app/store/hooks';
import { Text } from '@/components/ztext';
import { User } from "lucide-react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DashboardHeaderProps {
  profileImage?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ profileImage }) => {
  const router = useRouter();
  const provider = useAppSelector((state) => state.provider);
  const providerName = provider.name || 'User';
  
  const insets = useSafeAreaInsets(); // <-- Get safe area for status bar/notch

  // Get first initial from provider name
  const getInitial = () => {
    if (!providerName || providerName.trim().length === 0) return 'U';
    return providerName.charAt(0).toUpperCase();
  };

  return (
    <>
      <View style={[styles.container]}>
        <View style={styles.topSection}>
          <View style={styles.profileSection}>
            {/* Initial display */}
            <TouchableOpacity style={styles.initialContainer}>
              <Text weight='bold' style={styles.initialText}>
                {getInitial()}
              </Text>
            </TouchableOpacity>

            <View style={styles.nameContainer}>
              <Text weight='bold' style={styles.greeting}>Hello,</Text>
              <Text weight='bold' style={styles.userName}>{providerName}</Text>
            </View>
          </View>

          {/* Profile button */}
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => router.push('./profile')}
          >
            <User size={24} color="#15803d" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#15803d',
    paddingHorizontal: 20,
    padding:20,
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
    color: '#15803d',
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
    fontSize: 24,
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
