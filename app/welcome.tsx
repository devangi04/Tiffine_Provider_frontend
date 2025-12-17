import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 

  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  FlatList,
  Animated,
  Easing 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, G, Line, Ellipse, Defs, RadialGradient, Stop } from 'react-native-svg';
import {Text,TextStyles} from '@/components/ztext';

const { width, height } = Dimensions.get('window');

// ==================== WELCOME SPLASH SCREEN ====================
const TiffinManagementIcon = ({ glowAnim }) => (
  <View style={styles.iconContainer}>
    <Animated.View 
      style={[
        styles.glowCircle,
        {
          opacity: glowAnim,
          transform: [{
            scale: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.2]
            })
          }]
        }
      ]}
    />
    <View style={styles.iconCircle}>
      <Svg width="120" height="120" viewBox="0 0 120 120" fill="none">
        <Defs>
          <RadialGradient id="tiffinGradient" cx="50%" cy="50%">
            <Stop offset="0%" stopColor="#7190fa" stopOpacity="0.2" />
            <Stop offset="100%" stopColor="#09d6c8" stopOpacity="0.1" />
          </RadialGradient>
        </Defs>

        <Ellipse cx="60" cy="95" rx="32" ry="5" fill="url(#tiffinGradient)" />

        <G transform="translate(30, 35)">
          <Path
            d="M8 50H52C54 50 55 51 55 53V58C55 60 54 61 52 61H8C6 61 5 60 5 58V53C5 51 6 50 8 50Z"
            fill="#09d6c8"
            stroke="#fff"
            strokeWidth="2"
          />
          <Path
            d="M10 52H50C51 52 51 53 51 54H10C10 53 10 52 10 52Z"
            fill="#fff"
            opacity="0.3"
          />

          <Path
            d="M10 38H50C52 38 53 39 53 41V46C53 48 52 49 50 49H10C8 49 7 48 7 46V41C7 39 8 38 10 38Z"
            fill="#5BA3E0"
            stroke="#fff"
            strokeWidth="2"
          />
          <Path
            d="M12 40H48C49 40 49 41 49 42H12C12 41 12 40 12 40Z"
            fill="#fff"
            opacity="0.3"
          />

          <Path
            d="M12 26H48C50 26 51 27 51 29V34C51 36 50 37 48 37H12C10 37 9 36 9 34V29C9 27 10 26 12 26Z"
            fill="#7190fa"
            stroke="#fff"
            strokeWidth="2"
          />
          <Path
            d="M14 28H46C47 28 47 29 47 30H14C14 29 14 28 14 28Z"
            fill="#fff"
            opacity="0.3"
          />

          <Path
            d="M13 20H47C49 20 50 21 50 23V26H10V23C10 21 11 20 13 20Z"
            fill="#09d6c8"
            stroke="#fff"
            strokeWidth="2"
          />
          
          <Path
            d="M23 14C23 11 26 8 30 8C34 8 37 11 37 14V20H23V14Z"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <Rect x="3" y="42" width="3" height="14" rx="1" fill="#7190fa" stroke="#fff" strokeWidth="1"/>
          <Rect x="54" y="42" width="3" height="14" rx="1" fill="#7190fa" stroke="#fff" strokeWidth="1"/>
        </G>

        <G transform="translate(12, 45)">
          <Path
            d="M8 8C8 5 10 3 12 3C14 3 16 5 16 8V12C16 13 15 14 12 14C9 14 8 13 8 12V8Z"
            fill="#7190fa"
            stroke="#fff"
            strokeWidth="1.5"
          />
          <Path
            d="M12 13V28"
            stroke="#7190fa"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          
          <Path
            d="M20 3V12C20 13 21 14 22 14C23 14 24 13 24 12V3"
            stroke="#09d6c8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <Line x1="20" y1="3" x2="20" y2="10" stroke="#fff" strokeWidth="1.5" />
          <Line x1="24" y1="3" x2="24" y2="10" stroke="#fff" strokeWidth="1.5" />
          <Path
            d="M22 13V28"
            stroke="#09d6c8"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </G>

        <G transform="translate(85, 42)">
          <Rect x="5" y="8" width="16" height="22" rx="2" fill="#fff" stroke="#7190fa" strokeWidth="2"/>
          <Rect x="10" y="5" width="6" height="5" rx="1" fill="#7190fa"/>
          
          <Line x1="8" y1="14" x2="10" y2="16" stroke="#09d6c8" strokeWidth="1.5" strokeLinecap="round"/>
          <Line x1="10" y1="16" x2="14" y2="12" stroke="#09d6c8" strokeWidth="1.5" strokeLinecap="round"/>
          
          <Line x1="8" y1="19" x2="10" y2="21" stroke="#09d6c8" strokeWidth="1.5" strokeLinecap="round"/>
          <Line x1="10" y1="21" x2="14" y2="17" stroke="#09d6c8" strokeWidth="1.5" strokeLinecap="round"/>
          
          <Line x1="8" y1="24" x2="18" y2="24" stroke="#E0E0E0" strokeWidth="1.5" strokeLinecap="round"/>
        </G>

        <Path
          d="M45 22C45 18 44 15 43 12"
          stroke="#FFD54F"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <Path
          d="M60 20C60 16 60 13 60 10"
          stroke="#FFD54F"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />
        <Path
          d="M75 22C75 18 76 15 77 12"
          stroke="#FFD54F"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.8"
        />

        <Circle cx="95" cy="70" r="8" fill="#7190fa" opacity="0.9"/>
        <Path d="M91 70L94 73L99 67" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

        <Circle cx="25" cy="70" r="8" fill="#09d6c8" opacity="0.9"/>
        <Path d="M22 70L25 73L28 67" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>

        <Path d="M35 30L37 32L35 34L33 32Z" fill="#FFD54F" opacity="0.9" />
        <Path d="M85 30L87 32L85 34L83 32Z" fill="#FFD54F" opacity="0.9" />
        <Circle cx="40" cy="70" r="2" fill="#fff" opacity="0.8" />
        <Circle cx="80" cy="70" r="2" fill="#fff" opacity="0.8" />
        
        <Circle cx="20" cy="25" r="3" fill="#fff" opacity="0.6" />
        <Circle cx="100" cy="25" r="3" fill="#fff" opacity="0.6" />
      </Svg>
    </View>
  </View>
);

