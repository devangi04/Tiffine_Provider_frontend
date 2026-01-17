// app/components/SplashScreen.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ztext';
import { Image } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function CustomSplashScreen() {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const textSlideUp = useRef(new Animated.Value(30)).current;
  
  // Floating shapes animation
  const shapes = useRef(
    Array(5).fill(0).map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 5,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.spring(textSlideUp, {
        toValue: 0,
        tension: 50,
        friction: 7,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous logo rotation
    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 15000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Animate floating shapes
    shapes.forEach((shape, index) => {
      // Fade in
      Animated.timing(shape.opacity, {
        toValue: 0.2,
        duration: 1000,
        delay: index * 200,
        useNativeDriver: true,
      }).start();

      // Floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(shape.translateY, {
            toValue: -20,
            duration: 2000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(shape.translateY, {
            toValue: 0,
            duration: 2000 + index * 500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Floating shapes positions
  const shapePositions = [
    { top: '15%', left: '10%', size: 40 },
    { top: '25%', right: '12%', size: 30 },
    { bottom: '30%', left: '5%', size: 35 },
    { bottom: '20%', right: '8%', size: 25 },
    { top: '50%', left: '3%', size: 45 },
  ];

  return (
    <LinearGradient
      colors={['#15803d', '#15803d', '#a8ffcbff']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Floating background shapes */}
      {shapes.map((shape, index) => (
        <Animated.View
          key={index}
          style={[
            styles.floatingShape,
            {
              ...shapePositions[index],
              width: shapePositions[index].size,
              height: shapePositions[index].size,
              opacity: shape.opacity,
              transform: [{ translateY: shape.translateY }],
            },
          ]}
        />
      ))}

      <Animated.View 
        style={[
          styles.content,
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        {/* Logo container with rotation */}
        {/* <Animated.View 
          style={[
            styles.logoContainer,
            { 
              transform: [
                { scale: logoScale },
                { rotate: spin }
              ] 
            }
          ]}
        > */}
          <View style={styles.logoCircle}>
            <Image 
              source={require('@/assets/images/splashnew.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        {/* </Animated.View> */}

        {/* Text content with slide up animation */}
        <Animated.View 
          style={[
            styles.textContainer,
            { transform: [{ translateY: textSlideUp }] }
          ]}
        >
          <View style={styles.imagecontainer}>
            <Image 
              source={require('@/assets/images/White_Logo_Transnew.png')}
              style={styles.imagetext}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.providerBadgeContainer}>
            <Text style={styles.providerBadge}>PROVIDER</Text>
          </View>
          
          <Text style={styles.tagline}>Manage Your Kitchen Business</Text>
          
          {/* Loading indicator */}
          <View style={styles.loadingContainer}>
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, { opacity: fadeAnim }]} />
              <Animated.View style={[styles.dot, { opacity: fadeAnim, animationDelay: '0.2s' }]} />
              <Animated.View style={[styles.dot, { opacity: fadeAnim, animationDelay: '0.4s' }]} />
            </View>
            <Text style={styles.loadingText}>Preparing your kitchen...</Text>
          </View>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: 'center',
  },
  imagecontainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  imagetext: {
    height: 100,
    width: 100,
  },
  providerBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 30,
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 15,
  },
  providerBadge: {
    fontSize: 14,
    color: '#fff',
    letterSpacing: 3,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: 16,
    color: '#fff',
    letterSpacing: 1,
    fontWeight: '500',
    opacity: 0.95,
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginHorizontal: 4,
    opacity: 0.7,
    animationName: 'pulse',
    animationDuration: '1.5s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
  loadingText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  floatingShape: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
});