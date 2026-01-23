import React, { useState, useEffect } from 'react';
import { 
  View,  
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  ScrollView, 
  StatusBar,
  Modal, 
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import api from './api/api';
import { Text } from '@/components/ztext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from './config/env';
import { useSelector } from 'react-redux';
import { RootState } from '@/app/store';


interface Plan {
  _id: string;
  name: string;
  price: number;
  interval: string;
  razorpayPlanId: string;
  features: {
    maxCustomers: number;
    analytics?: boolean;
    supportPriority?: string;
  };
  description?: string;
  isActive: boolean;
  isVisible: boolean;
}

interface TrialStatus {
  hasTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  hoursLeft: number;
  startedAt: string | null;
  endsAt: string | null;
  requiresSubscription: boolean;
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

const { width } = Dimensions.get('window');

const SubscriptionPlans = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // States
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');
  
 
  const [showTrialWelcome, setShowTrialWelcome] = useState(false);
const provider = useSelector((state: RootState) => state.provider);

const providerId = provider.id;
const providerEmail = provider.email;
const trialStatus = provider.trialStatus;
const hasActiveSubscription = provider.subscription?.status === 'active';
  useEffect(() => {
    if (!providerId) {
      Alert.alert('Error', 'Provider information missing. Please login again.');
      router.back();
    }
  }, [providerId]);

  // Fetch trial status and plans
useEffect(() => {
  const fetchPlans = async () => {
    try {
      setLoading(true);

      const plansRes = await api.get(`${API_URL}/api/plans`);

      if (plansRes.data.success) {
        setPlans(plansRes.data.data || []);
        setError(null);
      } else {
        throw new Error(plansRes.data.error || 'Failed to fetch plans');
      }

    } catch (err) {
      const message = api.isapiError(err)
        ? err.response?.data?.error || err.message
        : (err as Error).message;

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  fetchPlans();
}, []);


  const handleSubscribe = async (planId: string) => {
    if (!providerId) {
      Alert.alert('Error', 'Provider information missing. Please login again.');
      return;
    }

    try {
      setSelectedPlanId(planId);
      setPaymentStatus('processing');

      const res = await api.post(`${API_URL}/api/subscription/create`, {
        providerId,
        planId
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Subscription creation failed');
      }

      const { subscriptionId, key } = res.data;
      const selectedPlan = plans.find((p) => p._id === planId);
      if (!selectedPlan) throw new Error('Plan not found');

      // Mobile flow - use WebView
      if (Platform.OS !== 'web') {
        const razorpayHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <script>
    var options = {
      key: "${key}",
      subscription_id: "${subscriptionId}",
      name: "Tiffin Service",
      description: "${selectedPlan.name}",
      prefill: {
        email: "${providerEmail}",
      },
      theme: { color: "#15803d" },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'payment_success',
          data: response
        }));
      },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'modal_closed'
          }));
        }
      }
    };
    
    var rzp = new Razorpay(options);
    
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'payment_failed',
        error: response.error
      }));
    });
    
    rzp.open();
  </script>
