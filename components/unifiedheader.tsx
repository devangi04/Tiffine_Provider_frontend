import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ArrowLeft, User } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAppSelector } from '../app/store/hooks';
import { Text } from '@/components/ztext';

interface UnifiedHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  showUserButton?: boolean;
  onBackPress?: () => void;
  onUserPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  subtitleColor?: string;
  headerType?: 'dashboard' | 'default';
}

const UnifiedHeader: React.FC<UnifiedHeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  showUserButton = true,
  onBackPress,
  onUserPress,
  backgroundColor = '#15803d',
  textColor = '#fff',
  subtitleColor = '#e3e3e3ff',
  headerType = 'default',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const provider = useAppSelector((state) => state.provider);
  const providerName = provider.name || 'User';

  const getInitial = () => {
    if (!providerName || providerName.trim().length === 0) return 'U';
    return providerName.charAt(0).toUpperCase();
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress();
    } else if (pathname !== '/profile') {
      router.push('/profile');
    }
  };

  // Dashboard Header Layout
  if (headerType === 'dashboard') {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.topSection}>
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.initialContainer}>
              <Text weight="bold" style={styles.initialText}>
                {getInitial()}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.nameContainer}>
              <Text weight="bold" style={styles.greeting}>
                Hello,
              </Text>
              <Text weight="bold" style={styles.userName}>
                {providerName}
              </Text>
            </View>
          </View>

          {showUserButton && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleUserPress}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={24} color="#15803d" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Default Header Layout
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.topSection}>
        {showBackButton ? (
          <Pressable
            onPress={handleBackPress}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <ArrowLeft size={24} color="#15803d" />
          </Pressable>
        ) : (
          <View style={styles.placeholderButton} />
        )}

        <View style={styles.titleContainer}>
          <Text weight="bold" style={[styles.headerTitle, { color: textColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text weight="bold" style={[styles.headerSubtitle, { color: subtitleColor }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {showUserButton ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleUserPress}
            activeOpacity={0.7}
          >
            <User size={24} color="#15803d" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderButton} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#15803d',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 0,
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
  iconButton: {
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
  placeholderButton: {
    width: 44,
    height: 44,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default UnifiedHeader;