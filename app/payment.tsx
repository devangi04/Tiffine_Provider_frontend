import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {Text} from '@/components/ztext';
import { useRouter } from 'expo-router';
import { 
  ChevronLeft, 
  Search, 
  IndianRupee, 
  CheckCircle, 
  Clock, 
  Calendar, 
  ChevronRight, 
  X,
  Mail,
  ReceiptText
} from 'lucide-react-native';
import api from './api/api';
import moment from 'moment';
import { useAppSelector } from './store/hooks';
import { API_URL } from './config/env';

const API_BASE_URL = `${API_URL}/api`;

interface Customer {
  id: string;
  _id: string;
  name: string;
  phone: string;
  tiffinRate: number;
  providerId: string;
  email?: string;
}

interface Bill {
  _id: string;
  customerId: string | Customer;
  month: string;
  tiffinCount: number;
  ratePerTiffin: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  transactions: any[];
  createdAt: string;
  emailSent?: boolean;
}

interface CustomerWithBill extends Customer {
  bill?: Bill;
  paymentStatus: 'paid' | 'unpaid' | 'no-bill';
  dueAmount: number;
  totalAmount: number;
  paidAmount: number;
  month: string;
}

type FilterType = 'all' | 'unpaid' | 'paid' | 'no-bill';

const PaymentStatusScreen = () => {
  const router = useRouter();
  
  const [customers, setCustomers] = useState<CustomerWithBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [currentMonth, setCurrentMonth] = useState(moment().format('YYYY-MM'));
  const [error, setError] = useState<string | null>(null);
  const [generatingBills, setGeneratingBills] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  
  // Load More state
  const [displayedCustomers, setDisplayedCustomers] = useState<CustomerWithBill[]>([]);
  const [loadedCount, setLoadedCount] = useState(20);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Calendar modal state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [currentCalendarYear, setCurrentCalendarYear] = useState(moment().year());

  const searchInputRef = useRef<TextInput>(null);

  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;

  useEffect(() => {
    fetchPaymentStatus();
  }, [currentMonth, providerId]);

  useEffect(() => {
    // Reset load more when filter or search changes
    setLoadedCount(20);
    setHasMore(true);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    // Update displayed customers when filtered customers change
    const filtered = getFilteredCustomers();
    setDisplayedCustomers(filtered.slice(0, loadedCount));
    setHasMore(loadedCount < filtered.length);
  }, [customers, activeFilter, searchQuery, loadedCount]);

const fetchPaymentStatus = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Calculate date range for the selected month
    const monthStart = moment(currentMonth).startOf('month').toDate();
    const monthEnd = moment(currentMonth).endOf('month').toDate();
    
    // Fetch ALL customers
    const customersResponse = await api.get(`${API_BASE_URL}/customer/provider/${providerId}`, {
      params: { 
        limit: 1000
      }
    });
    
    let allCustomers: Customer[] = [];
    
    if (customersResponse.data && customersResponse.data.data) {
      allCustomers = customersResponse.data.data;
    } else if (Array.isArray(customersResponse.data)) {
      allCustomers = customersResponse.data;
    } else {
      allCustomers = [];
    }
    
    // Filter customers who were active during the selected month
    const customersForMonth = allCustomers.filter(customer => {
      const customerCreatedAt = customer.createdAt ? new Date(customer.createdAt) : null;
      const customerDeactivatedAt = (customer as any).deactivatedAt ? new Date((customer as any).deactivatedAt) : null;
      
      // If customer has no createdAt, include them (shouldn't happen)
      if (!customerCreatedAt) return true;
      
      // Customer was created after this month
      if (customerCreatedAt > monthEnd) return false;
      
      // Customer was deactivated before this month
      if (customerDeactivatedAt && customerDeactivatedAt < monthStart) return false;
      
      // Customer is still active or was active during this month
      return true;
    });
        
    if (customersForMonth.length === 0) {
      setCustomers([]);
      setDisplayedCustomers([]);
      return;
    }

    // Rest of your existing code...
    const billsResponse = await api.get(`${API_BASE_URL}/bills/list`, {
      params: { 
        month: currentMonth,
        limit: 1000
      }
    });
    
    let bills: Bill[] = [];
    if (billsResponse.data && billsResponse.data.data) {
      bills = billsResponse.data.data;
    } else if (Array.isArray(billsResponse.data)) {
      bills = billsResponse.data;
    }
        
    // Match customers with bills (use customersForMonth instead of allCustomers)
    const customersWithBills: CustomerWithBill[] = customersForMonth.map(customer => {
      const customerBill = bills.find(bill => {
        try {
          if (typeof bill.customerId === 'string') {
            return bill.customerId === customer._id;
          } else if (bill.customerId && typeof bill.customerId === 'object') {
            const billCustomerId = bill.customerId as Customer;
            return billCustomerId._id === customer._id || billCustomerId.id === customer._id;
          }
          return false;
        } catch (error) {
          console.error('Error matching bill to customer:', error);
          return false;
        }
      });
      
      if (customerBill) {
        const paymentStatus = customerBill.paymentStatus === 'partial' ? 'unpaid' : customerBill.paymentStatus;
        
        return {
          ...customer,
          bill: customerBill,
          paymentStatus: paymentStatus || 'unpaid',
          dueAmount: customerBill.dueAmount || 0,
          totalAmount: customerBill.totalAmount || 0,
          paidAmount: customerBill.paidAmount || 0,
          month: currentMonth
        };
      } else {
        return {
          ...customer,
          paymentStatus: 'no-bill',
          dueAmount: 0,
          totalAmount: 0,
          paidAmount: 0,
          month: currentMonth
        };
      }
    });
    
    setCustomers(customersWithBills);
    setDisplayedCustomers(customersWithBills.slice(0, 20));
    setHasMore(customersWithBills.length > 20);
    
  } catch (error: any) {
    // Error handling remains the same
    console.error('Error fetching payment status:', error);
    
    let errorMessage = 'Failed to load payment status';
    
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage = 'No customers or bills found for this month.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = error.response.data?.message || errorMessage;
      }
    } else if (error.request) {
      errorMessage = 'Network error. Please check your connection.';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
  // Generate bills for all customers
 const generateAllBills = async () => {
  try {
    setGeneratingBills(true);
    
    const [year, month] = currentMonth.split('-');
    
    Alert.alert(
      'Generate Bills',
      `Generate bills for all active customers for ${moment(currentMonth).format('MMMM YYYY')}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            // Reset the generating state when user cancels
            setGeneratingBills(false);
          }
        },
        {
          text: 'Generate',
          onPress: async () => {
            try {
              const response = await api.post(
                `${API_BASE_URL}/bills/generate-all/${year}/${month}`
              );

              if (response.data.success) {
                const { billsGenerated, billsSkipped, errors } = response.data.data;
                
                let message = `Successfully generated ${billsGenerated} bills`;
                if (billsSkipped > 0) {
                  message += `, ${billsSkipped} skipped (already exist or no data)`;
                }
                if (errors.length > 0) {
                  message += `, ${errors.length} errors`;
                }
                
                Alert.alert(
                  'Success', 
                  message,
                  [{ text: 'OK', onPress: fetchPaymentStatus }]
                );
              } else {
                Alert.alert('Error', response.data.message || 'Failed to generate bills');
              }
            } catch (error: any) {
              Alert.alert(
                'Error', 
                error.response?.data?.message || 'Failed to generate bills. Please try again.'
              );
            } finally {
              setGeneratingBills(false);
            }
          }
        }
      ],
      {
        // This callback runs when the alert is dismissed (including when tapping outside)
        onDismiss: () => {
          setGeneratingBills(false);
        }
      }
    );
  } catch (error) {
    // This catches errors in the initial setup, not in the async generation
    setGeneratingBills(false);
  }
};
 
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = moment(currentMonth).add(direction === 'prev' ? -1 : 1, 'month').format('YYYY-MM');
    setCurrentMonth(newMonth);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
  };

  const handleSearchBlur = () => {
    if (searchQuery === '') {
      setIsSearchFocused(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.blur();
    setIsSearchFocused(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentStatus();
  };

  const handleRetry = () => {
    fetchPaymentStatus();
  };

  // Filter customers based on search and active filter
const getFilteredCustomers = () => {
  let filtered = customers;
  
  // Apply search filter
  if (searchQuery) {
    filtered = filtered.filter(customer =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
    );
  }
  
  // Apply status filter - only if activeFilter is not 'all'
  if (activeFilter !== 'all') {
    filtered = filtered.filter(customer => customer.paymentStatus === activeFilter);
  }
  
  return filtered;
};

  // Load more customers
  const loadMoreCustomers = () => {
    const filteredCustomers = getFilteredCustomers();
    if (loadedCount < filteredCustomers.length) {
      const newCount = loadedCount + 20;
      setLoadedCount(newCount);
      setDisplayedCustomers(filteredCustomers.slice(0, newCount));
      setHasMore(newCount < filteredCustomers.length);
    }
  };

  // Summary statistics
const getSummaryStats = () => {
  // Use the original customers array, not the filtered one
  const totalCustomers = customers.length;
  const paidCount = customers.filter(c => c.paymentStatus === 'paid').length;
  const unpaidCount = customers.filter(c => c.paymentStatus === 'unpaid').length;
  const noBillCount = customers.filter(c => c.paymentStatus === 'no-bill').length;
  
  // Calculate totals from ALL customers, not filtered ones
  const totalDue = customers.reduce((sum, customer) => sum + customer.dueAmount, 0);
  const totalPaid = customers.reduce((sum, customer) => sum + customer.paidAmount, 0);
  const totalAmount = customers.reduce((sum, customer) => sum + customer.totalAmount, 0);

  return {
    totalCustomers,
    paidCount,
    unpaidCount,
    noBillCount,
    totalDue,
    totalPaid,
    totalAmount
  };
};

  const stats = getSummaryStats();

  // Handle summary card press to filter
  const handleSummaryCardPress = (filter: FilterType) => {
    setActiveFilter(filter);
    setLoadedCount(20);
  };

  // Calendar functions for month-year picker
  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentCalendarYear(prev => 
      direction === 'prev' ? prev - 1 : prev + 1
    );
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthSelect = (monthIndex: number) => {
    const selectedMonth = moment().year(currentCalendarYear).month(monthIndex).format('YYYY-MM');
    setCurrentMonth(selectedMonth);
    setCalendarVisible(false);
  };

  const renderCalendarModal = () => {
    const currentMonthIndex = moment(currentMonth).month();
    const currentYear = moment(currentMonth).year();
    
    return (
      <Modal
        visible={calendarVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCalendarVisible(false)}
        >
          <View style={styles.calendarContainer}>
            <View style={styles.yearHeader}>
              <TouchableOpacity onPress={() => navigateYear('prev')}>
                <ChevronLeft size={24} color="#15803d" />
              </TouchableOpacity>
              
              <Text weight='bold' style={styles.yearTitle}>
                {currentCalendarYear}
              </Text>
              
              <TouchableOpacity onPress={() => navigateYear('next')}>
                <ChevronRight size={24} color="#15803d" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.monthsGrid}>
              {months.map((month, index) => {
                const isSelected = currentMonthIndex === index && currentYear === currentCalendarYear;
                const isCurrentMonth = moment().month() === index && moment().year() === currentCalendarYear;
                
                return (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthButton,
                      isCurrentMonth && styles.monthButtonCurrent,
                      isSelected && styles.monthButtonSelected
                    ]}
                    onPress={() => handleMonthSelect(index)}
                  >
                    <Text weight='bold' style={[
                      styles.monthButtonText,
                      isCurrentMonth && styles.monthButtonTextCurrent,
                      isSelected && styles.monthButtonTextSelected
                    ]}>
                      {month.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const todayMonth = moment().format('YYYY-MM');
                  setCurrentMonth(todayMonth);
                  setCurrentCalendarYear(moment().year());
                  setCalendarVisible(false);
                }}
              >
                <Text weight='bold' style={styles.todayButtonText}>This Month</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'unpaid': return '#EF4444';
      case 'no-bill': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle size={20} color="#10B981" />;
      case 'unpaid': return <Clock size={20} color="#EF4444" />;
      case 'no-bill': return <Calendar size={20} color="#6B7280" />;
      default: return <Clock size={20} color="#6B7280" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'unpaid': return 'Pending';
      case 'no-bill': return 'No Bill';
      default: return status;
    }
  };

  const handleCustomerPress = (customer: CustomerWithBill) => {
    if (customer.paymentStatus === 'no-bill') {
      Alert.alert('No Bill', `No bill generated for ${customer.name} for ${moment(currentMonth).format('MMMM YYYY')}`);
      return;
    }
    router.push({
      pathname: '/bill',
      params: { 
        customerId: customer._id,
        month: currentMonth.split('-')[1],
        year: currentMonth.split('-')[0]
      }
    });
  };

  const renderCustomerItem = (item: CustomerWithBill) => (
    <TouchableOpacity 
      key={item._id}
      style={styles.customerCard}
      onPress={() => handleCustomerPress(item)}
    >
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text weight='bold' style={styles.customerName}>{item.name}</Text>
          <Text weight='bold' style={styles.customerPhone}>{item.phone}</Text>
          {item.email && <Text style={styles.customerEmail}>{item.email}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.paymentStatus)}15` }]}>
          {getStatusIcon(item.paymentStatus)}
          <Text weight='bold' style={[styles.statusText, { color: getStatusColor(item.paymentStatus) }]}>
            {getStatusText(item.paymentStatus)}
          </Text>
        </View>
      </View>

      {item.paymentStatus !== 'no-bill' && (
        <View style={styles.paymentDetails}>
          <View style={styles.amountRow}>
            <Text weight='bold' style={styles.amountLabel}>Total Amount:</Text>
            <Text weight='bold' style={styles.amountValue}>₹{item.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text weight='bold' style={styles.amountLabel}>Paid Amount:</Text>
            <Text weight='bold' style={[styles.amountValue, { color: '#10B981' }]}>
              ₹{item.paidAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text weight='bold' style={styles.amountLabel}>Due Amount:</Text>
            <Text weight='bold' style={[styles.amountValue, { color: '#EF4444' }]}>
              ₹{item.dueAmount.toFixed(2)}
            </Text>
          </View>
          {item.bill?.emailSent && (
            <View style={styles.emailSentBadge}>
              <Mail size={14} color="#10B981" />
              <Text weight='bold' style={styles.emailSentText}>Email Sent</Text>
            </View>
          )}
        </View>
      )}

      {item.paymentStatus === 'no-bill' && (
        <View style={styles.noBillContainer}>
          <Text weight='bold' style={styles.noBillText}>No bill generated for {moment(currentMonth).format('MMMM YYYY')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLoadMoreButton = () => {
    if (!hasMore) return null;
    
    const filteredCustomers = getFilteredCustomers();
    const remainingCount = filteredCustomers.length - displayedCustomers.length;
    
    return (
      <TouchableOpacity 
        style={styles.loadMoreButton}
        onPress={loadMoreCustomers}
      >
        <Text weight='bold' style={styles.loadMoreButtonText}>
          Load More ({remainingCount} more)
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text weight='bold' style={styles.loadingText}>Loading payment status...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text weight='bold' style={styles.errorTitle}>Something went wrong</Text>
        <Text weight='bold' style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text weight='bold' style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text weight='bold' style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Sticky Header Section */}
      <View style={styles.stickyHeader}>
        {/* Date Navigation */}
        <View style={styles.dateNav}>
          <View style={styles.dateNavContainer}>
            <TouchableOpacity 
              style={styles.navArrow} 
              onPress={() => handleMonthChange('prev')}
            >
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.currentDate}
              onPress={() => setCalendarVisible(true)}
            >
              <Calendar size={18} color="#333" />
              <Text weight='bold' style={styles.dateText}>
                {moment(currentMonth).format('MMM YYYY')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.navArrow} 
              onPress={() => handleMonthChange('next')}
            >
              <ChevronLeft size={20} color="#fff" style={styles.rightArrow} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.generateButton, generatingBills && styles.buttonDisabled]}
            onPress={generateAllBills}
            disabled={generatingBills}
          >
            {generatingBills ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ReceiptText size={18} color="#ffffff" />
            )}
           
            <Text weight='bold' style={styles.actionButtonText}>
              {generatingBills ? 'Generating...' : 'Generate Bills'}
            </Text>
          </TouchableOpacity>

       
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Scrollable Content Section */}
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={true}
      >
        {/* Summary Stats - Clickable Cards */}
        <View style={styles.summarySection}>
          <View style={styles.statsGrid}>
            <TouchableOpacity 
              style={[
                styles.statCard, 
                activeFilter === 'all' && styles.statCardActive
              ]}
              onPress={() => handleSummaryCardPress('all')}
            >
              <Text weight='bold' style={styles.statNumber}>{stats.totalCustomers}</Text>
              <Text weight='bold' style={styles.statLabel}>Total</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statCard, 
                { backgroundColor: '#10B98115' },
                activeFilter === 'paid' && styles.statCardActive
              ]}
              onPress={() => handleSummaryCardPress('paid')}
            >
              <Text weight='bold' style={[styles.statNumber, { color: '#10B981' }]}>{stats.paidCount}</Text>
              <Text weight='bold' style={styles.statLabel}>Paid</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statCard, 
                { backgroundColor: '#EF444415' },
                activeFilter === 'unpaid' && styles.statCardActive
              ]}
              onPress={() => handleSummaryCardPress('unpaid')}
            >
              <Text weight='bold' style={[styles.statNumber, { color: '#EF4444' }]}>{stats.unpaidCount}</Text>
              <Text weight='bold' style={styles.statLabel}>Pending</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.statCard, 
                { backgroundColor: '#6B728015' },
                activeFilter === 'no-bill' && styles.statCardActive
              ]}
              onPress={() => handleSummaryCardPress('no-bill')}
            >
              <Text weight='bold' style={[styles.statNumber, { color: '#6B7280' }]}>{stats.noBillCount}</Text>
              <Text weight='bold' style={styles.statLabel}>No Bill</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.amountSummary}>
            <View style={styles.amountItem}>
              <Text weight='bold' style={styles.amountLabel}>Total Amount:</Text>
              <Text weight='bold' style={styles.amountValue}>₹{stats.totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text weight='bold' style={styles.amountLabel}>Total Collected:</Text>
              <Text weight='bold' style={[styles.amountValue, { color: '#10B981' }]}>
                ₹{stats.totalPaid.toFixed(2)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text weight='bold' style={styles.amountLabel}>Total Pending:</Text>
              <Text weight='bold' style={[styles.amountValue, { color: '#EF4444' }]}>
                ₹{stats.totalDue.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Customers List */}
        <View style={styles.listSection}>
          <Text weight='bold' style={styles.sectionTitle}>
            Customers ({getFilteredCustomers().length})
          </Text>
          
          {displayedCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <IndianRupee size={48} color="#94A3B8" />
              <Text weight='bold' style={styles.emptyStateTitle}>
                {searchQuery ? 'No customers found' : 'No customers match the selected filter'}
              </Text>
              <Text weight='bold' style={styles.emptyStateText}>
                {searchQuery 
                  ? 'Try changing your search query' 
                  : activeFilter === 'no-bill' 
                    ? 'All customers have bills generated' 
                    : `No ${activeFilter === 'all' ? '' : activeFilter + ' '}customers found`
                }
              </Text>
              {activeFilter === 'no-bill' && customers.length > 0 && (
                <TouchableOpacity 
                  style={styles.generateEmptyStateButton}
                  onPress={generateAllBills}
                >
                  <Text weight='bold' style={styles.generateEmptyStateButtonText}>Generate Bills for All Customers</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {displayedCustomers.map((item) => renderCustomerItem(item))}
              
              {/* Load More Button */}
              {renderLoadMoreButton()}
            </>
          )}
        </View>
      </ScrollView>

      {/* Calendar Modal */}
      {renderCalendarModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // paddingTop:130,
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  stickyHeader: {
    backgroundColor: '#F8FAFC',
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 1000,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 60,
  },
  dateNav: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  dateNavContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  navArrow: {
    width: 40,
    height: 40,
    backgroundColor: '#15803d',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightArrow: {
    transform: [{ rotate: '180deg' }],
  },
  currentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    justifyContent: 'center',
  },
  generateButton: {
    backgroundColor: '#15803d',
  },
  emailButton: {
    backgroundColor: '#8B5CF6',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 16,
    height: 45,
    marginHorizontal: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    marginTop: 1,
    marginBottom: 2,
    color: '#1e293b',
  },
  summarySection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 4,
  },
  statCardActive: {
    borderWidth: 2,
    borderColor: '#15803d',
    transform: [{ scale: 1.05 }],
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  statLabel: {
    fontSize: 12,
    color: '#333',
    marginTop: 4,
  },
  amountSummary: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 16,
  },
  amountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: '#333',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  listSection: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 15,
  },
  customerCard: {
    backgroundColor: '#ffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0c0c0dff',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  paymentDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  emailSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#10B98115',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  emailSentText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
    marginLeft: 4,
  },
  noBillContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noBillText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateEmptyStateButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  generateEmptyStateButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  loadMoreButton: {
    backgroundColor: '#15803d',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  loadMoreButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#94A3B8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  yearTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthButton: {
    width: '30%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 12,
  },
  monthButtonCurrent: {
    backgroundColor: '#e6f2ff',
    borderWidth: 1,
    borderColor: '#15803d',
  },
  monthButtonSelected: {
    backgroundColor: '#15803d',
  },
  monthButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  monthButtonTextCurrent: {
    color: '#15803d',
    fontWeight: 'bold',
  },
  monthButtonTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  quickActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  todayButton: {
    backgroundColor: '#15803d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  todayButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default PaymentStatusScreen;