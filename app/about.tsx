// AboutUsScreen.tsx
import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';
import { SafeAreaView } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 60;

const AboutUsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const features = [
    { icon: 'fast-food', title: 'Menu Management', desc: 'Easy dish and menu creation' },
    { icon: 'people', title: 'Customer Management', desc: 'Track all your customers' },
    { icon: 'receipt', title: 'Billing & Payments', desc: 'Automated billing system' },
    { icon: 'notifications', title: 'Smart Notifications', desc: 'Menu and payment reminders' },
  ];

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']}   style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* ================= HEADER ================= */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#f8fafc', '#f8fafc']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>About Us</Text>

            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
      </View>

      {/* ================= CONTENT ================= */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + insets.top ,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient colors={['#15803d', '#4694e2']} style={styles.heroCard}>
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Ionicons name="restaurant" size={32} color="#fff" />
            </View>
            <Text style={styles.appName}>Tiffine Service</Text>
            <Text style={styles.tagline}>Delicious Food, One Tap Away</Text>
          </View>
        </LinearGradient>

        {/* Text Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.paragraph}>
            Welcome to Tiffine, your trusted partner for delicious home-cooked meals
            delivered right to your doorstep. Founded with a passion for authentic
            flavors and healthy eating.
          </Text>

          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            To make quality food accessible to everyone while empowering home chefs
            and food providers with smart tools.
          </Text>

          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((item, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={item.icon as any} size={22} color="#15803d" />
                </View>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Contact Us</Text>
          <View style={styles.contactBox}>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={18} color="#666" />
              <Text style={styles.contactText}>support@tiffine.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text style={styles.contactText}>+91 98765 43210</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text  style={styles.footerText}>Lichi-Provider</Text>
                  <Text style={styles.footerCopyright}>© 2026 Triosphere Tech.pvt.ltd</Text>
                  <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutUsScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: '#f8fafc',
    elevation: 6,
  },

  headerGradient: {
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  headerContent: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  placeholder: {
    width: 38,
  },

  scrollView: {
    flex: 1,
     paddingTop: Platform.OS === 'ios' ? 30 : 20,
  },

  heroCard: {
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    elevation: 6,
  },

  heroContent: {
    alignItems: 'center',
  },

  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },

  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 20,
  },

  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#555',
  },

  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },

  featureItem: {
    width: (Dimensions.get('window').width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },

  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  featureDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },

  contactBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
  },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  contactText: {
    fontSize: 14,
    color: '#333',
  },

  footer: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  version: {
    fontSize: 14,
    color: '#666',
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
  copyright: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
});