const FloatingParticles = ({ animations }) => (
  <>
    {animations.map((anim, index) => (
      <Animated.View
        key={index}
        style={[
          styles.particle,
          {
            left: `${15 + index * 20}%`,
            opacity: anim.opacity,
            transform: [
              { translateY: anim.translateY },
              { scale: anim.scale }
            ]
          }
        ]}
      />
    ))}
  </>
);

const DecorativeWaves = ({ animations }) => (
  <>
    <Animated.View 
      style={[
        styles.wave, 
        { 
          top: 80, 
          left: -80, 
          opacity: animations[0],
          transform: [{ 
            rotate: animations[0].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg']
            })
          }]
        }
      ]} 
    />
    <Animated.View 
      style={[
        styles.wave, 
        { 
          top: 180, 
          right: -90, 
          width: 200, 
          height: 200,
          opacity: animations[1],
          transform: [{ 
            rotate: animations[1].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '-90deg']
            })
          }]
        }
      ]} 
    />
    <Animated.View 
      style={[
        styles.wave, 
        { 
          bottom: 200, 
          left: -60, 
          width: 180, 
          height: 180,
          opacity: animations[2],
          transform: [{ 
            rotate: animations[2].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '90deg']
            })
          }]
        }
      ]} 
    />
    <Animated.View 
      style={[
        styles.wave, 
        { 
          bottom: 80, 
          right: -100, 
          width: 220, 
          height: 220,
          opacity: animations[3],
          transform: [{ 
            rotate: animations[3].interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '-180deg']
            })
          }]
        }
      ]} 
    />
  </>
);

