import React, { useEffect, useState } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Animated,
  Image,
  Keyboard,
  Platform
} from 'react-native';
import {Text,TextStyles} from '@/components/ztext';
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useAppSelector } from '@/app/store/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface BottomNavBarProps {
  navbarOpacity?: Animated.Value;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ navbarOpacity }) => {
  const router = useRouter();
  const pathname = usePathname();
  const provider = useAppSelector((state) => state.provider);
  const [activeNav, setActiveNav] = useState('Home');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Keyboard listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Update activeNav based on current route - FIXED VERSION
  useEffect(() => {
    const routeToNavMap: Record<string, string> = {
      '/dashboard': 'Home',
      '/custmorelist': 'Menu',
      '/response': 'Response',
      '/profile': 'Profile', // Only exact profile route
      '/schedule': 'Schedule',
    };
    
    // Use exact matching for main routes
    const matchedRoute = Object.keys(routeToNavMap).find(route => 
      pathname === route
    );
    
    if (matchedRoute) {
      setActiveNav(routeToNavMap[matchedRoute]);
    }
    // For nested routes, don't change activeNav - keep current tab active
  }, [pathname]);

  const handleNavPress = (screenName: string) => {
    const providerId = provider?.id;
    
    if (!providerId) {
      router.push('/login');
      return;
    }

    // Special handling for Profile tab
    if (screenName === 'Profile') {
      // If we're not already on the main profile screen, navigate to it
      if (pathname !== '/profile') {
        router.push({ pathname: '/profile', params: { providerId } });
        setActiveNav('Profile');
      }
      // If we're already on main profile screen, do nothing
      return;
    }

    // For other tabs, don't navigate if we're already on the target screen
    const targetRoutes: Record<string, string> = {
      'Home': '/dashboard',
      'Menu': '/custmorelist', 
      'Response': '/response',
      'Schedule': '/schedule'
    };

    if (pathname === targetRoutes[screenName]) {
      return; // Already on the target screen
    }

    setActiveNav(screenName);
    
    switch(screenName) {
      case 'Home':
        router.push({ pathname: '/dashboard', params: { providerId } });
        break;
      case 'Menu':
        router.push({ pathname: '/custmorelist', params: { providerId } });
        break;
      case 'Response':
        router.push({ pathname: '/response', params: { providerId } });
        break;
      case 'Schedule':
        router.push({ pathname: '/schedule', params: { providerId } });
        break;
      default:
        router.push('/dashboard');
    }
  };

  // Don't render navbar when keyboard is visible
  if (isKeyboardVisible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.navbar,
        {
          opacity: navbarOpacity || 1,
          transform: navbarOpacity ? [
            {
              translateY: navbarOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ] : [],
          paddingBottom: insets.bottom + 5,
          height: 70 + insets.bottom,
        },
      ]}
    >
      {/* Left Nav */}
      <View style={styles.navLeft}>
        <TouchableOpacity 
          style={[styles.navItem, activeNav === 'Home' && styles.navItemActive]}
          onPress={() => handleNavPress('Home')}
        >
          <Ionicons 
            name="home" 
            size={24} 
            color={activeNav === 'Home' ? '#15803d' : '#64748b'} 
          />
          <Text style={[
            styles.navText, 
            { color: activeNav === 'Home' ? '#15803d' : '#64748b' }
          ]}>
            Home
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeNav === 'Menu' && styles.navItemActive]}
          onPress={() => handleNavPress('Menu')}
        >
          <FontAwesome5 
            name="list-alt" 
            size={24} 
            color={activeNav === 'Menu' ? '#15803d' : '#64748b'} 
          />
          <Text style={[
            styles.navText, 
            { color: activeNav === 'Menu' ? '#15803d' : '#64748b' }
          ]}>
            Customer
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center Button */}
      <TouchableOpacity 
        style={[
          styles.centerBtn, 
          activeNav === 'Schedule' && styles.centerBtnActive
        ]}
        onPress={() => handleNavPress('Schedule')}
      >
        <View style={[
          styles.centerBtnInner,
          activeNav === 'Schedule' && styles.centerBtnInnerActive
        ]}>
          <Image 
            source={{ uri: 'https://i.postimg.cc/c1RJhnv3/schedule.png' }}
            style={{
              width: 38,
              height: 38,
              tintColor: activeNav === 'Schedule' ? '#15803d' : '#fff',
            }}
            resizeMode="contain" 
          />
        </View>
        
        {activeNav === 'Schedule' && (
          <View style={styles.activePulse} />
        )}
        
      </TouchableOpacity>

      {/* Right Nav */}
      <View style={styles.navRight}>
        <TouchableOpacity 
          style={[styles.navItem, activeNav === 'Response' && styles.navItemActive]}
          onPress={() => handleNavPress('Response')}
        >
          <MaterialIcons 
            name="swap-horiz" 
            size={24} 
            color={activeNav === 'Response' ? '#15803d' : '#64748b'} 
          />
          <Text style={[
            styles.navText, 
            { color: activeNav === 'Response' ? '#15803d' : '#64748b' }
          ]}>
            Response
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeNav === 'Profile' && styles.navItemActive]}
          onPress={() => handleNavPress('Profile')}
        >
          <Feather 
            name="user" 
            size={24} 
            color={activeNav === 'Profile' ? '#15803d' : '#64748b'} 
          />
          <Text style={[
            styles.navText, 
            { color: activeNav === 'Profile' ? '#15803d' : '#64748b' }
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  navbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    // paddingTop:15,
    padding:10,
    // paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  navLeft: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingRight: 20,
  },
  navRight: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingLeft: 20,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 60,
  },
  navItemActive: {},
  navText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  centerBtn: {
    position: 'absolute',
    top: -30,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'white',
  },
  centerBtnActive: {
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 12,
    transform: [{ scale: 1.05 }],
  },
  centerBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBtnInnerActive: {
    backgroundColor: '#fff',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  activePulse: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#15803d',
    opacity: 0.5,
  },
});

export default BottomNavBar;