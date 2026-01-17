// AboutUsScreen.tsx - Simple About Us screen
import React, { useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  StatusBar,
  Linking,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';

const AboutUsScreen = () => {
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

  const features = [
    { icon: 'fast-food', title: 'Menu Management', desc: 'Easy dish and menu creation' },
    { icon: 'people', title: 'Customer Management', desc: 'Track all your customers' },
    { icon: 'receipt', title: 'Billing & Payments', desc: 'Automated billing system' },
    { icon: 'notifications', title: 'Smart Notifications', desc: 'Menu and payment reminders' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f8fafc" barStyle="dark-content" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top }]}>
        <LinearGradient colors={['#f8fafc', '#f8fafc']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>About Us</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <LinearGradient colors={['rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 0.8)']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>About Us</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <LinearGradient colors={['#15803d', '#4694e2']} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Ionicons name="restaurant" size={32} color="white" />
            </View>
            <Text style={styles.appName}>Tiffine Service</Text>
            <Text style={styles.tagline}>Delicious Food, One Tap Away</Text>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.paragraph}>
            Welcome to Tiffine, your trusted partner for delicious home-cooked meals delivered right to your doorstep. 
            Founded with a passion for bringing authentic flavors and healthy eating to busy lives.
          </Text>

          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            To make quality food accessible to everyone. We empower home chefs and providers to share their culinary 
            expertise with the community while ensuring every meal is prepared with love, care, and the finest ingredients.
          </Text>

          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={feature.icon as any} size={24} color="#15803d" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactInfo}>
            <TouchableOpacity style={styles.contactItem}>
              <Ionicons name="mail-outline" size={20} color="#666" />
              <Text style={styles.contactText}>support@tiffine.com</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactItem}>
              <Ionicons name="call-outline" size={20} color="#666" />
              <Text style={styles.contactText}>+91 98765 43210</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Version 1.0.0</Text>
          <Text style={styles.copyright}>© 2025 Techtriosphere</Text>
        </View>
        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 60 },
   backButton: {width: 40,height: 40,borderRadius: 22,backgroundColor: 'white',alignItems: 'center',justifyContent: 'center',shadowColor: '#000',shadowOffset: { width: 0, height: 2 },shadowOpacity: 0.08,shadowRadius: 8,elevation: 3,},
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  heroCard: { marginTop: 90, marginHorizontal: 20, borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  heroContent: { alignItems: 'center' },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  appName: { color: 'white', fontSize: 24, fontWeight: '700', marginBottom: 8,  },
  tagline: { color: 'rgba(255,255,255,0.9)', fontSize: 16 },
  content: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 24, marginBottom: 12 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#555', marginBottom: 16 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  featureItem: { width: (Dimensions.get('window').width - 52) / 2, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
  featureIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f7ff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 4 },
  featureDesc: { fontSize: 12, color: '#666', textAlign: 'center' },
  contactInfo: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 24 },
  contactItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  contactText: { fontSize: 14, color: '#333', flex: 1 },
  footer: { alignItems: 'center', paddingVertical: 24 },
  version: { fontSize: 14, color: '#666', marginBottom: 8 },
  copyright: { fontSize: 12, color: '#999' },
});

export default AboutUsScreen;