// ==================== FEATURE SLIDES DATA ====================
const FEATURES = [
  {
    id: '1',
    title: 'Dashboard',
    subtitle: 'Complete Overview',
    description: 'Search customers globally, view all dishes & menus, customer details, today\'s menu count, Yes/No responses, and new customer overview',
    icon: 'dashboard',
    color: '#7190fa',
  },
  {
    id: '2',
    title: 'Customer Management',
    subtitle: 'All Customer Details',
    description: 'Complete customer list with search functionality. Add, update customer information and manage all customer relationships efficiently',
    icon: 'customers',
    color: '#09d6c8',
  },
  {
    id: '3',
    title: 'Dishes & Categories',
    subtitle: 'Menu Creation',
    description: 'Add, update, delete dishes and custom categories. Organize your complete menu catalog with ease',
    icon: 'dishes',
    color: '#5BA3E0',
  },
  {
    id: '4',
    title: 'Menu Management',
    subtitle: 'Daily Menu Planning',
    description: 'Create day-wise menus, set cutoff times for responses, and track how many times customers can respond',
    icon: 'menu',
    color: '#7190fa',
  },
  {
    id: '5',
    title: 'Payment Tracking',
    subtitle: 'Financial Overview',
    description: 'View all customer payments - pending, partial, and completed. Keep track of all financial transactions in one place',
    icon: 'payment',
    color: '#09d6c8',
  },
  {
    id: '6',
    title: 'Saved Menus',
    subtitle: 'Quick Access',
    description: 'Access all saved menus for upcoming weekdays. Reuse and modify your successful menu combinations',
    icon: 'saved',
    color: '#5BA3E0',
  },
  {
    id: '7',
    title: 'Subscription Details',
    subtitle: 'Package Management',
    description: 'View subscription details and renew your package directly from the app. Stay updated with your plan status',
    icon: 'subscription',
    color: '#7190fa',
  },
  {
    id: '8',
    title: 'Schedule & Send',
    subtitle: 'Menu Distribution',
    description: 'Send menus to customers, view past menu history, duplicate menus for other days with preview before sending',
    icon: 'schedule',
    color: '#09d6c8',
  },
  {
    id: '9',
    title: 'Response Tracking',
    subtitle: 'Customer Feedback',
    description: 'Track all Yes/No/Pending responses with smart filters. Know exactly who wants what',
    icon: 'response',
    color: '#5BA3E0',
  },
  {
    id: '10',
    title: 'Bill Generation',
    subtitle: 'Automated Billing',
    description: 'Calculate total amount based on response count. Send bills to all customers via email automatically',
    icon: 'bill',
    color: '#7190fa',
  },
];

// ==================== SIMPLIFIED FEATURE ICONS ====================
const DashboardIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Rect x="10" y="10" width="25" height="25" rx="3" fill={color} opacity="0.9"/>
    <Rect x="40" y="10" width="30" height="12" rx="2" fill={color} opacity="0.7"/>
    <Rect x="40" y="26" width="30" height="9" rx="2" fill={color} opacity="0.7"/>
    <Rect x="10" y="40" width="30" height="30" rx="3" fill={color} opacity="0.8"/>
    <Rect x="45" y="40" width="25" height="30" rx="3" fill={color} opacity="0.8"/>
    <Circle cx="22" cy="22" r="4" fill="#fff"/>
    <Circle cx="55" cy="55" r="6" fill="#fff" opacity="0.8"/>
  </Svg>
);

const CustomersIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Circle cx="40" cy="25" r="12" fill={color} opacity="0.9"/>
    <Path d="M20 60C20 47 28 40 40 40C52 40 60 47 60 60L20 60Z" fill={color} opacity="0.8"/>
    <Circle cx="25" cy="30" r="8" fill={color} opacity="0.6"/>
    <Circle cx="55" cy="30" r="8" fill={color} opacity="0.6"/>
    <Path d="M15 65C15 58 18 52 25 52" stroke={color} strokeWidth="3" opacity="0.5"/>
    <Path d="M65 65C65 58 62 52 55 52" stroke={color} strokeWidth="3" opacity="0.5"/>
  </Svg>
);

const DishesIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Circle cx="40" cy="40" r="25" fill={color} opacity="0.2"/>
    <Circle cx="40" cy="40" r="20" fill={color} opacity="0.8"/>
    <Circle cx="35" cy="35" r="4" fill="#FFD54F"/>
    <Circle cx="45" cy="37" r="3" fill="#FFD54F"/>
    <Circle cx="40" cy="45" r="3.5" fill="#FFD54F"/>
    <Path d="M25 40C25 40 30 35 40 35C50 35 55 40 55 40" stroke="#fff" strokeWidth="2" opacity="0.6"/>
  </Svg>
);

const MenuIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Rect x="20" y="15" width="40" height="50" rx="3" fill={color} opacity="0.9"/>
    <Line x1="28" y1="25" x2="52" y2="25" stroke="#fff" strokeWidth="2.5"/>
    <Line x1="28" y1="35" x2="52" y2="35" stroke="#fff" strokeWidth="2.5"/>
    <Line x1="28" y1="45" x2="48" y2="45" stroke="#fff" strokeWidth="2.5"/>
    <Line x1="28" y1="55" x2="45" y2="55" stroke="#fff" strokeWidth="2.5"/>
    <Circle cx="52" cy="55" r="3" fill="#FFD54F"/>
  </Svg>
);

const PaymentIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Rect x="15" y="25" width="50" height="35" rx="4" fill={color} opacity="0.9"/>
    <Rect x="15" y="25" width="50" height="10" fill={color} opacity="1"/>
    <Rect x="20" y="42" width="20" height="8" rx="2" fill="#FFD54F"/>
    <Circle cx="55" cy="46" r="4" fill="#fff" opacity="0.8"/>
  </Svg>
);

const SavedIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Path d="M25 15L25 65L40 55L55 65L55 15L25 15Z" fill={color} opacity="0.9"/>
    <Line x1="32" y1="28" x2="48" y2="28" stroke="#fff" strokeWidth="2"/>
    <Line x1="32" y1="38" x2="48" y2="38" stroke="#fff" strokeWidth="2"/>
    <Line x1="32" y1="48" x2="43" y2="48" stroke="#fff" strokeWidth="2"/>
  </Svg>
);

const SubscriptionIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Circle cx="40" cy="40" r="25" fill={color} opacity="0.2"/>
    <Circle cx="40" cy="40" r="18" fill={color} opacity="0.9"/>
    <Path d="M35 40L38 43L45 35" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="40" cy="40" r="25" stroke={color} strokeWidth="2" strokeDasharray="4 4" opacity="0.5"/>
  </Svg>
);

const ScheduleIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Rect x="18" y="20" width="44" height="45" rx="3" fill={color} opacity="0.9"/>
    <Rect x="18" y="15" width="44" height="10" rx="2" fill={color}/>
    <G opacity="0.8">
      <Rect x="25" y="32" width="8" height="8" rx="1" fill="#fff"/>
      <Rect x="36" y="32" width="8" height="8" rx="1" fill="#fff"/>
      <Rect x="47" y="32" width="8" height="8" rx="1" fill="#fff"/>
      <Rect x="25" y="43" width="8" height="8" rx="1" fill="#fff"/>
      <Rect x="36" y="43" width="8" height="8" rx="1" fill="#FFD54F"/>
      <Rect x="47" y="43" width="8" height="8" rx="1" fill="#fff"/>
      <Rect x="25" y="54" width="8" height="8" rx="1" fill="#fff"/>
    </G>
  </Svg>
);

const ResponseIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Circle cx="30" cy="35" r="12" fill="#4CAF50" opacity="0.9"/>
    <Path d="M25 35L28 38L35 31" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    
    <Circle cx="50" cy="35" r="12" fill="#F44336" opacity="0.9"/>
    <Line x1="45" y1="30" x2="55" y2="40" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    <Line x1="55" y1="30" x2="45" y2="40" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
    
    <Circle cx="40" cy="55" r="12" fill={color} opacity="0.7"/>
    <Circle cx="40" cy="55" r="3" fill="#fff"/>
  </Svg>
);

