import React, { useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  Linking,
  Animated,
  Share,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';
import { SafeAreaView } from 'react-native-safe-area-context';
const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 60;

const PrivacyPolicyScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Tiffine Privacy Policy',
        message: 'Check out Tiffine Privacy Policy - Your data protection matters',
        url: 'https://triospheretech.com/contact.html',
      });
    } catch (error) {
    }
  };

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  /* ---------- DATA ---------- */
  const stats = [
    { icon: 'shield-checkmark', label: 'Data Protected', value: '100%' },
    { icon: 'lock-closed', label: 'Encryption', value: 'SSL/TLS' },
    { icon: 'document-text', label: 'Last Updated', value: 'Dec 10, 2025' },
    { icon: 'time', label: 'Response Time', value: '48 hours' },
  ];

  const sections = [
    {
      id: 'introduction',
      title: 'Introduction',
      content: 'Welcome to Tiffine Service. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Provider Application. By accessing or using the App, you consent to the practices described in this Privacy Policy.'
    },
    {
      id: 'information-we-collect',
      title: 'Information We Collect',
      items: [
        'Full name, phone number, email address',
        'Menu and dish information',
        'Customer data collected through your services',
        'Payment information via Razorpay',
        'Device information and usage data'
      ]
    },
    {
      id: 'how-we-use',
      title: 'How We Use Your Information',
      items: [
        'Account verification using OTP emails',
        'Subscription management (7-day free trial & payments)',
        'Menu creation and customer management',
        'Sending billing emails to customers',
        'Push notifications for menu reminders',
        'Customer credential sharing via email'
      ]
    },
    {
      id: 'subscription',
      title: 'Subscription & Payment',
      content: 'We offer a 7-day free trial from registration. After trial, subscription via Razorpay is required. We integrate with Razorpay for payment processing - they handle payment details according to their Privacy Policy.'
    },
    {
      id: 'data-security',
      title: 'Data Security',
      content: 'We implement encryption, secure authentication, and regular security assessments. However, no method of electronic storage is 100% secure.'
    },
    {
      id: 'your-rights',
      title: 'Your Rights',
      items: [
        'Access and update your information',
        'Manage notification preferences',
        'Request account deletion',
        'Export your data',
        'Contact Grievance Officer for concerns'
      ]
    },
    {
      id: 'grievance',
      title: 'Grievance Officer',
      contact: {
        name: 'Neel Patel',
        email: 'lichitiffinservice@gmail.com',
        address: '1205, Phoenix building, Vijay Cross Road to Commerce Six Road,Ahmedabad, Gujarat, India'
      }
    }
  ];

  const contactInfo = [
    {
      icon: 'mail',
      label: 'General Support',
      value: 'lichitiffinservice@gmail.com',
      action: () => openEmail('lichitiffinservice@gmail.com')
    },
    {
      icon: 'shield',
      label: 'Privacy Concerns',
      value: 'info@triospheretech.com',
      action: () => openEmail('info@triospheretech.com')
    },
    {
      icon: 'globe',
      label: 'Website',
      value: 'www.tiffine.com',
      action: () => openLink('https://www.triospheretech.com/casestudies/lichi-bringing-structure-to-home-style-tiffin-services')
    }
  ];

  /* ---------- RENDER FUNCTIONS ---------- */
  const renderSection = (section: any) => {
    switch (section.id) {
      case 'grievance':
        return (
          <View style={styles.sectionCard} key={section.id}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#15803d" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.contactCard}>
              <View style={styles.contactRow}>
                <Ionicons name="person-outline" size={16} color="#666" />
                <Text style={styles.contactText}>{section.contact.name}</Text>
              </View>
              <TouchableOpacity 
                style={styles.contactRow}
                onPress={() => openEmail(section.contact.email)}
              >
                <Ionicons name="mail-outline" size={16} color="#666" />
                <Text style={[styles.contactText, styles.linkText]}>{section.contact.email}</Text>
              </TouchableOpacity>
              <View style={styles.contactRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={styles.contactText}>{section.contact.address}</Text>
              </View>
              <View style={styles.procedureCard}>
                <Text style={styles.procedureTitle}>Procedure for Grievances:</Text>
                <Text style={styles.procedureStep}>1. Email with subject "Privacy Concern - Tiffine Service"</Text>
                <Text style={styles.procedureStep}>2. Include registered email & phone number</Text>
                <Text style={styles.procedureStep}>3. Describe concern with relevant details</Text>
                <Text style={styles.procedureStep}>4. Acknowledgment within 48 hours</Text>
                <Text style={styles.procedureStep}>5. Resolution within 30 days</Text>
              </View>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.sectionCard} key={section.id}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#15803d" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.content && (
              <Text style={styles.sectionContent}>{section.content}</Text>
            )}
            {section.items && (
              <View style={styles.itemsList}>
                {section.items.map((item: string, index: number) => (
                  <View key={index} style={styles.listItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
    }
  };

  /* ---------- UI ---------- */
  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#f8fafc" 
      />

      {/* ================= FIXED HEADER ================= */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <LinearGradient 
          colors={['#f8fafc', '#f8fafc']} 
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#333" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Privacy Policy</Text>

            <TouchableOpacity 
              style={styles.shareButton} 
              onPress={handleShare}
            >
              <Feather name="share-2" size={18} color="#333" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* ================= SCROLL CONTENT ================= */}
    <ScrollView
  style={styles.scrollView}
  showsVerticalScrollIndicator={false}
  contentInsetAdjustmentBehavior="never"   // ✅ VERY IMPORTANT
  contentContainerStyle={[
    styles.scrollContent,
    { paddingBottom: insets.bottom + 16 }, // ✅ natural spacing
  ]}
>

        {/* Hero Section */}
        <LinearGradient 
          colors={['#15803d', '#4694e2']} 
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Privacy & Data Protection</Text>
            <Text style={styles.heroSubtitle}>Last updated: December 10, 2025</Text>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statItem}>
              <View style={styles.statIcon}>
                <Ionicons name={stat.icon as any} size={20} color="#15803d" />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Intro Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Privacy Matters</Text>
          <Text style={styles.cardText}>
            We are committed to protecting your personal information and being transparent
            about our data practices for all Tiffine providers.
          </Text>
        </View>

        {/* All Policy Sections */}
        <View style={styles.sectionsContainer}>
          {sections.map(renderSection)}
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          <View style={styles.contactCards}>
            {contactInfo.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCardItem}
                onPress={contact.action}
                activeOpacity={0.7}
              >
                <View style={styles.contactIconWrapper}>
                  <Ionicons name={contact.icon as any} size={20} color="#15803d" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactLabel}>{contact.label}</Text>
                  <Text style={styles.contactValue}>{contact.value}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Provider Responsibilities */}
        <View style={styles.responsibilitiesCard}>
          <View style={styles.responsibilitiesHeader}>
            <Ionicons name="briefcase" size={24} color="#15803d" />
            <Text style={styles.responsibilitiesTitle}>Your Responsibilities as a Provider</Text>
          </View>
          <View style={styles.responsibilitiesList}>
            <Text style={styles.responsibilityItem}>✓ Collect customer data legally</Text>
            <Text style={styles.responsibilityItem}>✓ Obtain necessary consents</Text>
            <Text style={styles.responsibilityItem}>✓ Use data only for tiffin services</Text>
            <Text style={styles.responsibilityItem}>✓ Implement security measures</Text>
            <Text style={styles.responsibilityItem}>✓ Respond to customer requests</Text>
            <Text style={styles.responsibilityItem}>✓ Delete data when no longer needed</Text>
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

export default PrivacyPolicyScreen;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  /* ===== HEADER ===== */
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },

  headerGradient: {
    paddingHorizontal: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  shareButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  /* ===== SCROLL VIEW ===== */
  scrollView: {
    flex: 1,
    marginTop: HEADER_HEIGHT + (StatusBar.currentHeight || 0), // Fixed: Add space for header
  },

  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 90 : 20,
    paddingBottom: 40,
     paddingHorizontal: 20,
  },

  /* ===== HERO ===== */
  heroCard: {
  
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
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

  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 6,
  },

  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },

  /* ===== STATS ===== */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },

  statItem: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },

  /* ===== CARDS ===== */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  cardText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },

  /* ===== SECTIONS ===== */
  sectionsContainer: {
    marginBottom: 16,
  },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: 16,
  },

  itemsList: {
    gap: 12,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },

  /* ===== CONTACT ===== */
  contactCards: {
    gap: 12,
  },

  contactCardItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },

  contactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  contactInfo: {
    flex: 1,
  },

  contactLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },

  contactText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },

  linkText: {
    color: '#15803d',
    textDecorationLine: 'underline',
  },

  procedureCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  procedureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  procedureStep: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    marginLeft: 8,
  },

  /* ===== RESPONSIBILITIES ===== */
  responsibilitiesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  responsibilitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  responsibilitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },

  responsibilitiesList: {
    gap: 12,
  },

  responsibilityItem: {
    fontSize: 14,
    color: '#555',
    paddingLeft: 8,
  },

  /* ===== FOOTER ===== */
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  footerText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },

  footerVersion: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
    footerCopyright: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});