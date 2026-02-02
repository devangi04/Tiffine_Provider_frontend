// TermsConditionsScreen.tsx - Fixed Header Overlap Issue
import React, { useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  StatusBar,
  Linking,
  Share,
  Animated,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Text from '@/components/ztext';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 60;

const TermsConditionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleBack = () => {
    router.back();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Tiffine Terms & Conditions',
        message: 'Check out Tiffine Terms & Conditions for Providers',
        url: 'https://www.tiffine.com/terms',
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

  const sections = [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: 'By accessing and using the Tiffine Service Provider Application ("App"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.'
    },
    {
      id: 'definitions',
      title: 'Definitions',
      items: [
        '"App" refers to Tiffine Service Provider Application',
        '"Provider" means registered tiffin service providers',
        '"Customer" means individuals subscribing to tiffin services',
        '"Subscription" means paid access after free trial',
        '"Service" means all features provided through the App'
      ]
    },
    {
      id: 'account-registration',
      title: 'Account Registration & Verification',
      content: 'Providers must register with accurate business information. Email verification via OTP is required. Each provider can maintain only one active account. Providers are responsible for maintaining account security.'
    },
    {
      id: 'subscription-terms',
      title: 'Subscription Terms',
      items: [
        '7-day free trial available for new providers',
        'Mandatory subscription via Razorpay after trial',
        'Subscription grants access to all App features',
        'Automatic renewal unless cancelled',
        'No refunds for partial subscription periods',
        'Prices subject to change with 30-day notice'
      ]
    },
    {
      id: 'provider-responsibilities',
      title: 'Provider Responsibilities',
      items: [
        'Maintain accurate business information',
        'Ensure food quality and safety standards',
        'Handle customer data with confidentiality',
        'Comply with local food safety regulations',
        'Maintain proper hygiene and packaging',
        'Respond to customer inquiries within 24 hours',
        'Update menu availability regularly'
      ]
    },
    {
      id: 'service-usage',
      title: 'Service Usage Guidelines',
      items: [
        'Use platform only for tiffin service management',
        'No sharing of account credentials',
        'Maintain professional conduct with customers',
        'No false advertising or misrepresentation',
        'Report technical issues promptly',
        'Backup your data regularly',
        'Comply with all applicable laws'
      ]
    },
    {
      id: 'menu-management',
      title: 'Menu & Dish Management',
      content: 'Providers are responsible for accurate dish descriptions, pricing, and availability. Menu changes must be updated promptly. Tiffine is not responsible for provider menu errors or misrepresentations.'
    },
    {
      id: 'customer-management',
      title: 'Customer Management',
      items: [
        'Obtain customer consent for data collection',
        'Handle customer complaints professionally',
        'Maintain customer data confidentiality',
        'Provide accurate billing information',
        'Honor customer preferences and dietary restrictions',
        'Send timely notifications and updates'
      ]
    },
    {
      id: 'billing-payments',
      title: 'Billing & Payments',
      content: 'Providers are responsible for generating accurate bills. Tiffine provides billing tools but is not responsible for billing errors. Providers must handle their own payment collection from customers.'
    },
    {
      id: 'data-ownership',
      title: 'Data Ownership & Usage',
      items: [
        'Providers own their business data',
        'Tiffine can use anonymized data for analytics',
        'Customer data must be handled per Privacy Policy',
        'Providers must delete data upon account closure',
        'Tiffine maintains operational data backups'
      ]
    },
    {
      id: 'intellectual-property',
      title: 'Intellectual Property',
      content: 'All App software, design, and content are owned by Techtriosphere. Providers grant limited license to use their menu content for service delivery. No copying or redistribution of App content allowed.'
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      items: [
        'Tiffine not liable for food quality issues',
        'Not responsible for customer-provider disputes',
        'No liability for payment processing errors',
        'Not liable for technical service interruptions',
        'No responsibility for third-party service failures',
        'Maximum liability limited to subscription fee'
      ]
    },
    {
      id: 'termination',
      title: 'Termination & Suspension',
      content: 'Tiffine may suspend accounts for violations. Providers may terminate subscription anytime. Upon termination, provider data will be deleted after 30 days. Active obligations survive termination.'
    },
    {
      id: 'modifications',
      title: 'Modifications to Terms',
      content: 'Tiffine may update these terms. Providers will be notified of changes. Continued use after changes constitutes acceptance. Major changes will have 30-day advance notice.'
    },
    {
      id: 'governing-law',
      title: 'Governing Law & Dispute Resolution',
      content: 'These terms are governed by Indian law. Disputes will be resolved in Ahmedabad courts. Providers agree to informal dispute resolution before legal action.'
    }
  ];

  const contactInfo = [
  
    {
      icon: 'headset',
      label: 'Support',
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

  const renderSection = (section: any) => (
    <View style={styles.sectionCard} key={section.id}>
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text" size={20} color="#8b5cf6" />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      
      {section.content && (
        <Text style={styles.sectionContent}>{section.content}</Text>
      )}
      
      {section.items && (
        <View style={styles.itemsList}>
          {section.items.map((item: string, index: number) => (
            <View key={index} style={styles.listItem}>
              <View style={styles.bulletPoint}>
                <Text style={styles.bulletText}>•</Text>
              </View>
              <Text style={styles.listItemText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        backgroundColor="#f8fafc"
        barStyle="dark-content"
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
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Terms & Conditions</Text>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Feather name="share-2" size={20} color="#333" />
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
          colors={['#8b5cf6', '#a78bfa']}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="gavel" size={32} color="white" />
            </View>
            <Text style={styles.heroTitle}>Terms & Conditions</Text>
            <Text style={styles.heroSubtitle}>For Tiffine Service Providers</Text>
            <Text style={styles.effectiveDate}>Effective from: December 10, 2025</Text>
          </View>
        </LinearGradient>

        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={styles.noticeTitle}>Important Notice</Text>
          </View>
          <Text style={styles.noticeText}>
            Please read these terms carefully. By using the Tiffine Provider App, you agree to all terms below. These terms govern your use of our services and outline your responsibilities as a provider.
          </Text>
        </View>

        {/* Key Points */}
        <View style={styles.keyPointsSection}>
          <Text style={styles.keyPointsTitle}>Key Points</Text>
          <View style={styles.keyPointsGrid}>
            <View style={styles.keyPointCard}>
              <View style={[styles.keyPointIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="calendar" size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.keyPointText}>7-Day Free Trial</Text>
            </View>
            
            <View style={styles.keyPointCard}>
              <View style={[styles.keyPointIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              </View>
              <Text style={styles.keyPointText}>Data Responsibility</Text>
            </View>
            
            <View style={styles.keyPointCard}>
              <View style={[styles.keyPointIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="card" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.keyPointText}>Razorpay Payments</Text>
            </View>
            
            <View style={styles.keyPointCard}>
              <View style={[styles.keyPointIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="restaurant" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.keyPointText}>Food Safety Compliance</Text>
            </View>
          </View>
        </View>

        {/* Terms Sections */}
        <View style={styles.sectionsContainer}>
          {sections.map(renderSection)}
        </View>

        {/* Provider Agreement */}
        <View style={styles.agreementCard}>
          <View style={styles.agreementHeader}>
            <Ionicons name="hand-left" size={24} color="#8b5cf6" />
            <Text style={styles.agreementTitle}>Provider Agreement</Text>
          </View>
          <Text style={styles.agreementText}>
            By using Tiffine Service Provider App, you acknowledge that:{'\n\n'}
            1. You have read and understood these terms{'\n'}
            2. You agree to comply with all provisions{'\n'}
            3. You are responsible for your actions{'\n'}
            4. You will maintain professional standards{'\n'}
            5. You accept the subscription model
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact for Clarifications</Text>
          <View style={styles.contactCards}>
            {contactInfo.map((contact, index) => (
              <TouchableOpacity
                key={index}
                style={styles.contactCardItem}
                onPress={contact.action}
                activeOpacity={0.7}
              >
                <View style={styles.contactIconWrapper}>
                  <Ionicons name={contact.icon as any} size={20} color="#8b5cf6" />
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

        {/* Legal Footer */}
        <View style={styles.legalFooter}>
          <Text style={styles.legalTitle}>Legal Information</Text>
          <View style={styles.legalDetails}>
            <Text style={styles.legalText}>
              <Text style={styles.legalBold}>Company:</Text> Triosphere Tech Pvt. Ltd.{'\n'}
              <Text style={styles.legalBold}>Address:</Text> 1205, Phoenix building, Vijay Cross Road to Commerce Six Road,Ahmedabad, Gujarat, India.{'\n'}
              <Text style={styles.legalBold}>Legal Jurisdiction:</Text> Ahmedabad, Gujarat, India.
            </Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
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
  
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  
  /* ===== SCROLL VIEW ===== */
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 90 : 80,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  
  /* ===== HERO SECTION ===== */
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
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  
  effectiveDate: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  
  /* ===== NOTICE CARD ===== */
  noticeCard: {
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  
  noticeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  
  noticeText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  
  /* ===== KEY POINTS ===== */
  keyPointsSection: {
    marginBottom: 24,
  },
  
  keyPointsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  
  keyPointsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  keyPointCard: {
    width: (width - 52) / 2,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  
  keyPointIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  
  keyPointText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  
  /* ===== SECTIONS ===== */
  sectionsContainer: {
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
  
  bulletPoint: {
    width: 20,
    alignItems: 'center',
  },
  
  bulletText: {
    fontSize: 16,
    color: '#8b5cf6',
    fontWeight: 'bold',
  },
  
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  
  /* ===== AGREEMENT CARD ===== */
  agreementCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  
  agreementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  
  agreementText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  
  /* ===== CONTACT SECTION ===== */
  contactSection: {
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
    backgroundColor: '#f5f3ff',
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
  
  /* ===== LEGAL FOOTER ===== */
  legalFooter: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  
  legalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  
  legalDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
  },
  
  legalText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#555',
  },
  
  legalBold: {
    fontWeight: '600',
    color: '#333',
  },
  
  /* ===== FOOTER ===== */
  footer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 16,
  },
  
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
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

export default TermsConditionsScreen;