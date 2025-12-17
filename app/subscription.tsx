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
import axios from 'axios';
import {Text,TextStyles} from '@/components/ztext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from './config/env';

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

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

const { width } = Dimensions.get('window');

const SubscriptionPlans = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>('monthly');

  // Get provider data from params
  const providerId = params.providerId as string;
  const providerEmail = params.providerEmail as string;

  useEffect(() => {
    if (!providerId) {
      Alert.alert('Error', 'Provider information missing. Please login again.');
      router.back();
    }
  }, [providerId]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/api/plans`);
        
        if (!res.data?.success) {
          throw new Error(res.data?.error || 'Failed to fetch plans');
        }
        
        setPlans(res.data.data || []);
        setError(null);
      } catch (err) {
        const message = axios.isAxiosError(err)
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
      theme: { color: "#2c95f8" },
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
// Add this function to your SubscriptionPlans component
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

// Update the WebView message handler

// Function to update subscription status immediately
// Function to update subscription status immediately
// Function to update subscription status immediately
const updateSubscriptionStatus = async (paymentResponse: any) => {
  try {    
    const res = await axios.post(`${API_URL}/api/subscription/verify`, {
      providerId: providerId,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
      razorpay_signature: paymentResponse.razorpay_signature
    });
        
    if (res.data.success) {
      setPaymentStatus('success');
      setPaymentLink(null);
      
      Alert.alert(
        'Success!', 
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
      throw new Error(res.data.error);
    }
  } catch (error) {
    // Even if status update fails, payment was successful
    setPaymentStatus('success');
    setPaymentLink(null);
    Alert.alert(
      'Payment Successful', 
      'Payment completed! Your subscription will be activated shortly.',
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
  }
};

// Update the handleWebViewMessage function
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
  }
};

// Update the handleWebViewMessage function

  const handleWebViewNavigation = (navState: any) => {
    // Allow navigation only within Razorpay domains
    if (navState.url && !navState.url.includes('razorpay.com')) {
      return false;
    }
    return true;
  };

  const filteredPlans = plans.filter(plan => {
    if (activeTab === 'monthly') {
      return plan.interval === 'month' && plan.isActive;
    } else {
      return plan.interval === 'year' && plan.isActive;
    }
  });

  const renderPlanCard = (plan: Plan) => (
    <View key={plan._id} style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planName}>{plan.name}</Text>
        {plan.features.supportPriority === 'priority' && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.planPrice}>
        ₹{plan.price}
        <Text style={styles.planInterval}>/{plan.interval === 'month' ? 'mo' : 'yr'}</Text>
      </Text>
      
      <View style={styles.featuresContainer}>
        <View style={styles.featureItem}>
          <Ionicons name="people-outline" size={18} color="#2c95f8" />
          <Text style={styles.featureText}>Max {plan.features.maxCustomers} customers</Text>
        </View>
        
        {plan.features.analytics && (
          <View style={styles.featureItem}>
            <Ionicons name="analytics-outline" size={18} color="#2c95f8" />
            <Text style={styles.featureText}>Advanced Analytics</Text>
          </View>
        )}
        
        {plan.features.supportPriority && (
          <View style={styles.featureItem}>
            <Ionicons 
              name={plan.features.supportPriority === 'priority' ? 'star' : 'help-buoy-outline'} 
              size={18} 
              color="#2c95f8" 
            />
            <Text style={styles.featureText}>
              {plan.features.supportPriority === 'priority' ? 'Priority' : 'Standard'} Support
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
          (paymentStatus === 'processing' && selectedPlanId === plan._id) && styles.buttonDisabled
        ]}
        onPress={() => handleSubscribe(plan._id)}
        disabled={paymentStatus === 'processing' && selectedPlanId === plan._id}
      >
        {paymentStatus === 'processing' && selectedPlanId === plan._id ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.buttonText}>Subscribe Now</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading && plans.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2c95f8" />
        <Text style={styles.loadingText}>Loading Plans...</Text>
      </View>
    );
  }

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

  return (
    <SafeAreaView style={styles.safeArea}>
    <StatusBar barStyle="dark-content" backgroundColor="#000"/>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Select a subscription that fits your business needs
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <View style={styles.tabSwitch}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
              onPress={() => setActiveTab('monthly')}
            >
              <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'yearly' && styles.activeTab]}
              onPress={() => setActiveTab('yearly')}
            >
              <Text style={[styles.tabText, activeTab === 'yearly' && styles.activeTabText]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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
      </ScrollView>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
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
  },
  retryButton: {
    backgroundColor: '#2c95f8',
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
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    marginTop:40,
    padding: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop:40,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 22,
  },
  tabContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
    padding: 5,
    width: width * 0.7,
    maxWidth: 350,
  },
  tab: {
    flex: 1,
    padding: 12,
    borderRadius: 50,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2c95f8',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  activeTabText: {
    color: '#fff',
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: width > 768 ? (width * 0.45) - 30 : width - 40,
    maxWidth: 400,
    minWidth: 280,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
    marginBottom: 10,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  planName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
  },
  popularBadge: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c95f8',
    textAlign: 'center',
    marginBottom: 5,
  },
  planInterval: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
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
    marginLeft: 10,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  subscribeButton: {
    backgroundColor: '#2c95f8',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
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
});

export default SubscriptionPlans;