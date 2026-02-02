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
  KeyboardAvoidingView,
  Image
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
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

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
  const [isPaymentScreen, setIsPaymentScreen] = useState(false);
  
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

  // Check if user came for payment
  useEffect(() => {
    if (params.payment === 'true' || params.planId) {
      setIsPaymentScreen(true);
      if (params.planId) {
        handleSubscribe(params.planId as string);
      }
    }
  }, [params]);

  // Fetch plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const plansRes = await axios.get(`${API_URL}/api/plans`);

        if (plansRes.data.success) {
          setPlans(plansRes.data.data || []);
          setError(null);
        } else {
          throw new Error(plansRes.data.error || 'Failed to fetch plans');
        }
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setPlans([]);
          return;
        }
        setError(err?.response?.data?.error || err?.message || 'Something went wrong');
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
      setIsPaymentScreen(true);

      const res = await axios.post(`${API_URL}/api/subscription/create`, {
        providerId,
        planId
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Subscription creation failed');
      }

      const { subscriptionId, key } = res.data;
      const selectedPlan = plans.find((p) => p._id === planId);
      if (!selectedPlan) throw new Error('Plan not found');

      // Create payment HTML
      const razorpayHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Complete Your Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-top: 20px; /* Added for extra safety on Android */
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
      padding-top: 20px; /* Added padding-top for Android devices */
    }
    .container {
      max-width: 500px;
      width: 100%;
      padding: 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-top: 20px; /* Alternative: Add padding to header instead */
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #15803d;
      margin-bottom: 10px;
      padding-top: 10px; /* You can also add padding to logo specifically */
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
    }
    .payment-info {
      background: white;
      border-radius: 16px;
      padding: 25px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    .plan-name {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 5px;
    }
    .plan-price {
      font-size: 32px;
      font-weight: bold;
      color: #15803d;
      margin-bottom: 15px;
    }
    .features {
      margin-top: 20px;
    }
    .feature {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
      color: #475569;
    }
    .feature-icon {
      margin-right: 10px;
      color: #15803d;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
    <div id="razorpay-container"></div>
  </div>

  <script>
    var options = {
      key: "${key}",
      subscription_id: "${subscriptionId}",
      name: "Tiffin Service",
      description: "${selectedPlan.name}",
      image: "https://Lichi/logo.png",
      prefill: {
        email: "${providerEmail}",
        contact: ""
      },
      theme: { 
        color: "#15803d",
        backdrop_color: "#f8fafc"
      },
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
      },
      notes: {
        service: "Tiffin Service Subscription"
      }
    };
    
    var rzp = new Razorpay(options);
    
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'payment_failed',
        error: response.error
      }));
    });
    
    // Auto-open payment modal
    setTimeout(function() {
      rzp.open();
    }, 500);
  </script>
</body>
</html>`;
      setPaymentLink(razorpayHtml);
    } catch (err) {
      setPaymentStatus('failed');
      setIsPaymentScreen(false);
      Alert.alert(
        'Payment Failed', 
        err instanceof Error ? err.message : 'Unknown error occurred. Please try again.'
      );
    }
  };

  const verifyPayment = async (paymentResponse: any) => {
    try {
      setPaymentStatus('processing');
      
      const res = await axios.post(`${API_URL}/api/subscription/verify`, {
        providerId,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
        razorpay_signature: paymentResponse.razorpay_signature
      });
      
      if (res.data.success) {
        setPaymentStatus('success');
        setPaymentLink(null);
        setIsPaymentScreen(false);
        
        Alert.alert(
          'Success! 🎉', 
          'Payment completed successfully! Your subscription is now active.',
          [
            {
              text: 'continue',
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
      setIsPaymentScreen(false);
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
          setIsPaymentScreen(false);
          Alert.alert('Payment Failed', data.error?.description || 'Payment failed. Please try again.');
          break;
          
        case 'modal_closed':
          setPaymentLink(null);
          setIsPaymentScreen(false);
          setPaymentStatus('idle');
          break;
          
        default:
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
  };

  // If payment screen is active, show payment UI
  if (isPaymentScreen && paymentLink) {
    return (
      <SafeAreaView  style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.paymentHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setPaymentLink(null);
              setIsPaymentScreen(false);
            }}
          >
            {/* <Ionicons name="arrow-back" size={24} color="#333" /> */}
          </TouchableOpacity>
         
          <View style={{ width: 40 }} />
        </View>
        
        <View style={styles.webviewWrapper}>
          <WebView
            source={{ html: paymentLink }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#15803d" />
                <Text style={styles.loadingText}>Loading payment gateway...</Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error State
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#dc3545" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredPlans = plans.filter(plan => {
    if (!plan.isVisible) return false;
    return plan.interval === (activeTab === 'monthly' ? 'month' : 'year');
  });

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
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.popularBadgeText}>POPULAR</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.planPrice}>₹{plan.price}</Text>
              <Text style={styles.planInterval}>/{plan.interval === 'month' ? 'month' : 'year'}</Text>
            </View>
          </View>
          {isPopular && (
            <View style={styles.recommendedTag}>
              <Ionicons name="checkmark-circle" size={16} color="#15803d" />
              <Text style={styles.recommendedText}>Recommended</Text>
            </View>
          )}
        </View>
        
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Ionicons name="people" size={16} color="#15803d" />
            <Text style={styles.featureText}>
              <Text style={styles.featureBold}>{plan.features.maxCustomers}</Text> customers
            </Text>
          </View>
          
          {plan.features.analytics && (
            <View style={styles.featureItem}>
              <Ionicons name="analytics" size={16} color="#15803d" />
              <Text style={styles.featureText}>Advanced Analytics</Text>
            </View>
          )}
          
          <View style={styles.featureItem}>
            <Ionicons name="notifications" size={16} color="#15803d" />
            <Text style={styles.featureText}>Push Notifications</Text>
          </View>
          
          <View style={styles.featureItem}>
            <Ionicons name="cloud" size={16} color="#15803d" />
            <Text style={styles.featureText}>Cloud Backup</Text>
          </View>
          
          {plan.features.supportPriority && (
            <View style={styles.featureItem}>
              <Ionicons 
                name={plan.features.supportPriority === 'priority' ? 'star' : 'headset'} 
                size={16} 
                color="#15803d" 
              />
              <Text style={styles.featureText}>
                {plan.features.supportPriority === 'priority' ? 'Priority Support' : 'Standard Support'}
              </Text>
            </View>
          )}
        </View>

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
            <Text style={styles.buttonText}>
              {trialStatus?.isActive ? 'Subscribe Now' : 'Get Started'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Fixed Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            {/* <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity> */}
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>
                {trialStatus?.requiresSubscription 
                  ? 'Subscribe to Continue' 
                  : 'Choose Your Plan'}
              </Text>
              <Text style={styles.subtitle}>
                {trialStatus?.isActive 
                  ? `Enjoy ${trialStatus.daysLeft} days free, then choose a plan`
                  : 'Select the perfect plan for your tiffin business'}
              </Text>
            </View>
          </View>
          
          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
              onPress={() => setActiveTab('monthly')}
            >
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
                Monthly Billing
              </Text>
              {/* {activeTab === 'monthly' && (
                <Text style={styles.tabSubtext}>Flexible</Text>
              )} */}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'yearly' && styles.activeTab]}
              onPress={() => setActiveTab('yearly')}
            >
              <Text style={[styles.tabText, activeTab === 'yearly' && styles.activeTabText]}>
                Yearly Billing
              </Text>
              {/* {activeTab === 'yearly' && (
                <Text style={styles.tabSubtext}>Save 20%</Text>
              )} */}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Status Card */}
          {(trialStatus?.isActive || hasActiveSubscription || trialStatus?.requiresSubscription) && (
            <View style={[
              styles.statusCard,
              hasActiveSubscription ? styles.subscriptionActiveCard :
              trialStatus?.isActive ? styles.trialActiveCard :
              styles.trialExpiredCard
            ]}>
              <View style={styles.statusHeader}>
                <Ionicons 
                  name={
                    hasActiveSubscription ? "checkmark-circle" :
                    trialStatus?.isActive ? "gift" : "time-outline"
                  } 
                  size={24} 
                  color={
                    hasActiveSubscription ? "#10b981" :
                    trialStatus?.isActive ? "#15803d" : "#dc3545"
                  } 
                />
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusTitle}>
                    {hasActiveSubscription ? 'Subscription Active' :
                     trialStatus?.isActive ? `Free Trial - ${trialStatus.daysLeft} days left` :
                     'Trial Expired'}
                  </Text>
                  <Text style={styles.statusDescription}>
                    {hasActiveSubscription ? 'Enjoy full access to all features!' :
                     trialStatus?.isActive ? `Full access for ${trialStatus.daysLeft} more days` :
                     'Subscribe now to continue using our services'}
                  </Text>
                </View>
              </View>
              {trialStatus?.isActive && !hasActiveSubscription && (
                <TouchableOpacity 
                  style={styles.dashboardButton}
                  onPress={() => router.replace('/dashboard')}
                >
                  <Text style={styles.dashboardButtonText}>Continue </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Plans Grid */}
          <View style={styles.plansContainer}>
            {filteredPlans.length > 0 ? (
              filteredPlans.map(renderPlanCard)
            ) : (
              <View style={styles.noPlansContainer}>
                <Ionicons name="document-text-outline" size={60} color="#e5e7eb" />
                <Text style={styles.noPlansText}>
                  No {activeTab} plans available at the moment
                </Text>
                <Text style={styles.noPlansSubtext}>
                  Please check back later or contact support
                </Text>
              </View>
            )}
          </View>

          {/* FAQ Section */}
          <View style={styles.faqContainer}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            
            <View style={styles.faqItem}>
              <View style={styles.faqIcon}>
                <Ionicons name="help-circle" size={20} color="#15803d" />
              </View>
              <View style={styles.faqContent}>
                <Text style={styles.faqQuestion}>How does the free trial work?</Text>
                <Text style={styles.faqAnswer}>
                  Enjoy full access to all features for 7 days. No credit card required.
                </Text>
              </View>
            </View>
            
            <View style={styles.faqItem}>
              <View style={styles.faqIcon}>
                <Ionicons name="calendar" size={20} color="#15803d" />
              </View>
              <View style={styles.faqContent}>
                <Text style={styles.faqQuestion}>Can I renew anytime?</Text>
                <Text style={styles.faqAnswer}>
                  Yes! renew your subscription after your subscription period end with no hidden fees.
                </Text>
              </View>
            </View>
            
            <View style={styles.faqItem}>
              <View style={styles.faqIcon}>
                <Ionicons name="card" size={20} color="#15803d" />
              </View>
              <View style={styles.faqContent}>
                <Text style={styles.faqQuestion}>What payment methods are accepted?</Text>
                <Text style={styles.faqAnswer}>
                  All major credit/debit cards, UPI, and net banking via Razorpay.
                </Text>
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {/* <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={16} color="#15803d" />
              <Text style={styles.securityText}>Secure Payment • 256-bit SSL</Text>
            </View> */}
            <Text style={styles.footerText}>
              Need help? Contact us at support@tiffinservice.com
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardAvoid: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  headerContent: {
    flex: 1,
    alignItems: 'center',
     
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  activeTabText: {
    color: '#15803d',
  },
  tabSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  
  // Container
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Status Card
statusCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
     backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  
  },
  trialActiveCard: {
    backgroundColor: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
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
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  dashboardButton: {
    backgroundColor: '#15803d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  dashboardButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  
  // Plans Container
  plansContainer: {
    gap: 20,
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  popularPlanCard: {
    borderWidth: 2,
    borderColor: '#15803d',
    backgroundColor: '#f0fdf4',
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#15803d',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#15803d',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 36,
    fontWeight: '800',
    color: '#15803d',
  },
  planInterval: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    marginLeft: 4,
  },
  recommendedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  featuresContainer: {
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  featureText: {
    fontSize: 15,
    color: '#475569',
    marginLeft: 12,
    flex: 1,
  },
  featureBold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  subscribeButton: {
    backgroundColor: '#15803d',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  popularSubscribeButton: {
    backgroundColor: '#0f766e',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  noPlansContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginVertical: 20,
  },
  noPlansText: {
    fontSize: 18,
    color: '#64748b',
    marginTop: 15,
    textAlign: 'center',
    fontWeight: '600',
  },
  noPlansSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // FAQ Section
  faqContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  faqItem: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  faqIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  faqContent: {
    flex: 1,
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
    lineHeight: 22,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
    gap: 6,
  },
  securityText: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '600',
  },
  footerText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Payment Screen Styles
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  paymentHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  webviewWrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});

export default SubscriptionPlans;