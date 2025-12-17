// app/_layout.tsx
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet, Text } from 'react-native';
import 'react-native-reanimated';
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
// Custom UI Components
import Header from '../components/header';
import BottomNavBar from '../components/navbar';
import DashboardHeader from '../components/dahsboardheader';

// Nunito Sans Fonts
import {
  NunitoSans_200ExtraLight,
  NunitoSans_200ExtraLight_Italic,
  NunitoSans_300Light,
  NunitoSans_300Light_Italic,
  NunitoSans_400Regular,
  NunitoSans_400Regular_Italic,
  NunitoSans_600SemiBold,
  NunitoSans_600SemiBold_Italic,
  NunitoSans_700Bold,
  NunitoSans_700Bold_Italic,
  NunitoSans_800ExtraBold,
  NunitoSans_800ExtraBold_Italic,
  NunitoSans_900Black,
  NunitoSans_900Black_Italic,
} from '@expo-google-fonts/nunito-sans';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // ✅ Route config with header + navbar visibility
  const routeConfig: Record<
    string,
    { 
      title: string; 
      subtitle?: string; 
      showHeader?: boolean; 
      showNavbar?: boolean; 
      headerType?: 'default' | 'dashboard' | 'none'; 
    }
  > = {
    // Auth screens - no header/navbar
    '/welcome': { title: '', showHeader: false, showNavbar: false, headerType: 'none' },
    '/login': { title: '', showHeader: false, showNavbar: false, headerType: 'none' },
    '/forgotpassword': { title: '', showHeader: false, showNavbar: false, headerType: 'none' },
    
    // Main app screens
    '/dashboard': { title: '', showHeader: false, showNavbar: true, headerType: 'dashboard' },
    '/profile': { title: 'Profile', subtitle: 'Manage your account', showHeader: true, showNavbar: true, headerType: 'default' },
    '/custmorelist': { title: 'Customers', subtitle: 'All registered users', showHeader: true, showNavbar: true, headerType: 'default' },
    '/response': { title: 'Responses', subtitle: 'Latest updates', showHeader: true, showNavbar: true, headerType: 'default' },
    '/schedule': { title: 'Weekly Schedule', subtitle: 'Upcoming Menus', showHeader: true, showNavbar: true, headerType: 'default' },
    '/dishmaster': { title: 'Dish Management', subtitle: 'Create Dishes', showHeader: true, showNavbar: true, headerType: 'default' },
    '/menupreview': { title: 'Menu Preview', subtitle: 'Create Menus', showHeader: true, showNavbar: false, headerType: 'default' },
    '/payment': { title: 'Payment Status', subtitle: 'See Customer Payment', showHeader: true, showNavbar: true, headerType: 'default' },
    '/savedmenu': { title: 'Saved Menu', subtitle: 'See Weekly Menus', showHeader: true, showNavbar: true, headerType: 'default' },
    '/subscriptionmanagement': { title: 'Subscription Details', subtitle: 'See your details', showHeader: true, showNavbar: true, headerType: 'default' },
    '/menu': { title: 'Weekly Menu', subtitle: 'Create Menus', showHeader: true, showNavbar: false, headerType: 'default' },
    '/categorymaster': { title: 'Category Master', subtitle: 'Manage Categories', showHeader: true, showNavbar: true, headerType: 'default' },
    '/edit': { title: 'Personal Details', subtitle: 'Manage Details', showHeader: true, showNavbar: false, headerType: 'default' },
    
    // Tabs
    '/(tabs)': { title: '', showHeader: false, showNavbar: true, headerType: 'none' },
  };

  // Find current route config
  const current = Object.keys(routeConfig).find((route) =>
    pathname.startsWith(route)
  );
  
  const headerData = current
    ? routeConfig[current]
    : { 
        title: '', 
        subtitle: '', 
        showHeader: false, 
        showNavbar: false, 
        headerType: 'none' as const 
      };

  const renderHeader = () => {
    if (!headerData.showHeader) return null;

    switch (headerData.headerType) {
      case 'dashboard':
        return <DashboardHeader />;
      case 'default':
        return <Header title={headerData.title} subtitle={headerData.subtitle} />;
      case 'none':
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {/* ✅ Sticky Header */}
      <View style={styles.stickyHeader}>
        {renderHeader()}
      </View>
      
      {/* ✅ Main Content Area */}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: true,
            presentation: 'card',
          }}
        >
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgotpassword" />
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="custmorelist" />
          <Stack.Screen name="response" />
          <Stack.Screen name="schedule" />
          <Stack.Screen name="dishmaster" />
          <Stack.Screen name="menupreview" />
          <Stack.Screen name="payment" />
          <Stack.Screen name="savedmenu" />
          <Stack.Screen name="subscriptionmanagement" />
          <Stack.Screen name="menu" />
          <Stack.Screen name="categorymaster" />
          <Stack.Screen name="edit" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>

      {/* ✅ Bottom Navbar */}
      {headerData.showNavbar && <BottomNavBar />}

      <StatusBar style="auto" />
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Regular weights
    'NunitoSans-ExtraLight': NunitoSans_200ExtraLight,
    'NunitoSans-Light': NunitoSans_300Light,
    'NunitoSans-Regular': NunitoSans_400Regular,
    'NunitoSans-SemiBold': NunitoSans_600SemiBold,
    'NunitoSans-Bold': NunitoSans_700Bold,
    'NunitoSans-ExtraBold': NunitoSans_800ExtraBold,
    'NunitoSans-Black': NunitoSans_900Black,
    
    // Italic weights (optional)
    'NunitoSans-ExtraLight-Italic': NunitoSans_200ExtraLight_Italic,
    'NunitoSans-Light-Italic': NunitoSans_300Light_Italic,
    'NunitoSans-Regular-Italic': NunitoSans_400Regular_Italic,
    'NunitoSans-SemiBold-Italic': NunitoSans_600SemiBold_Italic,
    'NunitoSans-Bold-Italic': NunitoSans_700Bold_Italic,
    'NunitoSans-ExtraBold-Italic': NunitoSans_800ExtraBold_Italic,
    'NunitoSans-Black-Italic': NunitoSans_900Black_Italic,
  });

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return null while fonts are loading
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <LayoutContent />
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  stickyHeader: {
    zIndex: 1000,
    elevation: 1000,
  },
  content: {
    flex: 1,
  },
});