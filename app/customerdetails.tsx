import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  StatusBar, // Added StatusBar
} from 'react-native';
import { Text } from '@/components/ztext';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle,
  XCircle,
  Edit,
  ArrowRight,
  Download,
  Plus,
} from 'lucide-react-native';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { 
  setCurrentCustomer, 
  toggleCustomerActive,
  fetchCustomerById
} from './store/slices/customerslice';
import { 
  fetchCustomerBills, // This is now properly defined
  addPayment,
  generateCustomerBill,
  sendBillEmail,
  clearCurrentBills,
  fetchAllBills, // Add this import
  setCurrentBill // Add this import
} from './store/slices/billslice';

const CustomerDetailsScreen = () => {
  const params = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  
  const [activeTab, setActiveTab] = useState<'details' | 'bills'>('details');
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'other'>('cash');
  const [selectedBill, setSelectedBill] = useState<any>(null);
  const [fetchingCustomer, setFetchingCustomer] = useState(false);
  const [loadingBills, setLoadingBills] = useState(false); // Local state for bills loading
  
  // Get data from Redux store
  const dispatch = useAppDispatch();
  const provider = useAppSelector((state) => state.provider);
  const customerState = useAppSelector((state) => state.customer);
  const billState = useAppSelector((state) => state.bills);
  
  // Get customer ID from params
  const customerId = params.id || params.customerId || params._id;
  
  // Find customer from Redux store
  let customer = customerState.customers.find(c => c._id === customerId);
  
  // Get bills from Redux store - use the array directly
  const bills = billState.currentBills || [];
  const billLoading = billState.loading;
  const errorBills = billState.error;

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
    
    // If customer not found in Redux, fetch it
    if (customerId && !customer && !fetchingCustomer) {
      fetchSingleCustomer();
    }
    
    // Fetch bills when bills tab is active
    if (activeTab === 'bills' && customerId) {
      fetchCustomerBillsData();
    }
    
    // Clean up when component unmounts
    return () => {
      dispatch(clearCurrentBills());
    };
  }, [customerId, activeTab]);

  const fetchSingleCustomer = async () => {
    if (!customerId) return;
    
    try {
      setFetchingCustomer(true);
      await dispatch(fetchCustomerById(customerId as string)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to load customer details');
    } finally {
      setFetchingCustomer(false);
    }
  };

  const fetchCustomerBillsData = async () => {
    if (!customerId) return;
    
    try {
      setLoadingBills(true);
      await dispatch(fetchCustomerBills({ customerId: customerId as string })).unwrap();
    } catch (error: any) {
      // Handle empty bills gracefully
      dispatch(clearCurrentBills()); // Set empty array
    } finally {
      setLoadingBills(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    
    // Refresh customer data
    fetchSingleCustomer();
    
    if (activeTab === 'bills' && customerId) {
      fetchCustomerBillsData().finally(() => {
        setRefreshing(false);
      });
    } else {
      setRefreshing(false);
    }
  }, [customerId, activeTab]);

  // Only show bill count when bills tab is active and bills are loaded
  const getBillTabText = () => {
    if (activeTab === 'bills') {
      return `Bills (${bills.length})`;
    }
    return 'Bills';
  };

  // If still fetching customer
  if (!customer && fetchingCustomer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If customer not found even after fetching
  if (!customer && !fetchingCustomer) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Customer not found</Text>
          <Text style={styles.errorSubtext}>
            Customer ID: {customerId || 'Unknown'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchSingleCustomer}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.retryButton, { marginTop: 12, backgroundColor: '#6B7280' }]}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Now we have customer data, get the updated reference
  customer = customerState.customers.find(c => c._id === customerId);

  const handleEditCustomer = () => {
    if (customer) {
      dispatch(setCurrentCustomer(customer));
      router.push('/customer');
    }
  };

  const handleToggleStatus = () => {
    if (customer && customer._id) {
      dispatch(toggleCustomerActive(customer._id)).then(() => {
        Alert.alert(
          'Success', 
          `Customer ${!customer.isActive ? 'activated' : 'deactivated'} successfully!`
        );
      }).catch(() => {
        Alert.alert('Error', 'Failed to update customer status');
      });
    }
  };

  const handleGenerateBill = () => {
    if (!customerId) {
      Alert.alert('Error', 'Customer ID missing');
      return;
    }

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    Alert.alert(
      'Generate Bill',
      `Generate bill for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate', 
          onPress: () => {
            dispatch(generateCustomerBill({ 
              customerId: customerId as string, 
              year,
              month
            }))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Bill generated successfully');
                // Refresh bills list
                fetchCustomerBillsData();
              })
              .catch((error) => {
                Alert.alert('Error', error || 'Failed to generate bill');
              });
          }
        }
      ]
    );
  };

  const handleViewBill = (bill: any) => {
    router.push({
      pathname: '/bill',
      params: { 
        billId: bill.id || bill._id,
        customerId: customerId
      }
    });
  };

  const handleSendEmail = (bill: any) => {
    const billId = bill.id || bill._id;
    
    Alert.alert(
      'Send Email',
      'Send bill via email to customer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: () => {
            dispatch(sendBillEmail(billId))
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Email sent successfully');
              })
              .catch((error) => {
                Alert.alert('Error', error || 'Failed to send email');
              });
          }
        }
      ]
    );
  };

  const handleAddPayment = (bill: any) => {
    setSelectedBill(bill);
    setPaymentAmount(bill.remainingAmount?.toString() || '');
    setShowPaymentModal(true);
  };

  const submitPayment = () => {
    if (!selectedBill || !paymentAmount || !customerId) {
      Alert.alert('Error', 'Please enter payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    // Get the period from the selected bill
    const year = selectedBill.period?.year || new Date().getFullYear();
    const month = selectedBill.period?.month || new Date().getMonth() + 1;

    dispatch(addPayment({
      customerId: customerId as string,
      year,
      month,
      amount,
      method: paymentMethod
    }))
      .unwrap()
      .then(() => {
        Alert.alert('Success', 'Payment added successfully');
        setShowPaymentModal(false);
        setPaymentAmount('');
        setSelectedBill(null);
        
        // Refresh bills
        fetchCustomerBillsData();
      })
      .catch((error) => {
        Alert.alert('Error', error || 'Failed to add payment');
      });
  };

  // Loading state for bills
  if (activeTab === 'bills' && (loadingBills || billLoading)) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Details</Text>
          <TouchableOpacity onPress={handleEditCustomer}>
            <Edit size={20} color="#15803d" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="default" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <TouchableOpacity onPress={handleEditCustomer}>
          <Edit size={20} color="#15803d" />
        </TouchableOpacity>
      </View>

      {/* Customer Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {customer?.name?.charAt(0).toUpperCase() || 'C'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.customerName}>{customer?.name || 'Unknown Customer'}</Text>
            <View style={styles.statusContainer}>
              <TouchableOpacity onPress={handleToggleStatus}>
                <View style={[
                  styles.statusBadge,
                  customer?.isActive ? styles.statusActive : styles.statusInactive
                ]}>
                  <Text style={[
                    styles.statusText,
                    customer?.isActive ? styles.statusTextActive : styles.statusTextInactive
                  ]}>
                    {customer?.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bills' && styles.activeTab]}
          onPress={() => setActiveTab('bills')}
        >
          <Text style={[styles.tabText, activeTab === 'bills' && styles.activeTabText]}>
            {getBillTabText()}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#15803d']}
          />
        }
      >
        {activeTab === 'details' ? (
          /* Customer Details Tab */
          <View style={styles.detailsContainer}>
            {/* Contact Information */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              
              <View style={styles.infoRow}>
                <Phone size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{customer?.phone || 'N/A'}</Text>
              </View>
              
              {customer?.email && (
                <View style={styles.infoRow}>
                  <Mail size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{customer?.email}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <MapPin size={20} color="#6B7280" />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{customer?.address || 'N/A'}</Text>
              </View>
              
              {customer?.area && (
                <View style={styles.infoRow}>
                  <MapPin size={20} color="#6B7280" />
                  <Text style={styles.infoLabel}>Area:</Text>
                  <Text style={styles.infoValue}>{customer?.area}</Text>
                </View>
              )}
            </View>

            {/* Service Information */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Service Details</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tiffin Type:</Text>
                <View style={[
                  styles.tiffinBadge,
                  { 
                    backgroundColor: customer?.preference === 'veg' ? '#10B98120' : 
                                   customer?.preference === 'non-veg' ? '#EF444420' : '#3B82F620'
                  }
                ]}>
                  <Text style={[
                    styles.tiffinBadgeText,
                    { 
                      color: customer?.preference === 'veg' ? '#10B981' : 
                            customer?.preference === 'non-veg' ? '#EF4444' : '#3B82F6'
                    }
                  ]}>
                    {(customer?.preference || 'veg').toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => bills.length > 0 ? handleViewBill(bills[0]) : handleGenerateBill()}
              >
                <View style={styles.actionContent}>
                  <IndianRupee size={24} color="#15803d" />
                  <Text style={styles.actionText}>
                    {bills.length > 0 ? 'View Latest Bill' : 'Generate Bill'}
                  </Text>
                </View>
                <ArrowRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
              
              {/* <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleGenerateBill}
              >
                <View style={styles.actionContent}>
                  <Calendar size={24} color="#15803d" />
                  <Text style={styles.actionText}>Generate New Bill</Text>
                </View>
                <ArrowRight size={20} color="#9CA3AF" />
              </TouchableOpacity> */}
            </View>
          </View>
        ) : (
          /* Bill History Tab */
          <View style={styles.billsContainer}>
            {bills.length === 0 ? (
              <View style={styles.emptyBillsContainer}>
                <Calendar size={48} color="#9CA3AF" />
                <Text style={styles.emptyBillsText}>No bill history found</Text>
                <Text style={styles.emptyBillsSubtext}>
                  Bills will appear here once they are generated
                </Text>
                <TouchableOpacity 
                  style={styles.generateBillButton}
                  onPress={handleGenerateBill}
                >
                  <Text style={styles.generateBillButtonText}>
                    Generate First Bill
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {bills.map((bill, index) => (
                  <View key={bill.id || bill._id || index} style={styles.billCard}>
                    <View style={styles.billHeader}>
                      <View>
                        <Text style={styles.billMonth}>
                          {bill.period?.month ? 
                            `${new Date(2000, (bill.period.month || 1) - 1).toLocaleString('default', { month: 'long' })} ${bill.period.year || 'N/A'}` : 
                            'No Date'}
                        </Text>
                        <Text style={styles.billDate}>
                          Total: ₹{bill.billing?.totalAmount?.toFixed(2) || bill.totalAmount?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={[
                        styles.billStatusBadge,
                        bill.isFullyPaid ? styles.statusPaid : 
                        (bill.paidAmount || 0) > 0 ? styles.statusPartial : styles.statusUnpaid
                      ]}>
                        <Text style={styles.billStatusText}>
                          {bill.isFullyPaid ? 'PAID' : 
                           (bill.paidAmount || 0) > 0 ? 'PARTIAL' : 'UNPAID'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.billAmountRow}>
                      <View style={styles.billAmountItem}>
                        <Text style={styles.billAmountLabel}>Paid</Text>
                        <Text style={styles.billAmountValue}>
                          ₹{bill.paidAmount?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={styles.billAmountItem}>
                        <Text style={styles.billAmountLabel}>Due</Text>
                        <Text style={styles.billAmountValue}>
                          ₹{bill.remainingAmount?.toFixed(2) || bill.dueAmount?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.billActions}>
                      <TouchableOpacity 
                        style={[styles.billActionBtn, styles.viewBtn]}
                        onPress={() => handleViewBill(bill)}
                      >
                        <Text style={styles.viewBtnText}>View Bill</Text>
                      </TouchableOpacity>
                      
                      {!bill.isFullyPaid && (bill.remainingAmount || bill.dueAmount || 0) > 0 && (
                        <TouchableOpacity 
                          style={[styles.billActionBtn, styles.payBtn]}
                          onPress={() => handleAddPayment(bill)}
                        >
                          <Plus size={16} color="#fff" />
                          <Text style={styles.payBtnText}>Add Payment</Text>
                        </TouchableOpacity>
                      )}
                      
                      <TouchableOpacity 
                        style={[styles.billActionBtn, styles.emailBtn]}
                        onPress={() => handleSendEmail(bill)}
                      >
                        <Mail size={16} color="#15803d" />
                        <Text style={styles.emailBtnText}>Email</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Payment</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Enter amount"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.methodButtons}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'cash' && styles.methodButtonActive
                  ]}
                  onPress={() => setPaymentMethod('cash')}
                >
                  <Text style={[
                    styles.methodButtonText,
                    paymentMethod === 'cash' && styles.methodButtonTextActive
                  ]}>
                    Cash
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'upi' && styles.methodButtonActive
                  ]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <Text style={[
                    styles.methodButtonText,
                    paymentMethod === 'upi' && styles.methodButtonTextActive
                  ]}>
                    UPI
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'other' && styles.methodButtonActive
                  ]}
                  onPress={() => setPaymentMethod('other')}
                >
                  <Text style={[
                    styles.methodButtonText,
                    paymentMethod === 'other' && styles.methodButtonTextActive
                  ]}>
                    Other
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={submitPayment}
              >
                <Text style={styles.confirmButtonText}>Add Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',

    color: '#111827',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#15803d',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#10B98120',
  },
  statusInactive: {
    backgroundColor: '#EF444420',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#15803d',
    fontWeight: '600',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  detailsContainer: {
    padding: 16,
  },
  billsContainer: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    marginRight: 8,
    minWidth: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  tiffinBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tiffinBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  emptyBillsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyBillsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyBillsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateBillButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateBillButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  billDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  billStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusPaid: {
    backgroundColor: '#10B98120',
  },
  statusPartial: {
    backgroundColor: '#F59E0B20',
  },
  statusUnpaid: {
    backgroundColor: '#EF444420',
  },
  billStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  billAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billAmountItem: {
    alignItems: 'center',
    flex: 1,
  },
  billAmountLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  billAmountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  billActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewBtn: {
    backgroundColor: '#F3F4F6',
  },
  viewBtnText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '500',
  },
  payBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emailBtn: {
    backgroundColor: '#E0E7FF',
  },
  emailBtnText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#1E293B',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  methodButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  methodButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  methodButtonActive: {
    borderColor: '#15803d',
    backgroundColor: '#EEF2FF',
  },
  methodButtonText: {
    textAlign: 'center',
    color: '#64748B',
  },
  methodButtonTextActive: {
    color: '#15803d',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#15803d',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CustomerDetailsScreen;