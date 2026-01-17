import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
  Dimensions,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import {Text,TextStyles} from '@/components/ztext';
import axios from 'axios';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from './store/hooks';
import { API_URL } from './config/env';

const { width, height } = Dimensions.get('window');

interface Subscription {
  planId: any;
  razorpayPlanId: string;
  razorpaySubscriptionId: string;
  razorpayCustomerId: string;
  status: 'active' | 'inactive' | 'cancelled' | 'pending';
  startDate: string;
  endDate: string;
  paymentMethod: string;
  invoices: Array<{
    invoiceId: string;
    amount: number;
    date: string;
    status: string;
  }>;
  renewalPending?: {
    planId: string;
    razorpayPlanId: string;
    razorpaySubscriptionId: string;
    status: string;
    createdAt: string;
  };
}

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

const SubscriptionManagement = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedRenewalPlan, setSelectedRenewalPlan] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Trial states
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [checkingTrial, setCheckingTrial] = useState(true);

  const provider = useAppSelector((state)=>state.provider);
  const providerId = provider.id;
  const providerEmail = params.providerEmail as string;

  useEffect(() => {
    fetchSubscriptionData();
  }, [providerId]);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setCheckingTrial(true);
      
      // Fetch trial status first
      const trialRes = await axios.get(`${API_URL}/api/subscription/trial-status/${providerId}`);
      
      if (trialRes.data.success) {
        setTrialStatus(trialRes.data.trialStatus);
        
        // Only fetch subscription data if user doesn't have active trial
        if (!trialRes.data.trialStatus?.isActive) {
          const subscriptionRes = await axios.get(`${API_URL}/api/subscription/provider/${providerId}`);
          
          if (subscriptionRes.data.success) {
            setSubscription(subscriptionRes.data.subscription);
            
            if (subscriptionRes.data.expiresSoon) {
              setTimeout(() => {
                Alert.alert(
                  'Subscription Renewal Reminder',
                  `Your subscription expires in ${subscriptionRes.data.daysUntilExpiry} days. Would you like to renew now?`,
                  [
                    { text: 'Later', style: 'cancel' },
                    { text: 'Renew Now', onPress: () => setShowRenewalModal(true) }
                  ]
                );
              }, 1000);
            }
          }
        }
      }

      // Fetch plans (for renewal modal)
      const plansRes = await axios.get(`${API_URL}/api/plans`);
      if (plansRes.data.success) {
        setPlans(plansRes.data.data || []);
      }

      setError(null);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : (err as Error).message;
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setCheckingTrial(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubscriptionData();
  };

  const handleRenewSubscription = async (planId: string) => {
    try {
      setActionLoading('renew');
      setSelectedRenewalPlan(planId);

      const res = await axios.post(`${API_URL}/api/subscription/renew`, {
        providerId,
        planId
      });

      if (!res.data.success) {
        throw new Error(res.data.error || 'Renewal failed');
      }

      const { subscriptionId, key, isRenewal } = res.data;
      const selectedPlan = plans.find(p => p._id === planId);
      
      if (!selectedPlan) throw new Error('Plan not found');

      if (Platform.OS !== 'web') {
        const razorpayHtml = generateRazorpayHtml(subscriptionId, key, selectedPlan, isRenewal);
        setPaymentLink(razorpayHtml);
        setShowRenewalModal(false);
      }

    } catch (err) {
      Alert.alert('Renewal Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('cancel');
              
              const res = await axios.post(`${API_URL}/api/subscription/cancel`, {
                providerId
              });

              if (res.data.success) {
                Alert.alert('Success', 'Subscription cancelled successfully');
                fetchSubscriptionData();
              } else {
                throw new Error(res.data.error);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel subscription');
            } finally {
              setActionLoading(null);
            }
          }
        }
      ]
    );
  };

  const generateRazorpayHtml = (subscriptionId: string, key: string, plan: Plan, isRenewal: boolean) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f7fa; }
          .loader { display: flex; flex-direction: column; align-items: center; text-align: center; }
          .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #15803d; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="loader" id="loader">
          <div class="spinner"></div>
          <p>Loading payment gateway...</p>
        </div>
        <script>
          function initializePayment() {
            var options = {
              key: "${key}",
              subscription_id: "${subscriptionId}",
              name: "Tiffin Service",
              description: "${isRenewal ? 'Renewal - ' : ''}${plan.name}",
              prefill: { email: "${providerEmail}" },
              theme: { color: "#15803d" },
              handler: function(response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'success',
                  response: response,
                  isRenewal: ${isRenewal}
                }));
              },
              modal: {
                ondismiss: function() {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'modal_closed' }));
                }
              }
            };
            
            var rzp = new Razorpay(options);
            rzp.on('payment.failed', function(response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'failed', error: response.error }));
            });
            rzp.open();
          }
          setTimeout(initializePayment, 1000);
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.status === 'success') {
        verifyPayment(data.response, data.isRenewal);
      } else if (data.status === 'failed') {
        setPaymentLink(null);
        Alert.alert('Payment Failed', 'Please try again.');
      } else if (data.status === 'modal_closed') {
        setPaymentLink(null);
      }
    } catch (error) {
      console.error('WebView message error:', error);
    }
  };

  const verifyPayment = async (paymentResponse: any, isRenewal: boolean) => {
    try {
      const res = await axios.post(`${API_URL}/api/subscription/verify`, {
        providerId,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
        razorpay_signature: paymentResponse.razorpay_signature
      });

      if (res.data.success) {
        setPaymentLink(null);
        Alert.alert(
          'Success!',
          `Payment completed successfully! Your subscription has been ${isRenewal ? 'renewed' : 'activated'}.`,
          [{ text: 'OK', onPress: fetchSubscriptionData }]
        );
      }
    } catch (error) {
      setPaymentLink(null);
      fetchSubscriptionData();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Trial Status Card Component
  const TrialStatusCard = () => {
    if (!trialStatus) return null;

    if (trialStatus.isActive) {
      const daysLeft = trialStatus.daysLeft || 0;
      const isLastDay = daysLeft <= 1;
      
      return (
        <LinearGradient
          colors={isLastDay ? ['#f59e0b', '#f59e0b'] : ['#15803d', '#16a34a']}
          style={styles.subscriptionCard}
        >
          <View style={styles.cardHeader}>
            <Text weight='bold' style={styles.cardTitle}>Free Trial Period</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#ffffff' }]}>
              <Text weight='bold' style={[styles.statusText, { color: isLastDay ? '#d97706' : '#15803d' }]}>
                ACTIVE
              </Text>
            </View>
          </View>
          
          <Text weight='bold' style={styles.planName}>
            {isLastDay ? 'Last Day of Free Trial!' : 'Enjoy Your Free Trial!'}
          </Text>
          
          <View style={styles.trialCountdown}>
            <View style={styles.countdownBox}>
              <Text weight='bold' style={styles.countdownNumber}>{daysLeft}</Text>
              <Text weight='bold' style={styles.countdownLabel}>DAYS</Text>
            </View>
            <View style={styles.countdownBox}>
              <Text weight='bold' style={styles.countdownNumber}>{trialStatus.hoursLeft % 24}</Text>
              <Text weight='bold' style={styles.countdownLabel}>HOURS</Text>
            </View>
          </View>

          <View style={styles.datesContainer}>
            <View style={styles.dateItem}>
              <Text weight='bold' style={styles.dateLabel}>Started On</Text>
              <Text weight='bold' style={styles.dateValue}>{formatDate(trialStatus.startedAt || '')}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text weight='bold' style={styles.dateLabel}>Ends On</Text>
              <Text weight='bold' style={styles.dateValue}>{formatDate(trialStatus.endsAt || '')}</Text>
            </View>
          </View>

          <View style={styles.renewalReminder}>
            <Ionicons name={isLastDay ? "alert-circle-outline" : "information-circle-outline"} size={20} color="#fff" />
            <Text weight='bold' style={styles.renewalText}>
              {isLastDay 
                ? 'Trial ends today! Subscribe to continue without interruption.'
                : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Subscribe anytime.`
              }
            </Text>
          </View>
        </LinearGradient>
      );
    }

    if (trialStatus.requiresSubscription) {
      return (
        <LinearGradient
          colors={['#dc3545', '#dc3545']}
          style={styles.subscriptionCard}
        >
          <View style={styles.cardHeader}>
            <Text weight='bold' style={styles.cardTitle}>Trial Period Expired</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#ffffff' }]}>
              <Text weight='bold' style={[styles.statusText, { color: '#dc3545' }]}>
                EXPIRED
              </Text>
            </View>
          </View>
          
          <Text weight='bold' style={styles.planName}>
            Subscribe to Continue
          </Text>
          
          <View style={styles.datesContainer}>
            <View style={styles.dateItem}>
              <Text weight='bold' style={styles.dateLabel}>Trial Started</Text>
              <Text weight='bold' style={styles.dateValue}>{formatDate(trialStatus.startedAt || '')}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text weight='bold' style={styles.dateLabel}>Trial Ended</Text>
              <Text weight='bold' style={styles.dateValue}>{formatDate(trialStatus.endsAt || '')}</Text>
            </View>
          </View>

          <View style={styles.renewalReminder}>
            <Ionicons name="alert-circle-outline" size={20} color="#fff" />
            <Text weight='bold' style={styles.renewalText}>
              Your 7-day free trial has ended. Choose a subscription plan to continue.
            </Text>
          </View>
        </LinearGradient>
      );
    }

    return null;
  };

  if ((loading || checkingTrial) && !subscription && !trialStatus) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text weight='bold' style={styles.loadingText}>Loading Subscription Details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={true}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={50} color="#dc3545" />
            <Text weight='bold' style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={fetchSubscriptionData}
            >
              <Text weight='bold' style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : trialStatus?.isActive ? (
          // Show Trial Status when trial is active
          <>
            <TrialStatusCard />
            
            {/* Action Buttons for Trial Users */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.subscribeNowButton}
                onPress={() => router.push('/subscription-plans')}
              >
                <Ionicons name="card" size={20} color="#fff" />
                <Text weight='bold' style={styles.buttonText}>Browse Plans</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.continueTrialButton}
                onPress={() => router.push('/dashboard')}
              >
                <Ionicons name="rocket-outline" size={20} color="#15803d" />
                <Text weight='bold' style={[styles.buttonText, { color: '#15803d' }]}>
                  Continue with Trial
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trial Features Section */}
            <View style={styles.invoiceSection}>
              <Text weight='bold' style={styles.sectionTitle}>Trial Features</Text>
              <View style={styles.trialFeaturesList}>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text weight='bold' style={styles.featureText}>Full access to all premium features</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text weight='bold' style={styles.featureText}>Unlimited customers during trial</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text weight='bold' style={styles.featureText}>Advanced analytics dashboard</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text weight='bold' style={styles.featureText}>No credit card required for trial</Text>
                </View>
              </View>
            </View>
          </>
        ) : trialStatus?.requiresSubscription ? (
          // Show Trial Expired Status
          <>
            <TrialStatusCard />
            
            {/* Action Buttons for Expired Trial */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.subscribeNowButton}
                onPress={() => router.push('/subscription-plans')}
              >
                <Ionicons name="card" size={20} color="#fff" />
                <Text weight='bold' style={styles.buttonText}>Subscribe Now</Text>
              </TouchableOpacity>
            </View>

            {/* Expired Trial Info */}
            <View style={styles.invoiceSection}>
              <Text weight='bold' style={styles.sectionTitle}>What happens now?</Text>
              <View style={styles.trialFeaturesList}>
                <View style={styles.featureItem}>
                  <Ionicons name="information-circle" size={20} color="#6b7280" />
                  <Text weight='bold' style={styles.featureText}>Your account access is currently paused</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="information-circle" size={20} color="#6b7280" />
                  <Text weight='bold' style={styles.featureText}>All your data is safe and preserved</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="information-circle" size={20} color="#6b7280" />
                  <Text weight='bold' style={styles.featureText}>Subscribe anytime to regain full access</Text>
                </View>
                <View style={styles.featureItem}>
                  <Ionicons name="information-circle" size={20} color="#6b7280" />
                  <Text weight='bold' style={styles.featureText}>Choose from flexible monthly or yearly plans</Text>
                </View>
              </View>
            </View>
          </>
        ) : subscription ? (
          // Show Subscription Data (Existing logic)
          <>
            {/* Current Subscription Card */}
            <LinearGradient
              colors={['#15803d', '#15803d']}
              style={styles.subscriptionCard}
            >
              <View style={styles.cardHeader}>
                <Text weight='bold' style={styles.cardTitle}>Current Plan</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(subscription.status) }]}>
                  <Text weight='bold' style={styles.statusText}>{subscription.status.toUpperCase()}</Text>
                </View>
              </View>
              
              <Text weight='bold' style={styles.planName}>
                {subscription.planId?.name || 'Premium Plan'}
              </Text>
              
              <View style={styles.datesContainer}>
                <View style={styles.dateItem}>
                  <Text weight='bold' style={styles.dateLabel}>Start Date</Text>
                  <Text weight='bold' style={styles.dateValue}>{formatDate(subscription.startDate)}</Text>
                </View>
                <View style={styles.dateItem}>
                  <Text weight='bold' style={styles.dateLabel}>End Date</Text>
                  <Text weight='bold' style={styles.dateValue}>{formatDate(subscription.endDate)}</Text>
                </View>
              </View>

              {subscription.status === 'active' && (
                <View style={styles.renewalReminder}>
                  <Ionicons name="notifications-outline" size={20} color="#fff" />
                  <Text weight='bold' style={styles.renewalText}>
                    Auto-renews on {formatDate(subscription.endDate)}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {subscription.status === 'active' && (
                <>
                  <TouchableOpacity
                    style={styles.renewButton}
                    onPress={() => setShowRenewalModal(true)}
                  >
                    <Ionicons name="refresh" size={20} color="#fff" />
                    <Text weight='bold' style={styles.buttonText}>Renew Early</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Invoice History */}
            <View style={styles.invoiceSection}>
              <Text weight='bold' style={styles.sectionTitle}>Payment History</Text>
              {subscription.invoices.length > 0 ? (
                <View style={[
                  styles.invoiceListContainer,
                  subscription.invoices.length > 2 && styles.scrollableInvoiceList
                ]}>
                  {subscription.invoices.length > 2 ? (
                    <ScrollView 
                      style={styles.invoiceScrollView}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                    >
                      {subscription.invoices.map((invoice, index) => (
                        <View key={index} style={styles.invoiceItem}>
                          <View style={styles.invoiceInfo}>
                            <Text weight='bold' style={styles.invoiceId}>Invoice #{invoice.invoiceId.slice(-8)}</Text>
                            <Text weight='bold' style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
                          </View>
                          <Text weight='bold' style={styles.invoiceAmount}>₹{invoice.amount}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  ) : (
                    subscription.invoices.map((invoice, index) => (
                      <View key={index} style={styles.invoiceItem}>
                        <View style={styles.invoiceInfo}>
                          <Text weight='bold' style={styles.invoiceId}>Invoice #{invoice.invoiceId.slice(-8)}</Text>
                          <Text weight='bold' style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
                        </View>
                        <Text weight='bold' style={styles.invoiceAmount}>₹{invoice.amount}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : (
                <Text weight='bold' style={styles.noInvoices}>No payment history available</Text>
              )}
            </View>
          </>
        ) : (
          // No subscription or trial
          <View style={styles.noSubscription}>
            <Ionicons name="card-outline" size={60} color="#ccc" />
            <Text weight='bold' style={styles.noSubscriptionText}>No Active Subscription</Text>
            <Text weight='bold' style={styles.noSubscriptionSubtext}>
              Subscribe to a plan to unlock premium features
            </Text>
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={() => router.push('/subscription-plans')}
            >
              <Text weight='bold' style={styles.subscribeButtonText}>Browse Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Renewal Modal */}
      <Modal
        visible={showRenewalModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text weight='bold' style={styles.modalTitle}>Renew Subscription</Text>
              <TouchableOpacity onPress={() => setShowRenewalModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {plans.filter(plan => plan.isActive).map(plan => (
                <TouchableOpacity
                  key={plan._id}
                  style={[
                    styles.planOption,
                    selectedRenewalPlan === plan._id && styles.selectedPlan
                  ]}
                  onPress={() => setSelectedRenewalPlan(plan._id)}
                >
                  <View style={styles.planOptionHeader}>
                    <Text weight='bold' style={styles.planOptionName}>{plan.name}</Text>
                    <Text weight='bold' style={styles.planOptionPrice}>
                      ₹{plan.price}/{plan.interval === 'month' ? 'mo' : 'yr'}
                    </Text>
                  </View>
                  <Text weight='bold' style={styles.planOptionDesc}>{plan.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setShowRenewalModal(false)}
              >
                <Text weight='bold' style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!selectedRenewalPlan || actionLoading === 'renew') && styles.buttonDisabled
                ]}
                onPress={() => selectedRenewalPlan && handleRenewSubscription(selectedRenewalPlan)}
                disabled={!selectedRenewalPlan || actionLoading === 'renew'}
              >
                {actionLoading === 'renew' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text weight='bold' style={styles.confirmButtonText}>Renew Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal 
        visible={!!paymentLink} 
        transparent={false} 
        animationType="slide"
      >
        <View style={styles.webviewContainer}>
          <WebView
            source={{ html: paymentLink || '' }}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 150,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  subscriptionCard: {
    borderRadius: 15,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  trialCountdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 20,
  },
  countdownBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 15,
    borderRadius: 12,
    minWidth: 80,
  },
  countdownNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  countdownLabel: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginTop: 5,
  },
  datesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  renewalReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  renewalText: {
    color: '#fff',
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 15,
    marginBottom: 30,
  },
  subscribeNowButton: {
    flexDirection: 'row',
    backgroundColor: '#15803d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueTrialButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#15803d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  renewButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#10b981',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  invoiceSection: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 20,
  },
  trialFeaturesList: {
    marginTop: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  invoiceListContainer: {},
  scrollableInvoiceList: {
    maxHeight: 300,
  },
  invoiceScrollView: {},
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  noInvoices: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 20,
  },
  noSubscription: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: height * 0.7,
  },
  noSubscriptionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  noSubscriptionSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  subscribeButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  planOption: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  selectedPlan: {
    borderColor: '#15803d',
    backgroundColor: '#f0f8ff',
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  planOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  planOptionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#15803d',
  },
  planOptionDesc: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#e70909ff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelModalText: {
    color: '#fff',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#15803d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
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
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: height * 0.7,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#15803d',
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default SubscriptionManagement;