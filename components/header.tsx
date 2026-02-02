import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Pressable,
} from "react-native";
import {Text,TextStyles} from '@/components/ztext';
import { ArrowLeft, User } from "lucide-react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showUserButton?: boolean;
  onBackPress?: () => void;
  onUserPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  subtitleColor?: string;
  statusBarOverlay?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBackButton = true,
  showUserButton = true,
  onBackPress,
  onUserPress,
  backgroundColor = "#15803d",
  textColor = "#fff",
  subtitleColor = "#e3e3e3ff",
  statusBarOverlay = false,
}) => {
  const router = useRouter();
  const pathname = usePathname(); // Get current route

  const insets = useSafeAreaInsets();
  
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
    } else {
      // Check if we're already on the profile page
      if (pathname === "/profile") {
        // Already on profile page, do nothing
        return;
      }
      router.push("/profile");
    }
  };

 return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          paddingTop: insets.top
        },
      ]}
    >
      <View style={styles.topSection}>
        {showBackButton ? (
          <Pressable onPress={onBackPress ?? router.back} style={styles.backButton}>
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
            <Text style={[styles.headerSubtitle, { color: subtitleColor }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {showUserButton ? (
          <TouchableOpacity
            style={styles.userButton}
            onPress={() => pathname !== "/profile" && router.push("/profile")}
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
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
   
  },
  backButton: {
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
  userButton: {
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

export default Header;