const BillIcon = ({ color }) => (
  <Svg width="80" height="80" viewBox="0 0 80 80" fill="none">
    <Path d="M25 15L25 68L30 65L35 68L40 65L45 68L50 65L55 68L55 15L25 15Z" fill={color} opacity="0.9"/>
    <Line x1="32" y1="25" x2="48" y2="25" stroke="#fff" strokeWidth="2"/>
    <Line x1="32" y1="33" x2="48" y2="33" stroke="#fff" strokeWidth="1.5"/>
    <Line x1="32" y1="40" x2="48" y2="40" stroke="#fff" strokeWidth="1.5"/>
    <Line x1="32" y1="47" x2="43" y2="47" stroke="#fff" strokeWidth="1.5"/>
    <Rect x="32" y="54" width="16" height="6" rx="1" fill="#FFD54F"/>
  </Svg>
);

const getIcon = (iconName, color) => {
  const icons = {
    dashboard: <DashboardIcon color={color} />,
    customers: <CustomersIcon color={color} />,
    dishes: <DishesIcon color={color} />,
    menu: <MenuIcon color={color} />,
    payment: <PaymentIcon color={color} />,
    saved: <SavedIcon color={color} />,
    subscription: <SubscriptionIcon color={color} />,
    schedule: <ScheduleIcon color={color} />,
    response: <ResponseIcon color={color} />,
    bill: <BillIcon color={color} />,
  };
  return icons[iconName] || icons.dashboard;
};

// ==================== FEATURE SLIDE COMPONENT ====================
const FeatureSlide = ({ item, isActive }) => (
  <View style={styles.slide}>
    <View style={[
      styles.featureIconWrapper,
      isActive && styles.activeIconWrapper
    ]}>
      {getIcon(item.icon, item.color)}
    </View>
    
    <View style={styles.textContainer}>
      <Text style={styles.featureTitle}>{item.title}</Text>
      <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
      <Text style={styles.featureDescription}>{item.description}</Text>
    </View>
  </View>
);

// ==================== PAGINATION DOT COMPONENT ====================
const PaginationDot = ({ index, currentIndex, total }) => {
  const isActive = index === currentIndex;
  
  return (
    <View style={[
      styles.dot,
      isActive && styles.activeDot
    ]} />
  );
};

// ==================== LOADING BAR COMPONENT ====================
const LoadingBar = ({ progress }) => (
  <View style={styles.loadingBar}>
    <View style={[styles.loadingProgress, { width: `${progress * 100}%` }]} />
  </View>
);

