import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Animated,
  TextInput,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  FlatList,
  Switch
} from 'react-native';
import { Text } from '@/components/ztext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon  from 'react-native-vector-icons/MaterialIcons';
import { BackHandler, Keyboard } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from './store/hooks';

import { 
  fetchCustomers, 
  fetchMoreCustomers,
  setCurrentCustomer, 
  deleteCustomer as deleteCustomerAction,
  toggleCustomerActive as toggleCustomerStatusAction,
  Customer as ReduxCustomer,
  resetCustomers,
  addCustomerToFront
} from './store/slices/customerslice';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootStackParamList = {
  AddCustomer: undefined;
  CustomerList: undefined;
  Profile: undefined;
  Bill: undefined;
};

type CustomerListScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CustomerList'
>;

type Props = {
  navigation: CustomerListScreenNavigationProp;
  route: RouteProp<RootStackParamList, 'CustomerList'>;
};

type Customer = ReduxCustomer;

const { width } = Dimensions.get('window');

const CustomerListScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { 
    customers, 
    loading, 
    loadingMore,
    error,
    hasMore,
    totalItems,
    nextCursor,
    nextId,
    lastRefreshed
  } = useAppSelector((state) => state.customer);
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;

  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  
  const searchInputRef = useRef<TextInput>(null);
  const searchWidth = useRef(new Animated.Value(width - 32)).current;
  const listRef = useRef<FlatList>(null);
  const isFetchingMore = useRef(false);
  const router = useRouter();
  const nav = useNavigation();
  
  // Store pending toggle states for optimistic updates
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    nav.setOptions({
      headerShown: false,
    });
  }, [nav]);

  // Load initial customers only once
  useEffect(() => {
    if (providerId && isFirstLoad) {
      loadInitialCustomers();
      setIsFirstLoad(false);
    }
  }, [providerId, isFirstLoad]);

  // Filter customers based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(customer => {
      const nameMatch = customer.name?.toLowerCase().includes(query) ?? false;
      const phoneMatch = customer.phone?.includes(query) ?? false;
      const emailMatch = customer.email?.toLowerCase().includes(query) ?? false;
      const areaMatch = customer.area?.toLowerCase().includes(query) ?? false;
      const addressMatch = customer.address?.toLowerCase().includes(query) ?? false;
      const pincodeMatch = customer.pincode?.includes(query) ?? false;
      const cityMatch = customer.city?.toLowerCase().includes(query) ?? false;
      const stateMatch = customer.state?.toLowerCase().includes(query) ?? false;

      return nameMatch || phoneMatch || emailMatch || areaMatch || addressMatch || pincodeMatch||cityMatch||stateMatch;
    });
    
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Clear search when screen focuses
      setSearchQuery('');
      setIsSearchFocused(false);
      searchInputRef.current?.blur();
      
      // Scroll to top
      if (listRef.current) {
        listRef.current.scrollToOffset({ offset: 0, animated: false });
      }

      // Refresh data if it's been more than 30 seconds since last refresh
      const shouldRefresh = !lastRefreshed || (Date.now() - lastRefreshed > 30000);
      
      if (providerId && shouldRefresh) {
        refreshData();
      }

      return () => {
        // Cleanup if needed
      };
    }, [providerId, lastRefreshed])
  );

