// LegalMenuScreen.tsx - Clean minimal version
import React, { useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Animated,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';
import { SafeAreaView } from 'react-native-safe-area-context';

const LegalMenuScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleBack = () => {
    router.back();
  };

  const menuItems = [
    {
      id: 'about',
      title: 'About Us',
      description: 'Learn about Tiffine, our story, mission and features',
      icon: 'information-circle',
      iconColor: '#15803d',
      bgColor: 'rgba(44, 149, 248, 0.1)',
      screen: '/about'
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      description: 'How we collect, use and protect your data',
      icon: 'shield-checkmark',
      iconColor: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      link:'https://lichi-tiffin.blogspot.com/2026/01/lichi-privacy-policy.html'
    },
    {
      id: 'terms',
      title: 'Terms & Conditions',
      description: 'Rules and guidelines for using our services',
      icon: 'document-text',
      iconColor: '#8b5cf6',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      link:'https://lichi-tiffin.blogspot.com/2026/01/lichi-terms-conditions.html'
    }
  ];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      {/* <StatusBar
        backgroundColor="#f8fafc"
        barStyle="dark-content"
      /> */}
      
      {/* Fixed Header */}
      {/* <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 0.8)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text weight='extraBold' style={styles.headerTitle}>About & Legal</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
      </View> */}

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Menu Items - Start lower to account for header */}
        <View style={[styles.menuItemsContainer, { marginTop: 20 }]}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
             onPress={() => {
  if (item.link) {
    Linking.openURL(item.link);
  } else if (item.screen) {
    router.push(item.screen as any);
  }
}}

              activeOpacity={0.7}
            >
              <View style={[styles.menuIconCircle, { backgroundColor: item.bgColor }]}>
                <Ionicons name={item.icon as any} size={24} color={item.iconColor} />
              </View>
              
              <View style={styles.menuContent}>
                <View style={styles.menuHeader}>
                  <Text weight='extraBold' style={styles.menuItemTitle}>{item.title}</Text>
                  <Feather name="chevron-right" size={20} color="#c7c7cc" />
                </View>
                <Text style={styles.menuItemDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer */}
       <View style={styles.footer}>
  <Text style={styles.footerText}>Lichi-Provider</Text>
  <Text style={styles.footerCopyright}>
    © 2026 Triosphere Tech.pvt.ltd
  </Text>
  <Text style={styles.footerVersion}>Version 1.0.0</Text>
</View>


      
     
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    // paddingTop:50,
  },
  scrollContent: {
    flexGrow: 1,
  },
  menuItemsContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  menuItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  menuIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
footer: {
  position: 'absolute',  
  left: 0,
  right: 0,
  bottom:20,
  alignItems: 'center',
  paddingHorizontal: 20,
},

footerText: {
  fontSize: 14,
  color: '#666',
  marginBottom: 8,
},

footerCopyright: {
  fontSize: 12,
  color: '#999',
  marginBottom: 4,
},

footerVersion: {
  fontSize: 12,
  color: '#ccc',
},

});

export default LegalMenuScreen;