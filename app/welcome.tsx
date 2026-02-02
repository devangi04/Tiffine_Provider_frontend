import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  FlatList, 
  Animated, 
  Easing,
  Image 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text, TextStyles } from '@/components/ztext';
// In your ProviderWelcomeFlow component
import { useDispatch } from 'react-redux';
import { setHasCompletedWelcome } from '../app/store/slices/appslice';

const { width, height } = Dimensions.get('window');

// ==================== FEATURE SLIDES DATA ====================
const FEATURES = [
  {
    id: '1',
    title: 'Dashboard',
    subtitle: 'Complete Overview',
    description: 'Search customers globally, view all dishes & menus, customer details, today\'s menu count, Yes/No responses, and new customer overview',
    image: require('@/assets/images/dashboard.png'), // Replace with your image path
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '2',
    title: 'Customer Management',
    subtitle: 'All Customer Details',
    description: 'Complete customer list with search functionality. Add, update customer information and manage all customer relationships efficiently',
    image: require('@/assets/images/customer-experience.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '3',
    title: 'Dishes & Categories',
    subtitle: 'Menu Creation',
    description: 'Add, update, delete dishes and custom categories. Organize your complete menu catalog with ease',
    image: require('@/assets/images/dinner.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '4',
    title: 'Menu Management',
    subtitle: 'Daily Menu Planning',
    description: 'Create day-wise menus, set cutoff times for responses, and track how many times customers can respond',
    image: require('@/assets/images/menu.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '5',
    title: 'Payment Tracking',
    subtitle: 'Financial Overview',
    description: 'View all customer payments - pending, partial, and completed. Keep track of all financial transactions in one place',
    image: require('@/assets/images/payment-method.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '6',
    title: 'Saved Menus',
    subtitle: 'Quick Access',
    description: 'Access all saved menus for upcoming weekdays. Reuse and modify your successful menu combinations',
    image: require('@/assets/images/menu (1).png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '7',
    title: 'Subscription Details',
    subtitle: 'Package Management',
    description: 'View subscription details and renew your package directly from the app. Stay updated with your plan status',
    image: require('@/assets/images/subscription.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '8',
    title: 'Schedule & Send',
    subtitle: 'Menu Distribution',
    description: 'Send menus to customers, view past menu history, duplicate menus for other days with preview before sending',
    image: require('@/assets/images/calendar.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '9',
    title: 'Response Tracking',
    subtitle: 'Customer Feedback',
    description: 'Track all Yes/No/Pending responses with smart filters. Know exactly who wants what',
    image: require('@/assets/images/audition.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
  {
    id: '10',
    title: 'Bill Generation',
    subtitle: 'Automated Billing',
    description: 'Calculate total amount based on response count. Send bills to all customers via email automatically',
    image: require('@/assets/images/invoice.png'),
    gradient: ['#fcfdffff', '#ffff'],
  },
];

// ==================== FEATURE SLIDE COMPONENT ====================
const FeatureSlide = ({ item, isActive }) => {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  
  useEffect(() => {
    if (isActive) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);

  return (
    <View style={styles.slide}>
      <Animated.View style={[
        styles.featureImageContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}>
        <LinearGradient
          colors={item.gradient}
          style={styles.imageGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image 
            source={item.image}
            style={styles.featureImage}
            resizeMode="contain"
          />
        </LinearGradient>
      </Animated.View>
      
      <View style={styles.textContainer}>
        <Text style={styles.featureTitle}>{item.title}</Text>
        <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
        <Text style={styles.featureDescription}>{item.description}</Text>
      </View>
    </View>
  );
};

// ==================== PAGINATION DOT COMPONENT ====================
const PaginationDot = ({ index, currentIndex }) => {
  const isActive = index === currentIndex;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.8)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1 : 0.8,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  return (
    <Animated.View 
      style={[
        styles.dot, 
        isActive && styles.activeDot,
        { transform: [{ scale: scaleAnim }] }
      ]} 
    />
  );
};

// ==================== LOADING BAR COMPONENT ====================
const LoadingBar = ({ progress }) => (
  <View style={styles.loadingContainer}>
    <View style={styles.loadingBar}>
      <Animated.View 
        style={[
          styles.loadingProgress, 
          { width: `${progress * 100}%` }
        ]} 
      />
    </View>
  </View>
);

// ==================== FLOATING SHAPES COMPONENT ====================
const FloatingShapes = () => {
  const shapes = useRef(
    Array(6).fill(0).map(() => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0.3),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    shapes.forEach((shape, index) => {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(shape.translateY, {
              toValue: -30,
              duration: 3000 + index * 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(shape.translateY, {
              toValue: 0,
              duration: 3000 + index * 500,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(shape.rotate, {
            toValue: 1,
            duration: 8000 + index * 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  const positions = [
    { top: '10%', left: '10%', size: 60 },
    { top: '20%', right: '15%', size: 40 },
    { bottom: '30%', left: '8%', size: 50 },
    { bottom: '15%', right: '12%', size: 35 },
    { top: '50%', left: '5%', size: 45 },
    { top: '60%', right: '8%', size: 55 },
  ];

  return (
    <>
      {shapes.map((shape, index) => {
        const spin = shape.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.floatingShape,
              {
                ...positions[index],
                width: positions[index].size,
                height: positions[index].size,
                opacity: shape.opacity,
                transform: [
                  { translateY: shape.translateY },
                  { rotate: spin },
                ],
              },
            ]}
          />
        );
      })}
    </>
  );
};

// ==================== MAIN COMPONENT ====================
export default function ProviderWelcomeFlow() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [showWelcome, setShowWelcome] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const flatListRef = useRef(null);
  const autoSlideTimer = useRef(null);

  // Welcome screen animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const slideUpAnim = useRef(new Animated.Value(100)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Welcome screen entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        delay: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous logo rotation
    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 20000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Loading progress animation
    const progressTimer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 1) {
          clearInterval(progressTimer);
          return 1;
        }
        return prev + 0.035;
      });
    }, 150);

    // Auto-navigate to onboarding after welcome
    const timer = setTimeout(() => {
      setShowWelcome(false);
      setTimeout(startAutoSlide, 500);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressTimer);
      stopAutoSlide();
    };
  }, []);

  const startAutoSlide = () => {
    stopAutoSlide();
    autoSlideTimer.current = setInterval(() => {
      setCurrentIndex(prevIndex => {
        const nextIndex = prevIndex < FEATURES.length - 1 ? prevIndex + 1 : 0;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);
  };

  const stopAutoSlide = () => {
    if (autoSlideTimer.current) {
      clearInterval(autoSlideTimer.current);
      autoSlideTimer.current = null;
    }
  };

  const handleSkip = () => {
     dispatch(setHasCompletedWelcome(true)); // Add this
    router.push('/login');
  };

const handleNext = () => {
  stopAutoSlide();
  
  if (currentIndex < FEATURES.length - 1) {
    // Show next slide
    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    flatListRef.current?.scrollToIndex({ 
      index: nextIndex, 
      animated: true 
    });
    startAutoSlide();
  } else {
    // Last slide - navigate to login
    dispatch(setHasCompletedWelcome(true));
    router.push('/login');
  }
};

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== undefined) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ==================== WELCOME SPLASH SCREEN ====================
  if (showWelcome) {
    return (
      <LinearGradient
        colors={['#15803d', '#15803d', '#a8ffcbff']}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <FloatingShapes />
        
        <Animated.View style={[
          styles.content,
          { opacity: fadeAnim }
        ]}>
          
            <View style={styles.logoCircle}>
              <Image 
                source={require('@/assets/images/splashnew.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
         

          <Animated.View style={{
            transform: [{ translateY: slideUpAnim }]
          }}>
            {/* <Text style={styles.brandName}>Lichi</Text> */}
            <View style={styles.imagecontainer}>
             <Image 
                source={require('@/assets/images/White_Logo_Transnew.png')} // Replace with your logo
                style={styles.imagetext}
                resizeMode="contain"
              />
              </View>
            <View style={styles.providerBadgeContainer}>
              <Text style={styles.providerBadge}>PROVIDER</Text>
            </View>
            <Text style={styles.tagline}>Manage Your Kitchen Business</Text>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[
          styles.footer,
          { opacity: fadeAnim }
        ]}>
          <LoadingBar progress={loadingProgress} />
          <Text style={styles.loadingText}>
            {loadingProgress < 1 ? 'Loading your kitchen...' : 'Ready to start!'}
          </Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  // ==================== ONBOARDING SCREENS ====================
  return (
    <LinearGradient
      colors={['#15803d', '#15803d', '#a8ffcbff']}
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
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Feature Slides */}
      <FlatList
        ref={flatListRef}
        data={FEATURES}
        renderItem={({ item, index }) => (
          <FeatureSlide item={item} isActive={index === currentIndex} />
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onScrollBeginDrag={stopAutoSlide}
        onScrollEndDrag={startAutoSlide}
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
          <PaginationDot key={index} index={index} currentIndex={currentIndex} />
        ))}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.footerNav}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {FEATURES.length}
        </Text>
        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextButtonText}>
            {currentIndex === FEATURES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Welcome Screen Styles
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoWrapper: {
    marginBottom: 50,
  },
  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  brandName: {
    fontSize: 56,
    fontWeight: '900',
    fontFamily:'calibary',
    color: '#fff',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 20,
    marginTop:20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  providerBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 30,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  providerBadge: {
    fontSize: 16,
    color: '#fff',
    letterSpacing: 4,
    fontWeight: '800',
  },
  tagline: {
    fontSize: 14,
    color: '#fff',
    letterSpacing: 2,
    fontWeight: '500',
    opacity: 0.95,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 80,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  loadingText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    letterSpacing: 1,
    fontWeight: '600',
  },
  floatingShape: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 40,
  },
  featureImageContainer: {
    width: 210,
    height: 210,
    borderRadius: 120,
    overflow: 'hidden',
    marginBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  imageGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureImage: {
    width: '50%',
    height: '50%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  featureTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1,
  },
  featureSubtitle: {
    fontSize: 17,
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
    paddingHorizontal: 5,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    width: 30,
    backgroundColor: '#fff',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
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
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.9,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonText: {
    color: '#667eea',
    fontSize: 17,
    fontWeight: '800',
  },
  arrow: {
    color: '#667eea',
    fontSize: 20,
    fontWeight: '700',
  },
  imagetext:{
  
    height:120,
    width:120
  },
  imagecontainer:{
alignItems: 'center',
    justifyContent:'center',
  }
});