// ==================== MAIN COMPONENT ====================
export default function ProviderWelcomeFlow() {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const flatListRef = useRef(null);
  const autoSlideTimer = useRef(null);

  // Welcome screen animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const titleSlideAnim = useRef(new Animated.Value(50)).current;
  const badgeScaleAnim = useRef(new Animated.Value(0)).current;
  
  const waveAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const particleAnims = useRef(
    Array(5).fill(0).map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      scale: new Animated.Value(0.5)
    }))
  ).current;

  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startParticleAnimation = () => {
    particleAnims.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 0.6,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: -100,
              duration: 3000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim.scale, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: -150,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
  };

  // Auto slide functionality
  const startAutoSlide = () => {
    stopAutoSlide(); // Clear any existing timer
    
    autoSlideTimer.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex < FEATURES.length - 1 ? prevIndex + 1 : 0;
        
        // Scroll to next slide
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, 3000); // Change slide every 3 seconds
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
      autoSlideTimer.current = null;
    }
  };

  useEffect(() => {
    // Welcome screen entrance animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 7,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(titleSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 7,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    waveAnims.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: index * 100,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    // Loading progress animation
    const progressTimer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 1) {
          clearInterval(progressTimer);
          return 1;
        }
        return prev + 0.1;
      });
    }, 250);

    setTimeout(() => {
      startGlowAnimation();
      startParticleAnimation();
    }, 1000);

    // Auto-navigate to onboarding after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false);
      // Start auto-slide after welcome screen
      setTimeout(() => {
        startAutoSlide();
      }, 500);
    }, 3000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
      stopAutoSlide();
    };
  }, []);

  const handleSkip = () => {
    stopAutoSlide();
    router.push('/login');
  };

  const handleNext = () => {
    stopAutoSlide();
    if (currentIndex < FEATURES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    } else {
      router.push('/login');
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
      const index = viewableItems[0].index;
      setCurrentIndex(index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const handleScrollBeginDrag = () => {
    stopAutoSlide();
  };

  const handleScrollEndDrag = () => {
    startAutoSlide();
  };

  // ==================== WELCOME SPLASH SCREEN RENDER ====================
  if (showWelcome) {
    return (
      <LinearGradient
        colors={['#004C99', '#4694e2ff', '#098bd6ff']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <DecorativeWaves animations={waveAnims} />
        <FloatingParticles animations={particleAnims} />
        
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <TiffinManagementIcon glowAnim={glowAnim} />
          
          <Animated.View
            style={{
              transform: [{ translateY: titleSlideAnim }],
              alignItems: 'center'
            }}
          >
            <Text style={styles.brandName}>Tiffine</Text>
            
            <Animated.View
              style={{
                transform: [{ scale: badgeScaleAnim }]
              }}
            >
              <View style={styles.providerBadgeContainer}>
                <Text style={styles.providerBadge}>PROVIDER</Text>
              </View>
            </Animated.View>
            
            <Text style={styles.tagline}>Kitchen Partner Dashboard</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
          <View style={styles.loadingContainer}>
            <LoadingBar progress={loadingProgress} />
            <Text style={styles.loadingText}>Loading your kitchen...</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ==================== ONBOARDING SCREENS RENDER ====================
  return (
    <LinearGradient
    colors={['#004C99', '#367dc5ff', '#098bd6ff']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Tiffine</Text>
          <Text style={styles.providerBadgeSmall}>PROVIDER</Text>
        </View>
        
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Slides */}
      <FlatList
        ref={flatListRef}
        data={FEATURES}
        renderItem={({ item, index }) => (
          <FeatureSlide 
            item={item} 
            isActive={index === currentIndex}
          />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {FEATURES.map((_, index) => (
          <PaginationDot
            key={index}
            index={index}
            currentIndex={currentIndex}
            total={FEATURES.length}
          />
        ))}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.footerNav}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {FEATURES.length}
        </Text>
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === FEATURES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <Path
              d="M7.5 5L12.5 10L7.5 15"
              stroke="#7190fa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Welcome Screen Styles
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 40,
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#fff',
    opacity: 0.3,
    top: -15,
    left: -15,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7190fa',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  brandName: {
    fontSize: 52,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 6,
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  providerBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 25,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  providerBadge: {
    fontSize: 16,
    color: '#fff',
    letterSpacing: 4,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 13,
    color: '#fff',
    letterSpacing: 2.5,
    fontWeight: '500',
    opacity: 0.95,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 70,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
  },
  loadingBar: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    letterSpacing: 1,
  },
  wave: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  particle: {
    position: 'absolute',
    bottom: 200,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  
  // Onboarding Screen Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  providerBadgeSmall: {
    fontSize: 10,
    color: '#fff',
    letterSpacing: 2,
    fontWeight: '600',
    opacity: 0.9,
    marginTop: 2,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  featureIconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    marginBottom: 40,
  },
  activeIconWrapper: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
  },
  textContainer: {
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 15,
    color: '#fff',
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeDot: {
    width: 20,
    backgroundColor: '#fff',
  },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  counterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonText: {
    color: '#7190fa',
    fontSize: 16,
    fontWeight: '700',
  },
});