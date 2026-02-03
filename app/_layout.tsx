
import { useEffect,useState } from 'react';
import { Provider } from 'react-redux';
import { store,persistor } from './store';
import { Stack, usePathname } from 'expo-router';
import { PersistGate } from 'redux-persist/integration/react'; // ✅ Import PersistGate
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, StyleSheet, Text,ActivityIndicator,Platform} from 'react-native';
import 'react-native-reanimated';
import { useFonts } from "expo-font";
import * as SplashScreen from 'expo-splash-screen';
import { useSelector } from 'react-redux';
import type { RootState } from './store';
import { StatusBar } from 'expo-status-bar';

import {
  NunitoSans_200ExtraLight,
  NunitoSans_300Light,
  NunitoSans_400Regular,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  NunitoSans_900Black,
} from '@expo-google-fonts/nunito-sans';

// Import Zomato-like Fonts
import {
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

import {
  OpenSans_300Light,
  OpenSans_400Regular,
  OpenSans_500Medium,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
  OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans';

import {
  Poppins_100Thin,
  Poppins_200ExtraLight,
  Poppins_300Light,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  Poppins_900Black,
} from '@expo-google-fonts/poppins';

// Custom UI Components
import Header from '../components/header';
import BottomNavBar from '../components/navbar';
import DashboardHeader from '../components/dahsboardheader';
import AuthChecker from '@/components/authcheck';
import CustomSplashScreen from '@/components/splashscreen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

const hasMealPreferences = useSelector(
  (state: RootState) => state.provider.hasMealPreferences
);

const topOffset =
  Platform.OS === 'android'
    ? insets.top + 16  
    : insets.top;  

  // ✅ Route config with header + navbar visibility
  const routeConfig: Record<
    string,
    { 
      title: string; 
      subtitle?: string; 
      showHeader?: boolean; 
      showNavbar?: boolean; 
      headerType?: 'default' | 'dashboard' | 'none'; 
       statusBarStyle?: 'light' | 'dark';
       statusBarBg?: string;
    }
  > = {
    // Auth screens - no header/navbar
    '/welcome': { title: '', showHeader: false, showNavbar: false, headerType: 'none' },
    '/login': { title: '', showHeader: false, showNavbar: false, headerType: 'none', statusBarStyle: 'dark', statusBarBg: '#ffffff' },
    '/forgotpassword': { title: '', showHeader: false, showNavbar: false, headerType: 'none' },
     '/customer': { title: 'Customer',subtitle: 'Add your customer', showHeader: true, showNavbar: false, headerType: 'default' },


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
     '/legalmenu': { title: 'About us', subtitle: 'Terms & Privacy Policy', showHeader: true, showNavbar: false, headerType: 'default' },

         '/providerseetingscreen': { title: 'Provider setting', subtitle: 'Configure your services', showHeader: true, showNavbar: false, headerType: 'default' },

        '/searchcustomerdetails':{ title: 'Customer Info', subtitle: 'Manage customer details', showHeader: true, showNavbar: false, headerType: 'default'},

    '/categorymaster': { title: 'Category Master', subtitle: 'Manage Categories', showHeader: true, showNavbar: true, headerType: 'default' },
        '/about': { title: '', subtitle: '', showHeader: false, showNavbar: false, statusBarStyle: 'dark', statusBarBg: '#f8fafc', },
    '/edit': { title: 'Personal Details', subtitle: 'Manage Details', showHeader: true, showNavbar: false, headerType: 'default' },
        '/bill': { title: 'Customer Bill', subtitle: 'Manage Bill', showHeader: true, showNavbar: true, headerType: 'default' },
    // Tabs
    '/(tabs)': { title: '', showHeader: false, showNavbar: true, headerType: 'none' },
        '/subscription': { title: '', showHeader: false, showNavbar: false, headerType: 'dashboard', statusBarStyle: 'dark', statusBarBg: '#f8fafc'},

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
      return (
        <Header
          title={headerData.title}
          subtitle={headerData.subtitle}
          showBackButton={hasMealPreferences}
          showUserButton={hasMealPreferences}
        />
      );

    case 'none':
    default:
      return null;
  }
};

  return (
    <View style={styles.container}>
<StatusBar
  style={headerData.statusBarStyle ?? 'light'}
  translucent
/>

<View
  style={{
    backgroundColor: headerData.statusBarBg ?? '#15803d',
    paddingTop: topOffset,
  }}
>
  {renderHeader()}
</View>


      
      {/* ✅ Main Content Area */}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animationDuration: 300,
            animation: 'none',
            gestureEnabled: true,
          }}
        >
           {/* <Stack.Screen name="index" /> */}
          <Stack.Screen name="welcome" />
          <Stack.Screen name="login" />
          <Stack.Screen name="auth" />
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
          {/* <Stack.Screen name="(tabs)" /> */}
          <Stack.Screen name="+not-found" />
        </Stack>
      </View>

      {/* ✅ Bottom Navbar */}
      {headerData.showNavbar && <BottomNavBar />}

  


    </View>
  );
}

export default function RootLayout() {
   const [minSplashDone, setMinSplashDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, 1200); // 👈 guaranteed splash time (1.2s)

    return () => clearTimeout(timer);
  }, []);
  const [fontsLoaded, fontError] = useFonts({
    // Nunito Sans (existing)
    'NunitoSans-ExtraLight': NunitoSans_200ExtraLight,
    'NunitoSans-Light': NunitoSans_300Light,
    'NunitoSans-Regular': NunitoSans_400Regular,
    'NunitoSans-SemiBold': NunitoSans_600SemiBold,
    'NunitoSans-Bold': NunitoSans_700Bold,
    'NunitoSans-ExtraBold': NunitoSans_800ExtraBold,
    'NunitoSans-Black': NunitoSans_900Black,
    
    // Inter (Zomato-like clean font)
    'Inter-Thin': Inter_100Thin,
    'Inter-ExtraLight': Inter_200ExtraLight,
    'Inter-Light': Inter_300Light,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    'Inter-Black': Inter_900Black,
    
    // Open Sans (clean and readable)
    'OpenSans-Light': OpenSans_300Light,
    'OpenSans-Regular': OpenSans_400Regular,
    'OpenSans-Medium': OpenSans_500Medium,
    'OpenSans-SemiBold': OpenSans_600SemiBold,
    'OpenSans-Bold': OpenSans_700Bold,
    'OpenSans-ExtraBold': OpenSans_800ExtraBold,
    
    // Poppins (modern, food app friendly)
    'Poppins-Thin': Poppins_100Thin,
    'Poppins-ExtraLight': Poppins_200ExtraLight,
    'Poppins-Light': Poppins_300Light,
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    'Poppins-ExtraBold': Poppins_800ExtraBold,
    'Poppins-Black': Poppins_900Black,
  });

  // Hide splash screen when fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

   return (
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={<CustomSplashScreen />}>
        {!minSplashDone ? (
          <CustomSplashScreen />
        ) : (
          <SafeAreaProvider>
            <AuthChecker>
              <LayoutContent /> 
            </AuthChecker>
          </SafeAreaProvider>
        )}
      </PersistGate>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});