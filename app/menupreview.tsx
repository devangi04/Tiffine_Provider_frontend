import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  Dimensions
} from 'react-native';
import {Text,TextStyles} from '@/components/ztext';

import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import axios from 'axios';
import { Send, ArrowLeft, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Header from '@/components/header';
import { API_URL } from './config/env';

const API_BASE_URL = `${API_URL}/api`;
const SENT_MENU_URL = `${API_URL}/api/sentmenu`;

interface MenuItem {
  categoryId: string | { _id: string; name: string };
  dishIds: string[];
  _id: string;
}

interface Menu {
  _id: string;
  day: string;
  items: MenuItem[];
  note?: string;
  providerId: string;
  name: string;
  createdAt: string;
  isActive?: boolean;
}

interface DishItem {
  _id: string;
  name: string;
  description?: string;
  categoryId?: string | { _id: string; name: string };
  isActive?: boolean;
}

interface CategoryItem {
  _id: string;
  name: string;
  isDefault?: boolean;
}

const { width, height } = Dimensions.get('window');

const MenuPreviewScreen: React.FC = () => {
  const params = useLocalSearchParams();
  const { menuId, providerId } = params;
  const router = useRouter();
  
  const [menu, setMenu] = useState<Menu | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [dishes, setDishes] = useState<DishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
    
  useEffect(() => {
    if (menuId && providerId) {
      fetchMenuData();
    }
  }, [menuId, providerId]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      
      // Fetch menu details
      const menuResponse = await axios.get(`${API_BASE_URL}/menu/${menuId}`);
      if (menuResponse.data.success) {
        setMenu(menuResponse.data.menu || menuResponse.data.data);
      }
      
      // Fetch categories
      const categoriesResponse = await axios.get(`http://192.168.1.3:5000/api/category/provider/${providerId}`);
      if (categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.data);
      }
      
      // Fetch dishes
      const dishesResponse = await axios.get(`http://192.168.1.3:5000/api/dish/provider/${providerId}`);
      if (dishesResponse.data.success) {
        const transformedDishes = transformDishesData(dishesResponse.data.data);
        setDishes(transformedDishes);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  };

  const transformDishesData = (data: any): DishItem[] => {
    const dishes: DishItem[] = [];
    
    if (data && Array.isArray(data)) {
      data.forEach((categoryGroup: any) => {
        if (categoryGroup.dishes && Array.isArray(categoryGroup.dishes)) {
          categoryGroup.dishes.forEach((dish: any) => {
            dishes.push({
              _id: dish._id,
              name: dish.name,
              description: dish.description,
              categoryId: categoryGroup.categoryId,
              isActive: dish.isActive !== false
            });
          });
        }
      });
    }
    
    return dishes;
  };

  const getCategoryName = (categoryId: string | CategoryItem): string => {
    if (typeof categoryId === 'object' && categoryId !== null && categoryId.name) {
      return categoryId.name;
    }
    
    if (typeof categoryId === 'string') {
      const category = categories.find(cat => cat._id === categoryId);
      return category ? category.name : 'Unknown Category';
    }
    
    return 'Unknown Category';
  };

  const getDishName = (dishId: string): string => {
    if (!dishId) return 'Unknown Dish';
    
    const dish = dishes.find(d => d._id === dishId);
    return dish ? dish.name : 'Unknown Dish';
  };

  const getDishNamesForCategory = (dishIds: string[]): string => {
    if (!dishIds || !Array.isArray(dishIds)) return 'No dishes';
    
    return dishIds.map(dishId => getDishName(dishId))
      .filter(name => name !== 'Unknown Dish')
      .join(', ') || 'No dishes';
  };

  const sendMenu = async () => {
    try {
      setSending(true);
      const response = await axios.post(SENT_MENU_URL, {
        providerId,
        menuId
      });
      
      if (response.data.success) {
        Alert.alert('Success', 'Menu sent successfully!');
        router.back();
      } else {
        throw new Error(response.data.error || 'Failed to send menu');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send menu. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* <Header
          title="Menu Preview"
          onBackPress={() => router.back()}
        /> */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c95f8" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </View>
    );
  }

  if (!menu) {
    return (
      <View style={styles.container}>
        {/* <Header
          title="Menu Preview"
          onBackPress={() => router.back()}
        /> */}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Menu not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* <Header
        title="Menu Preview"
        onBackPress={() => router.back()}
      /> */}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.menuName} numberOfLines={1}>{menu.name}</Text>
          <Text style={styles.menuDay}>
            {menu.day.charAt(0).toUpperCase() + menu.day.slice(1)}
          </Text>
        </View>
        
        <View style={styles.menuItems}>
          {menu.items && menu.items.map((item, index) => (
            <View key={index} style={styles.menuItem}>
              <View style={styles.categoryRow}>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {getCategoryName(item.categoryId).toUpperCase()}
                </Text>
                <View style={styles.dishesContainer}>
                  <Text style={styles.dishNames} numberOfLines={1}>
                    {getDishNamesForCategory(item.dishIds)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        
        {menu.note && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Special Notes:</Text>
            <Text style={styles.noteText} numberOfLines={2}>{menu.note}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMenu}
          disabled={sending}
        >
          <LinearGradient
            colors={['#2c95f8', '#0022ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendGradient}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text style={styles.sendText}>Send Menu</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 16,
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
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  menuName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    textAlign: 'center',
    maxWidth: '90%',
  },
  menuDay: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  menuItems: {
    marginBottom: 16,
  },
  menuItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2c95f8',
    flex: 1,
    marginRight: 8,
  },
  dishesContainer: {
    flex: 2,
  },
  dishNames: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
  },
  noteContainer: {
    backgroundColor: 'rgba(44, 149, 248, 0.05)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2c95f8',
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c95f8',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 18,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  sendButton: {
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sendGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sendText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default MenuPreviewScreen;