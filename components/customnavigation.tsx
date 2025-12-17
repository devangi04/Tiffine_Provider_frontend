// hooks/useCustomNavigation.ts
import React, { createContext, useContext, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface CustomNavigationContextType {
  navigate: (path: string, params?: any) => void;
  goBack: () => void;
  currentScreen: React.ReactNode | null;
  nextScreen: React.ReactNode | null;
  currentPan: Animated.Value;
  nextPan: Animated.Value;
}

const CustomNavigationContext = createContext<CustomNavigationContextType | null>(null);

export const useCustomNavigation = () => {
  const context = useContext(CustomNavigationContext);
  if (!context) {
    throw new Error('useCustomNavigation must be used within CustomNavigationProvider');
  }
  return context;
};

export const CustomNavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const currentPan = useRef(new Animated.Value(0)).current; // Current screen position
  const nextPan = useRef(new Animated.Value(width)).current; // Next screen starts off-screen

  const [currentScreen, setCurrentScreen] = useState<React.ReactNode>(children);
  const [nextScreen, setNextScreen] = useState<React.ReactNode | null>(null);

  const navigate = (path: string, params?: any) => {
    setNextScreen(children); // Set placeholder or actual screen

    // Animate like iOS push
    Animated.parallel([
      Animated.timing(currentPan, {
        toValue: -width * 0.3, // Shift current slightly left
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(nextPan, {
        toValue: 0, // Bring next from right
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (params) {
        router.push({ pathname: path, params });
      } else {
        router.push(path);
      }
      // Reset states
      setCurrentScreen(nextScreen);
      setNextScreen(null);
      currentPan.setValue(0);
      nextPan.setValue(width);
    });
  };

  const goBack = () => {
    Animated.parallel([
      Animated.timing(currentPan, {
        toValue: width, // Current goes right
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(nextPan, {
        toValue: 0, // Previous comes back
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      router.back();
      setCurrentScreen(nextScreen);
      setNextScreen(null);
      currentPan.setValue(0);
      nextPan.setValue(width);
    });
  };

  return (
    <CustomNavigationContext.Provider
      value={{ navigate, goBack, currentScreen, nextScreen, currentPan, nextPan }}
    >
      <View style={StyleSheet.absoluteFill}>
        {currentScreen && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: currentPan }] },
            ]}
          >
            {currentScreen}
          </Animated.View>
        )}
        {nextScreen && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [{ translateX: nextPan }],
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 8,
              },
            ]}
          >
            {nextScreen}
          </Animated.View>
        )}
      </View>
    </CustomNavigationContext.Provider>
  );
};
