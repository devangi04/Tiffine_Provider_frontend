import React, { useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Dimensions,
  SafeAreaView,
  Linking,
  Animated,
  Share
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';

const { width } = Dimensions.get('window');

const PrivacyPolicyScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const scrollY = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Tiffine Privacy Policy',
        message: 'Check out Tiffine Privacy Policy',
        url: 'https://triospheretech.com/contact.html',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const openEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

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
        'Business details and GST information',
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
        'Subscription management (3-day free trial & payments)',
        'Menu creation and customer management',
        'Sending billing emails to customers',
        'Push notifications for menu reminders',
        'Customer credential sharing via email'
      ]
    },
    {
      id: 'subscription',
      title: 'Subscription & Payment',
      content: 'We offer a 3-day free trial from registration. After trial, subscription via Razorpay is required. We integrate with Razorpay for payment processing - they handle payment details according to their Privacy Policy.'
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
        name: 'Krunal Mistry',
        email: 'techtriosphere.com',
        address: '1205, Phoenix building, Vijay Cross Road to Commerce Six Road, Gujarat, India'
      }
    }
  ];

  const contactInfo = [
    {
      icon: 'mail',
      label: 'General Support',
      value: 'techtriosphere@gmail.com',
      action: () => openEmail('techtriosphere@gmail.com')
    },
    {
      icon: 'shield',
      label: 'Privacy Concerns',
      value: 'grievance.officer@techtriosphere.com',
      action: () => openEmail('techtriosphere@gmail.com')
    },
    {
      icon: 'globe',
      label: 'Website',
      value: 'www.tiffine.com',
      action: () => openLink('https://triospheretech.com/index.html')
    }
  ];

  const stats = [
    { icon: 'shield-checkmark', label: 'Data Protected', value: '100%' },
    { icon: 'lock-closed', label: 'Encryption', value: 'SSL/TLS' },
    { icon: 'document-text', label: 'Last Updated', value: 'Dec 10, 2025' },
    { icon: 'time', label: 'Response Time', value: '48 hours' },
  ];

  const renderSection = (section: any) => {
    switch (section.id) {
      case 'grievance':
        return (
          <View style={styles.sectionCard} key={section.id}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#2c95f8" />
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
              <Ionicons name="document-text" size={20} color="#2c95f8" />
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#f8fafc"
        barStyle="dark-content"
      />
      
      {/* Animated Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={['#f8fafc', '#f8fafc']}
          style={styles.headerGradient}
        >
          {/* <View style={[styles.headerContent, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Feather name="share-2" size={20} color="#333" />
            </TouchableOpacity>
          </View> */}
        </LinearGradient>
      </Animated.View>

      {/* Fixed Header for Scroll */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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
            <Text style={styles.headerTitle}>Privacy Policy</Text>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Feather name="share-2" size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#2c95f8', '#4694e2']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={32} color="white" />
            </View>
            <Text style={styles.heroTitle}>Privacy & Data Protection</Text>
            <Text style={styles.heroSubtitle}>Last updated: December 10, 2025</Text>
          </View>
        </LinearGradient>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <View style={styles.statIconWrapper}>
                  <Ionicons name={stat.icon as any} size={20} color="#2c95f8" />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Introduction Card */}
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Your Privacy Matters</Text>
          <Text style={styles.introText}>
            We are committed to protecting your personal information and being transparent about our data practices. This policy covers how we handle data for Tiffine Service Providers.
          </Text>
        </View>

        {/* Policy Sections */}
        <View style={styles.sectionsContainer}>
          {sections.map(renderSection)}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Information</Text>
          <View style={styles.contactCards}>
            {contactInfo.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCardItem}
                onPress={contact.action}
                activeOpacity={0.7}
              >
                <View style={styles.contactIconWrapper}>
                  <Ionicons name={contact.icon as any} size={20} color="#2c95f8" />
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
            <Ionicons name="briefcase" size={24} color="#2c95f8" />
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
          <Text style={styles.footerTitle}>Tiffine Service</Text>
          <Text style={styles.footerText}>Provider Application</Text>
          <Text style={styles.footerCopyright}>© 2025 Techtriosphere. All rights reserved.</Text>
          <Text style={styles.footerVersion}>Version 1.0.0</Text>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 + insets.bottom }} />
      </ScrollView>
    </SafeAreaView>
  );
};

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
    zIndex: 10,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 12, 12, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scrollView: {
    flex: 1,
  },
  heroCard: {
    marginTop: 80,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  statsSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  introCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  sectionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionCard: {
    backgroundColor: 'white',
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
  contactCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  linkText: {
    color: '#2c95f8',
    textDecorationLine: 'underline',
  },
  procedureCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
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
  contactSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  contactCards: {
    gap: 12,
  },
  contactCardItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  responsibilitiesCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
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
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  footerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  footerCopyright: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  footerVersion: {
    fontSize: 12,
    color: '#ccc',
  },
});

export default PrivacyPolicyScreen;