</body>
</html>`;
        setPaymentLink(razorpayHtml);
      }
    } catch (err) {
      setPaymentStatus('failed');
      Alert.alert(
        'Payment Failed', 
        err instanceof Error ? err.message : 'Unknown error occurred. Please try again.'
      );
    }
  };

  const verifyPayment = async (paymentResponse: any) => {
    try {
      setPaymentStatus('processing');
      
      const res = await api.post(`${API_URL}/api/subscription/verify`, {
        providerId,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
        razorpay_signature: paymentResponse.razorpay_signature
      });
      
      if (res.data.success) {
        setPaymentStatus('success');
        setPaymentLink(null);
        
        Alert.alert(
          'Success! 🎉', 
          'Payment completed successfully! Your subscription is now active.',
          [
            {
              text: 'Go to Dashboard',
              onPress: () => {
                router.replace({
                  pathname: '/dashboard',
                  params: { providerId }
                });
              }
            }
          ]
        );
      } else {
        throw new Error(res.data.error || 'Payment verification failed');
      }
    } catch (error) {
      setPaymentStatus('failed');
      setPaymentLink(null);
      Alert.alert(
        'Verification Failed',
        'Payment was successful but verification failed. Please check your subscription status in dashboard.'
      );
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'payment_success':
          verifyPayment(data.data);
          break;
          
        case 'payment_failed':
          setPaymentStatus('failed');
          setPaymentLink(null);
          Alert.alert('Payment Failed', 'Payment failed. Please try again.');
          break;
          
        case 'modal_closed':
          setPaymentLink(null);
          setPaymentStatus('idle');
          break;
          
        default:
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
  };

  const handleWebViewNavigation = (navState: any) => {
    if (navState.url && !navState.url.includes('razorpay.com')) {
      return false;
    }
    return true;
  };

  // ========== COMPONENTS ==========

  // Trial Welcome Modal
  const TrialWelcomeModal = () => (
    <Modal
      visible={showTrialWelcome}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTrialWelcome(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={['#15803d', '#16a34a']}
            style={styles.modalGradient}
          >
            <View style={styles.modalIcon}>
              <Ionicons name="gift" size={80} color="#fff" />
            </View>
            <Text style={styles.modalTitle}>🎁 Welcome to Your Free Trial!</Text>
          </LinearGradient>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalSubtitle}>
              You have <Text style={styles.trialHighlight}>{trialStatus?.daysLeft || 7} days</Text> of full access
            </Text>
            
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>Full access to all features</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>No credit card required</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>Cancel anytime</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                <Text style={styles.featureText}>Unlimited customers during trial</Text>
              </View>
            </View>
            
            <Text style={styles.modalNote}>
              After {trialStatus?.daysLeft || 7} days, you'll need to choose a subscription plan to continue.
            </Text>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={() => {
                setShowTrialWelcome(false);
                router.replace('/dashboard');
              }}
            >
              <Text style={styles.modalButtonPrimaryText}>Start Free Trial</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => setShowTrialWelcome(false)}
            >
              <Text style={styles.modalButtonSecondaryText}>View Plans Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Trial Status Card
  const TrialStatusCard = () => {
    if (hasActiveSubscription) {
      return (
        <View style={[styles.statusCard, styles.subscriptionActiveCard]}>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <Text style={styles.statusTitle}>Subscription Active</Text>
          </View>
          <Text style={styles.statusText}>
            Your subscription is active. Enjoy full access to all features!
          </Text>
          <TouchableOpacity 
            style={styles.dashboardButton}
            onPress={() => router.replace('/dashboard')}
          >
            <Text style={styles.dashboardButtonText}>Go to Dashboard →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (trialStatus?.isActive) {
      const daysLeft = trialStatus.daysLeft || 0;
      const isLastDay = daysLeft <= 1;
      
      return (
        <View style={[
          styles.statusCard, 
          isLastDay ? styles.trialWarningCard : styles.trialActiveCard
        ]}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={isLastDay ? "alert-circle" : "gift"} 
              size={24} 
              color={isLastDay ? "#f59e0b" : "#15803d"} 
            />
            <Text style={styles.statusTitle}>
              {isLastDay ? 'Last Day of Free Trial!' : 'You\'re on Free Trial'}
            </Text>
          </View>
          
          <View style={styles.trialCountdown}>
            <View style={styles.countdownBox}>
              <Text style={styles.countdownNumber}>{daysLeft}</Text>
              <Text style={styles.countdownLabel}>DAYS</Text>
            </View>
            <View style={styles.countdownBox}>
              <Text style={styles.countdownNumber}>{trialStatus.hoursLeft % 24}</Text>
              <Text style={styles.countdownLabel}>HOURS</Text>
            </View>
          </View>
          
          <Text style={styles.statusText}>
            {isLastDay 
              ? 'Your trial ends today! Subscribe now to avoid interruption.'
              : `Full access for ${daysLeft} more day${daysLeft === 1 ? '' : 's'}. After trial ends, choose a plan below.`
            }
          </Text>
          
          {!isLastDay && (
            <TouchableOpacity 
              style={styles.dashboardButton}
              onPress={() => router.replace('/dashboard')}
            >
              <Text style={styles.dashboardButtonText}>Continue to Dashboard →</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (trialStatus?.requiresSubscription) {
      return (
        <View style={[styles.statusCard, styles.trialExpiredCard]}>
          <View style={styles.statusHeader}>
            <Ionicons name="time-outline" size={24} color="#dc3545" />
            <Text style={styles.statusTitle}>Trial Period Expired</Text>
          </View>
          <Text style={styles.statusText}>
            Your 7-day free trial has ended. To continue using our services, please choose a subscription plan below.
          </Text>
          <View style={styles.expiredNote}>
            <Ionicons name="information-circle" size={16} color="#6b7280" />
            <Text style={styles.expiredNoteText}>
              All your data is safe. Subscribe to regain access.
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  // Plan Card Component
  const renderPlanCard = (plan: Plan) => {
    const isPopular = plan.features.supportPriority === 'priority';
    const isSelected = selectedPlanId === plan._id;
    
    return (
      <View key={plan._id} style={[
        styles.planCard,
        isPopular && styles.popularPlanCard,
        isSelected && styles.selectedPlanCard
      ]}>
        {isPopular && (
          <View style={styles.popularBadge}>
            <Ionicons name="star" size={14} color="#fff" />
            <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          {isPopular && (
            <View style={styles.recommendedTag}>
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        
        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>₹{plan.price}</Text>
          <Text style={styles.planInterval}>/{plan.interval === 'month' ? 'month' : 'year'}</Text>
        </View>
        
        {plan.interval === 'year' && (
          <View style={styles.yearlySavings}>
            <Ionicons name="pricetag" size={14} color="#10b981" />
            <Text style={styles.savingsText}>Save ₹{Math.round((plan.price * 12) - (plan.price * 10))} annually</Text>
          </View>
        )}
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="people-outline" size={18} color="#15803d" />
            <Text style={styles.featureText}>
              <Text style={styles.featureBold}>Max {plan.features.maxCustomers} customers</Text>
            </Text>
          </View>
          
          {plan.features.analytics && (
            <View style={styles.featureItem}>
              <Ionicons name="analytics-outline" size={18} color="#15803d" />
              <Text style={styles.featureText}>Advanced Analytics Dashboard</Text>
            </View>
          )}
          
          <View style={styles.featureItem}>
            <Ionicons name="notifications-outline" size={18} color="#15803d" />
            <Text style={styles.featureText}>Push Notifications</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="cloud-outline" size={18} color="#15803d" />
            <Text style={styles.featureText}>Cloud Backup</Text>
          </View>
          
          {plan.features.supportPriority && (
            <View style={styles.featureItem}>
              <Ionicons 
                name={plan.features.supportPriority === 'priority' ? 'star' : 'help-buoy-outline'} 
                size={18} 
                color="#15803d" 
              />
              <Text style={styles.featureText}>
                {plan.features.supportPriority === 'priority' ? 'Priority 24/7 Support' : 'Standard Support'}
              </Text>
            </View>
          )}
        </View>

        {plan.description && (
          <Text style={styles.planDescription}>{plan.description}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.subscribeButton,
            isPopular && styles.popularSubscribeButton,
            (paymentStatus === 'processing' && isSelected) && styles.buttonDisabled
          ]}
          onPress={() => handleSubscribe(plan._id)}
          disabled={paymentStatus === 'processing' && isSelected}
        >
          {paymentStatus === 'processing' && isSelected ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.buttonText}>
                {trialStatus?.isActive ? 'Subscribe Now' : 'Get Started'}
              </Text>
              {trialStatus?.isActive && (
                <Text style={styles.buttonSubtext}>
                  Start after {trialStatus.daysLeft} days of free trial
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

const filteredPlans = plans.filter(plan => {
  if (!plan.isVisible) return false;

  if (activeTab === 'monthly') {
    return plan.interval === 'month';
  } else {
    return plan.interval === 'year';
  }
});


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <TrialWelcomeModal />
      
      {/* Sticky Header */}
      <View style={styles.stickyHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {trialStatus?.requiresSubscription 
              ? 'Subscribe to Continue' 
              : 'Choose Your Plan'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="tail">
            {trialStatus?.isActive 
              ? `Enjoy ${trialStatus.daysLeft} days free, then choose a plan`
              : 'Select the perfect plan for your tiffin business'}
          </Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        stickyHeaderIndices={[]}
        showsVerticalScrollIndicator={true}
      >
        {/* Trial/Subscription Status Card */}
        <TrialStatusCard />

        {/* Pricing Toggle */}
        <View style={styles.tabContainer}>
          <View style={styles.tabSwitch}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
              onPress={() => setActiveTab('monthly')}
            >
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
                Monthly
              </Text>
              {/* <Text style={styles.tabSubtext}>Flexible</Text> */}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'yearly' && styles.activeTab]}
              onPress={() => setActiveTab('yearly')}
            >
              <Text style={[styles.tabText, activeTab === 'yearly' && styles.activeTabText]}>
                Yearly
              </Text>
              {/* <Text style={styles.tabSubtext}>Save 20%</Text> */}
            </TouchableOpacity>
          </View>
        </View>

        {/* Plans Grid */}
        <View style={styles.plansContainer}>
          {filteredPlans.length > 0 ? (
            filteredPlans.map(renderPlanCard)
          ) : (
            <View style={styles.noPlansContainer}>
              <Ionicons name="document-text-outline" size={50} color="#ccc" />
              <Text style={styles.noPlansText}>
                No {activeTab} plans available
              </Text>
            </View>
          )}
        </View>

        {/* FAQ Section */}
        <View style={styles.faqContainer}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How does the 7-day free trial work?</Text>
            <Text style={styles.faqAnswer}>
              You get full access to all features for 7 days. No credit card required during trial. After 7 days, choose a plan to continue.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What happens after trial ends?</Text>
            <Text style={styles.faqAnswer}>
              Your account will be paused. You can subscribe at any time to regain access. All your data is safe.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I cancel anytime?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can cancel your subscription anytime. No long-term contracts.
            </Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What payment methods do you accept?</Text>
            <Text style={styles.faqAnswer}>
              We accept all major credit/debit cards, UPI, and net banking via Razorpay.
            </Text>
          </View>
        </View>

        {/* Continue with Trial Button */}
        {trialStatus?.isActive && !hasActiveSubscription && (
          <TouchableOpacity
            style={styles.trialContinueButton}
            onPress={() => {
              Alert.alert(
                'Continue with Free Trial',
                `You have ${trialStatus.daysLeft} days left in your free trial. You can subscribe anytime from dashboard.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Continue to Dashboard', 
                    onPress: () => router.replace('/dashboard') 
                  }
                ]
              );
            }}
          >
            <Ionicons name="rocket-outline" size={20} color="#15803d" />
            <Text style={styles.trialContinueText}>
              Continue with Free Trial ({trialStatus.daysLeft} days left)
            </Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Need help choosing? Contact us at support@tiffinservice.com
          </Text>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal 
        visible={!!paymentLink} 
        transparent={false} 
        animationType="slide"
        onRequestClose={() => setPaymentLink(null)}
      >
        <View style={styles.webviewContainer}>
          <WebView
            source={{ html: paymentLink || '' }}
            onMessage={handleWebViewMessage}
            onNavigationStateChange={handleWebViewNavigation}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowsBackNavigation={false}
          />
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setPaymentLink(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 120, // Added padding to account for sticky header
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#15803d',
    padding: 12,
    borderRadius: 8,
    width: 150,
  },
  retryButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Sticky Header
  stickyHeader: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    paddingTop:20,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  
  // Status Cards
  statusCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  trialActiveCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
  },
  trialWarningCard: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  trialExpiredCard: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  subscriptionActiveCard: {
    backgroundColor: '#d1fae5',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    marginBottom: 15,
  },
  trialCountdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
    gap: 20,
  },
  countdownBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 15,
    borderRadius: 12,
    minWidth: 80,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#15803d',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginTop: 5,
  },
  trialHighlight: {
    fontWeight: 'bold',
    color: '#15803d',
  },
  expiredNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  expiredNoteText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  dashboardButton: {
    backgroundColor: '#15803d',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  dashboardButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Tabs
  tabContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
    padding: 5,
    width: width * 0.8,
    maxWidth: 400,
  },
  tab: {
    flex: 1,
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#15803d',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  tabSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  
  // Plans
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: width > 768 ? (width * 0.45) - 30 : width - 40,
    maxWidth: 400,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 10,
    position: 'relative',
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: '#15803d',
    transform: [{ scale: 1.02 }],
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: '50%',
    transform: [{ translateX: -70 }],
    backgroundColor: '#15803d',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  recommendedTag: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  planPrice: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#15803d',
  },
  planInterval: {
    fontSize: 18,
    color: '#777',
    fontWeight: '500',
    marginLeft: 5,
  },
  yearlySavings: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 20,
    gap: 5,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureText: {
    fontSize: 15,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
  featureBold: {
    fontWeight: '600',
    color: '#333',
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#15803d',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  popularSubscribeButton: {
    backgroundColor: '#0f766e',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  noPlansContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPlansText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    textAlign: 'center',
  },
  
  // FAQ
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  faqTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  faqItem: {
    marginBottom: 20,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  
  // Trial Continue Button
  trialContinueButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#15803d',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  trialContinueText: {
    color: '#15803d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // WebView
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '95%',
    maxWidth: 500,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 30,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 15,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalBody: {
    padding: 30,
  },
  modalSubtitle: {
    fontSize: 18,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 26,
  },
  featuresList: {
    marginBottom: 25,
  },
  modalNote: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  modalButtons: {
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  modalButtonPrimary: {
    backgroundColor: '#15803d',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalButtonSecondary: {
    backgroundColor: '#f3f4f6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SubscriptionPlans;