import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Text from '@/components/ztext';

interface HelpButtonProps {
  onPress: () => void;
  visible?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  label?: string;
}

const HelpButton = ({
  onPress,
  visible = true,
  position = 'bottom-right',
  label = 'Help',
}: HelpButtonProps) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  if (!visible) return null;

  const startPulseAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    startPulseAnimation();
    onPress();
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'bottom-left':
        return { bottom: 80, left: 20 };
      case 'top-right':
        return { top: Platform.OS === 'ios' ? 50 : 20, right: 20 };
      case 'top-left':
        return { top: Platform.OS === 'ios' ? 50 : 20, left: 20 };
      default: // bottom-right
        return { bottom: 80, right: 20 };
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={[styles.container, getPositionStyle()]}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <LinearGradient
          colors={['#2c95f8', '#1a73e8']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
          {label && (
            <Text weight="semiBold" style={styles.label}>
              {label}
            </Text>
          )}
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 4,
  },
});

export default HelpButton;