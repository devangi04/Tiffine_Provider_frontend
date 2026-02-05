import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';
import Constants from 'expo-constants';

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
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>

      {/* ================= HEADER ================= */}
{/* <View
  style={[
    styles.header,
    { paddingTop: insets.top, minHeight: 56 + insets.top },
  ]}
>
  <View style={styles.headerInner}>
    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
      <Ionicons name="arrow-back" size={20} color="#333" />
    </TouchableOpacity>

    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text weight="bold" style={styles.headerTitle}>About Us</Text>
    </View>

   
    <View style={{ width: 36 }} />
  </View>
</View> */}


      {/* ================= CONTENT ================= */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 64,
        }}
      >
        {/* Hero */}
         <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
           <Image 
                      source={require('@/assets/images/Single_Logo_Trans.png')} 
                      style={styles.logoImage}
                      resizeMode="contain"
                    />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Our Story</Text>
          <Text style={styles.paragraph}>
           Lichi Provider App is designed to help food providers manage daily operations with ease.
           From handling orders to updating menus, the app brings everything into one simple and reliable platform built for everyday use.
          </Text>

          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
          To simplify food service management for providers by offering clear tools, smooth workflows, and dependable support - so operations stay organized and stress-free.
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
              <Text style={styles.contactText}>lichitiffinservice@gmail.com</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text style={styles.contactText}>+91 83203 33166</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Lichi-Provider</Text>
          <Text style={styles.footerCopyright}>
            © 2026 Triosphere Tech Pvt. Ltd.
          </Text>
         <Text style={styles.footerVersion}>
          Version {Constants.expoConfig?.version }
        </Text>
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

  /* Header */
  header: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    elevation: 4,
  },

  headerInner: {
   flexDirection: 'row',
  alignItems: 'center',  
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  headerTitle: {
   fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },

  /* Hero */
  heroCard: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    elevation: 6,
  },

  heroContent: {
    alignItems: 'center',
  },

   logoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 90,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
    logoImage: {
    width: 60,
    height: 60,
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

  /* Content */
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
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
    textAlign:'justify',
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

  /* Footer */
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
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