useFocusEffect(
  useCallback(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isSearchFocused || searchQuery.trim().length > 0) {
          Keyboard.dismiss();
          setSearchQuery('');        // clear input
          setIsSearchFocused(false); // exit search mode
          return true;               // ⛔ stop navigation
        }

        return false; // ✅ normal back
      }
    );

    return () => subscription.remove();
  }, [isSearchFocused, searchQuery])
);


  const loadInitialCustomers = async () => {
    if (!providerId) return;
    
    try {
      await dispatch(fetchCustomers({ providerId, isRefresh: false })).unwrap();
    } catch (error) {
      Alert.alert("Error", "Failed to load customers. Please try again.");
    }
  };

  const refreshData = async () => {
    if (!providerId) return;
    
    try {
      await dispatch(fetchCustomers({ providerId, isRefresh: true })).unwrap();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  const loadMore = useCallback(() => {
    // Prevent multiple calls
    if (isFetchingMore.current || loadingMore || !hasMore || !providerId || !nextCursor || !nextId) {
      return;
    }

    isFetchingMore.current = true;
    
    dispatch(fetchMoreCustomers({ 
      providerId,
      lastCreatedAt: nextCursor,
      lastId: nextId
    })).finally(() => {
      setTimeout(() => {
        isFetchingMore.current = false;
      }, 500);
    });
  }, [providerId, loadingMore, hasMore, nextCursor, nextId, dispatch]);

  const onRefresh = useCallback(() => {
    if (!providerId) return;
    
    setRefreshing(true);
    
    // Reset and fetch fresh data
    dispatch(resetCustomers());
    dispatch(fetchCustomers({ providerId, isRefresh: true }))
      .finally(() => {
        setRefreshing(false);
        isFetchingMore.current = false;
      });
  }, [providerId, dispatch]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
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

  const deleteCustomer = async (customerId: string | undefined) => {
    if (!customerId) {
      Alert.alert("Error", "Invalid customer ID");
      return;
    }

    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this customer?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              await dispatch(deleteCustomerAction(customerId)).unwrap();
              Alert.alert("Success", "Customer deleted successfully!");
            } catch (error) {
              Alert.alert("Error", "Failed to delete customer. Please try again.");
            }
          }
        }
      ]
    );
  };

  const toggleCustomerStatus = async (customerId: string | undefined, currentStatus: boolean) => {
    if (!customerId) {
      Alert.alert("Error", "Invalid customer ID");
      return;
    }

    // Store the new value for optimistic update
    const newStatus = !currentStatus;
    setPendingToggles(prev => ({
      ...prev,
      [customerId]: newStatus
    }));

    try {
      await dispatch(toggleCustomerStatusAction(customerId)).unwrap();
      // Success - clear the pending toggle
      setPendingToggles(prev => {
        const newState = { ...prev };
        delete newState[customerId];
        return newState;
      });
    } catch (error) {
      // Error - revert the optimistic update
      setPendingToggles(prev => {
        const newState = { ...prev };
        delete newState[customerId];
        return newState;
      });
      
      // Refresh data to get correct state from server
      if (providerId) {
        dispatch(fetchCustomers({ providerId, isRefresh: true }));
      }
      
      Alert.alert("Error", "Failed to update customer status. Please try again.");
    }
  };

  const editCustomer = (customer: Customer) => {
    dispatch(setCurrentCustomer(customer));
    router.push('/customer');
  };

  const addNewCustomer = () => {
    dispatch(setCurrentCustomer(null));
    router.push('/customer');
  };

 const generateBill = (customer: Customer) => {
  if (!customer._id) {
    Alert.alert("Error", "Invalid customer ID");
    return;
  }

  Alert.alert(
    "Generate Bill Manually?",
    "Bills are generated automatically at month end. Do you want to generate this bill manually now?",
    [
      {
        text: "Cancel",
        style: "cancel", // 👈 important, does nothing
      },
      {
        text: "Generate",
        onPress: () => {
          router.push({
            pathname: "/bill",
            params: { customerId: customer._id },
          });
        },
      },
    ],
    { cancelable: true }
  );
};


  const renderCustomerItem = ({ item }: { item: Customer }) => {
    // Use pending toggle value if available, otherwise use actual value
    const displayStatus = item._id && pendingToggles[item._id] !== undefined 
      ? pendingToggles[item._id] 
      : item.isActive;
    
    return (
      <View style={styles.customerCard}>
        <View style={styles.customerHeader}>
          <View style={styles.customerMainInfo}>
            <View style={styles.nameStatusContainer}>
              <Text weight="extraBold" style={styles.customerName}>{item.name || 'No Name'}</Text>
              <View style={[
                styles.statusBadge,
                displayStatus ? styles.statusActive : styles.statusInactive
              ]}>
                <Text weight="extraBold" style={[
                  styles.statusText,
                  displayStatus ? styles.statusTextActive : styles.statusTextInactive
                ]}>
                  {displayStatus ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            
            <View style={styles.customerContact}>
              <View style={styles.contactRow}>
                <Icon name="phone" size={14} color="#64748b" />
                <Text style={styles.contactText}>{item.phone || 'No Phone'}</Text>
              </View>
              {item.email ? (
                <View style={styles.contactRow}>
                  <Icon name="email" size={14} color="#64748b" />
                  <Text style={styles.contactText}>{item.email}</Text>
                </View>
              ) : null}
            </View>
          </View>
          
          <View>
            <Switch
              value={displayStatus}
              onValueChange={() => toggleCustomerStatus(item._id, item.isActive)}
              trackColor={{ false: '#E5E7EB', true: '#d3f4dbff' }}
              thumbColor={displayStatus ? '#15803d' : '#9CA3AF'}
              ios_backgroundColor="#E5E7EB"
            />
          </View>
        </View>
        
     <View style={styles.addressContainer}>
  <Icon style={styles.addressIcon} name="location-on" size={14} color="#64748b" />
  <View style={styles.addressDetails}>
    <Text style={styles.addressText} numberOfLines={1}>
      {item.address || 'No Address'}
    </Text>
    <View style={styles.locationDetails}>
      {item.area ? (
        <View style={styles.locationBadge}>
          <Text style={styles.locationText}>{item.area}</Text>
        </View>
      ) : null}
      {item.city ? (
        <View style={styles.locationBadge}>
          <Text style={styles.locationText}>{item.city}</Text>
        </View>
      ) : null}
      {item.pincode ? (
        <View style={[styles.locationBadge, styles.pincodeBadge]}>
          <Text style={styles.locationText}>{item.pincode}</Text>
        </View>
      ) : null}
      {item.state ? (
        <View style={[styles.locationBadge, styles.stateBadge]}>
          <Text style={styles.locationText}>{item.state}</Text>
        </View>
      ) : null}
    </View>
  </View>
</View>
        
        <View style={styles.cardFooter}>
          <View style={[
            styles.preferenceBadge,
            item.preference === 'veg' && styles.preferenceVeg,
            item.preference === 'non-veg' && styles.preferenceNonVeg,
            item.preference === 'jain' && styles.preferenceJain,
          ]}>
            <Text weight='extraBold' style={[
              styles.preferenceText,
              item.preference === 'veg' && styles.preferenceTextVeg,
              item.preference === 'non-veg' && styles.preferenceTextNonVeg,
              item.preference === 'jain' && styles.preferenceTextJain,
            ]}>
              {(item.preference || 'veg').charAt(0).toUpperCase() + (item.preference || 'veg').slice(1)}
            </Text>
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.billBtn]}
              onPress={() => generateBill(item)}
            >
              <Icon name="receipt" size={16} color="#fff" />
              <Text style={styles.billBtnText}>Bill</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]}
              onPress={() => editCustomer(item)}
            >
              <Icon name="edit" size={16} color="#0ea5e9" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => deleteCustomer(item._id)}
            >
              <Icon name="delete" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#15803d" />
        <Text style={styles.loadingMoreText}>Loading more customers...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="people-outline" size={80} color="#cbd5e1" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matching customers' : 'No Customers'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery ? 'Try a different search term' : 'Add your first customer to get started'}
      </Text>
      {/* {!loading && (
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Icon name="refresh" size={20} color="#15803d" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )} */}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchSection}>
        <Animated.View style={[styles.searchContainer, { width: searchWidth }]}>
          <Icon name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by name"
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#94a3b8"
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Icon name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </Animated.View>

        <View style={styles.totalCustomersContainer}>
          <Text style={styles.totalCustomersLabel}>Total</Text>
          <View style={styles.totalCustomersCount}>
            <Text style={styles.totalCustomersText}>
              {searchQuery ? filteredCustomers.length : totalItems}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Stable key extractor
  const keyExtractor = (item: Customer, index: number): string => {
    return item._id ? `customer-${item._id}` : `customer-${index}`;
  };

  // Show loading only on first load when there's no data
  if (loading && customers.length === 0 && isFirstLoad) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Sticky Header */}
      <View style={styles.stickyHeader}>
        {renderHeader()}
      </View>

      {/* Customer List with Infinite Scroll */}
      <FlatList
        ref={listRef}
        data={filteredCustomers}
        renderItem={renderCustomerItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContainer,
          filteredCustomers.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={!loading && renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#15803d']}
            tintColor={'#15803d'}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.listSpacing} />}
        ListFooterComponentStyle={{ paddingBottom: 80 }}
        extraData={[customers.length, pendingToggles]} // Force re-render when customers or pending toggles change
      />

      {/* Floating Add Button */}
      {/* <TouchableOpacity 
        style={styles.floatingButton}
        onPress={addNewCustomer}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity> */}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  stickyHeader: {
    backgroundColor: '#f8fafcff',
    paddingTop: 30,
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
   
  },
  totalCustomersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15803d',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 20,
  },
  totalCustomersLabel: {
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  totalCustomersCount: {
    backgroundColor: '#ffff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
    minWidth: 36,
    alignItems: 'center',
  },
  totalCustomersText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 50,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
  },
  clearButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  customerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerMainInfo: {
    flex: 1,
    marginRight: 12,
  },
  nameStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: 18,
    color: '#1e293b',
    marginRight: 10,
    maxWidth: '70%',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextInactive: {
    color: '#dc2626',
  },
  customerContact: {
    marginTop: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
 addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  addressIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  addressDetails: {
    flex: 1,
  },
  addressText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 6,
  },
  locationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  locationBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pincodeBadge: {
    backgroundColor: '#dbeafe',
  },
  stateBadge: {
    backgroundColor: '#f0fdf4',
  },
  locationText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  preferenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  preferenceVeg: {
    backgroundColor: '#dcfce7',
  },
  preferenceNonVeg: {
    backgroundColor: '#fee2e2',
  },
  preferenceJain: {
    backgroundColor: '#fef3c7',
  },
  preferenceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  preferenceTextVeg: {
    color: '#16a34a',
  },
  preferenceTextNonVeg: {
    color: '#dc2626',
  },
  preferenceTextJain: {
    color: '#d97706',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billBtn: {
    backgroundColor: '#15803d',
    flexDirection: 'row',
    minWidth: 60,
  },
  editBtn: {
    backgroundColor: '#e0f2fe',
    width: 36,
    height: 36,
    padding: 0,
  },
  deleteBtn: {
    backgroundColor: '#fee2e2',
    width: 36,
    height: 36,
    padding: 0,
  },
  billBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  refreshButtonText: {
    color: '#15803d',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 16,
  },
  listSpacing: {
    height: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  floatingButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#15803d',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default CustomerListScreen;