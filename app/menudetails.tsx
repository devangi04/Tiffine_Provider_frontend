import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Dimensions
} from 'react-native';
import {Text,TextStyles} from '@/components/ztext';

import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { ChevronLeft, Users, Send, CheckCircle, XCircle } from 'lucide-react-native';
import axios from 'axios';
import Header from '@/components/header';
import { useAppSelector } from './store/hooks';
import { API_URL } from './config/env';

const API_BASE_URL = `${API_URL}/api`;
const { width } = Dimensions.get('window');

interface DishItem {
  _id: string;
  name: string;
  isActive?: boolean;
}

interface MenuItem {
  roti: DishItem[];
  sabji: DishItem[];
  rice: DishItem[];
  dal: DishItem[];
  extra: DishItem[];
}

interface Menu {
  _id: string;
  day: string;
  items: MenuItem;
  note?: string;
  isSent: boolean;
  providerId: string;
  name: string;
  date?: string;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  address: string;
  subscriptionStatus: string;
  isActive?: boolean;
}

interface CustomerResponse {
  _id: string;
  customerId: {
    _id: string;
    name: string;
    phone: string;
  };
  status: 'yes' | 'no' | 'pending';
  menuDate: string;
}

const MenuDetailsScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const provider = useAppSelector((state) => state.provider);
  
  const [menu, setMenu] = useState<Menu | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customerResponses, setCustomerResponses] = useState<CustomerResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const navigation = useNavigation();

  useEffect(() => {
    if (params.menuId && provider.id) {
      fetchMenuDetails();
      fetchAllCustomers();
    }
  }, [params.menuId, provider.id]);

  useEffect(() => {
    if (menu && menu.date) {
      fetchCustomerResponses();
    }
  }, [menu]);

  useEffect(()=>{
    navigation.setOptions({
      headerShown:false,
    });
  },[navigation]);

  const fetchMenuDetails = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/menu/${params.menuId}`);
      if (response.data.success) {
        setMenu(response.data.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load menu details');
      setLoading(false); // Add error handling
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/customers/provider/${provider.id}`);
      if (response.data.success) {
        // Filter only active customers
        const activeCustomers = response.data.data.filter(
          (customer: Customer) => customer.isActive !== false
        );
        setAllCustomers(activeCustomers);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load customer list');
      setLoading(false); // Add error handling
    }
  };

  const fetchCustomerResponses = async () => {
    try {
      if (!menu || !menu.date) return;
      
      const response = await axios.get(`${API_BASE_URL}/daily`, { // Fixed endpoint
        params: {
          providerId: provider.id,
          date: menu.date
        }
      });
      
      if (response.data.success) {
        setCustomerResponses(response.data.data);
      }
    } catch (error) {
      // Don't show alert as this might be expected if no responses yet
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMenuDetails();
    fetchAllCustomers();
    if (menu && menu.date) {
      fetchCustomerResponses();
    }
  };

  const sendMenuToCustomers = async () => {
    if (!menu) return;
    
    setSending(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/menu/send-to-customers`, {
        menuId: menu._id,
        providerId: provider.id
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'Menu sent to all customers successfully!');
        setMenu({ ...menu, isSent: true });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send menu to customers');
    } finally {
      setSending(false);
    }
  };

  const confirmSendMenu = () => {
    Alert.alert(
      'Send Menu',
      'Are you sure you want to send this menu to all your customers?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: sendMenuToCustomers }
      ]
    );
  };

  // Filter customers who responded "yes"
  const getCustomersWithYesResponse = () => {
    return allCustomers.filter(customer => {
      const response = customerResponses.find(
        resp => resp.customerId._id === customer._id && resp.status === 'yes'
      );
      return response !== undefined;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading menu details...</Text>
      </View>
    );
  }

  if (!menu) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Menu not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const customersWithYesResponse = getCustomersWithYesResponse();

  return (
    <SafeAreaView style={styles.container}>
      {/* <StatusBar barStyle="light-content" backgroundColor="#15803d" />
      
      <Header
        title="Menu Details"
        subtitle={menu.name}
        backgroundColor="#15803d"
        onBackPress={() => router.back()}
        showUserButton={false}
      /> */}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'details' && styles.activeTab]}
          onPress={() => setActiveTab('details')}
        >
          <Text style={[styles.tabText, activeTab === 'details' && styles.activeTabText]}>
            Menu Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
          onPress={() => setActiveTab('customers')}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, activeTab === 'customers' && styles.activeTabText]}>
              Customers
            </Text>
            {customersWithYesResponse.length > 0 && (
              <View style={styles.customerCountBadge}>
                <Text style={styles.customerCountText}>{customersWithYesResponse.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'details' ? (
        <ScrollView 
          style={styles.detailsContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#15803d']}
            />
          }
        >
          {/* Menu Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              {menu.isSent ? (
                <>
                  <CheckCircle size={20} color="#10B981" />
                  <Text style={styles.sentText}>Sent to Customers</Text>
                </>
              ) : (
                <>
                  <XCircle size={20} color="#EF4444" />
                  <Text style={styles.notSentText}>Not Sent Yet</Text>
                </>
              )}
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Menu Items</Text>
            
            {Object.entries(menu.items).map(([category, dishes]) => (
              (dishes as DishItem[]).length > 0 && (
                <View key={category} style={styles.categoryContainer}>
                  <Text style={styles.categoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  
                  <View style={styles.dishesContainer}>
                    {(dishes as DishItem[]).map((dish: DishItem) => (
                      <View key={dish._id} style={styles.dishItem}>
                        <View style={styles.dishDot} />
                        <Text style={styles.dishName}>{dish.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            ))}
          </View>

          {/* Special Notes */}
          {menu.note && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Special Notes</Text>
              <View style={styles.noteContainer}>
                <Text style={styles.noteText}>{menu.note}</Text>
              </View>
            </View>
          )}

          {/* Send Button */}
          {!menu.isSent && (
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={confirmSendMenu}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Send size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>Send to All Customers</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <View style={styles.customersContainer}>
          <Text style={styles.customersTitle}>
            Customers who responded "Yes" to this menu
          </Text>
          
          {customersWithYesResponse.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Users size={48} color="#94A3B8" />
              <Text style={styles.emptyText}>No customers responded "Yes" yet</Text>
            </View>
          ) : (
            <FlatList
              data={customersWithYesResponse}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={styles.customerCard}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerPhone}>{item.phone}</Text>
                    <Text style={styles.customerAddress} numberOfLines={2}>
                      {item.address}
                    </Text>
                  </View>
                  
                  <View style={[
                    styles.statusBadge,
                    item.subscriptionStatus === 'active' 
                      ? styles.activeBadge 
                      : styles.inactiveBadge
                  ]}>
                    <Text style={styles.statusText}>
                      {item.subscriptionStatus}
                    </Text>
                  </View>
                </View>
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#15803d']}
                />
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

// ... (keep the styles the same)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#15803d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#15803d',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#15803d',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerCountBadge: {
    backgroundColor: '#15803d',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  customerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sentText: {
    fontSize: 16,
    color: '#10B981',
    fontWeight: '500',
  },
  notSentText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 8,
  },
  dishesContainer: {
    paddingLeft: 8,
  },
  dishItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dishDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#15803d',
    marginRight: 8,
  },
  dishName: {
    fontSize: 15,
    color: '#475569',
  },
  noteContainer: {
    backgroundColor: 'rgba(44, 149, 248, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#15803d',
  },
  noteText: {
    fontSize: 14,
    color: '#64748B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15803d',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customersContainer: {
    flex: 1,
    padding: 16,
  },
  customersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  customerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customerInfo: {
    flex: 1,
    marginRight: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default MenuDetailsScreen;