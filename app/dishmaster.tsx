import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Switch, Keyboard, Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api from './api/api';
import { useAppSelector } from './store/hooks';
import { Text } from '@/components/ztext';
import { API_URL } from './config/env';

const DISH_API_URL = `${API_URL}/api/dish`;
const CATEGORY_API_URL = `${API_URL}/api/category`;

interface Dish {
  _id: string;
  name: string;
  description: string;
  isActive?: boolean;
}

interface DishCategory {
  _id: string;
  name: string;
  originalName: string;
  image: string;
  dishes: Dish[];
}

const CATEGORY_ORDER = {
  'sabji': 1,
  'roti': 2,
  'rice': 3,
  'extra': 4
};

const DishMasterScreen: React.FC = () => {
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const addInputRefs = useRef<{[key: string]: TextInput | null}>({});
  const editInputRefs = useRef<{[key: string]: TextInput | null}>({});

  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();
const scrollRef = useRef<KeyboardAwareScrollView>(null);

  // Helper functions
  const capitalizeFirstLetter = (text: string): string => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  const formatCategoryName = (name: string): string => {
    return capitalizeFirstLetter(name);
  };

  const sortCategories = (categories: DishCategory[]): DishCategory[] => {
    return [...categories].sort((a, b) => {
      const aLower = a.originalName.toLowerCase();
      const bLower = b.originalName.toLowerCase();
      
      const aOrder = CATEGORY_ORDER[aLower as keyof typeof CATEGORY_ORDER] || 999;
      const bOrder = CATEGORY_ORDER[bLower as keyof typeof CATEGORY_ORDER] || 999;
      
      if (aOrder !== 999 && bOrder !== 999) return aOrder - bOrder;
      if (aOrder !== 999) return -1;
      if (bOrder !== 999) return 1;
      
      return a.originalName.localeCompare(b.originalName);
    });
  };

  // Fetch data function with useCallback
  const fetchData = useCallback(async (showLoader: boolean = true) => {
    if (!providerId) {
      router.push('/');
      return;
    }

    try {
      if (showLoader) setLoading(true);
      setRefreshing(true);

      // Fetch categories
      const catRes = await api.get(`${CATEGORY_API_URL}/provider/${providerId}`);
      
      // Fetch dishes
      let dishesByCategory = {};
      
      try {
        const dishRes = await api.get(`${DISH_API_URL}/provider/${providerId}`);
    
        if (dishRes.data.data && Array.isArray(dishRes.data.data)) {
          dishRes.data.data.forEach(categoryData => {
            if (categoryData.categoryId && categoryData.dishes) {
              dishesByCategory[categoryData.categoryId] = categoryData.dishes;
            }
            else if (categoryData.categoryId) {
              dishesByCategory[categoryData.categoryId] = [];
            }
          });
        }
      } catch (dishError) {
      }

      // Merge categories with their dishes
      const categoriesData = catRes.data.data.map((cat: any) => {
        const categoryDishes = dishesByCategory[cat._id] || [];
        
        return {
          _id: cat._id,
          originalName: cat.name,
          name: formatCategoryName(cat.name),
          image: cat.image || 'https://i.postimg.cc/tCkn8xbR/salad-4.png',
          dishes: categoryDishes.map((dish: any) => ({
            _id: dish._id,
            name: dish.name,
            description: dish.description || '',
            isActive: dish.isActive !== false
          }))
        };
      });

      // Sort categories
      const sortedCategories = sortCategories(categoriesData);
      setCategories(sortedCategories);

    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [providerId, router]);

  // Initial fetch on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus
      fetchData(false);
      
      // Optional: Reset UI states
      setShowAddForm(null);
      setExpandedCategory(null);
      
      return () => {
        // Cleanup if needed
      };
    }, [fetchData])
  );

  // Handle add dish button click
  const handleAddDishClick = (categoryId: string, e: any) => {
    e.stopPropagation();
    
    if (expandedCategory !== categoryId) {
      setExpandedCategory(categoryId);
      
      setTimeout(() => {
        setShowAddForm(categoryId);
        setTimeout(() => addInputRefs.current[categoryId]?.focus(), 100);
      }, 100);
    } else {
      setShowAddForm(categoryId);
      setTimeout(() => addInputRefs.current[categoryId]?.focus(), 100);
    }
  };

  // Add dish
  const handleAddDish = async (categoryId: string, name: string, description: string) => {
    if (!name.trim()) return Alert.alert('Error', 'Dish name cannot be empty');

    try {
      setLoading(true);

      const response = await api.post(`${DISH_API_URL}/`, {
        providerId,
        name: name.trim(),
        description: description.trim(),
        categoryId,
      });

      const newDish = response.data.data;

      const updatedCategories = categories.map(cat =>
        cat._id === categoryId
          ? { 
              ...cat, 
              dishes: [...cat.dishes, { 
                _id: newDish._id, 
                name: newDish.name, 
                description: newDish.description || '',
                isActive: newDish.isActive ?? true 
              }] 
            }
          : cat
      );

      setCategories(updatedCategories);
      setShowAddForm(null);
      Keyboard.dismiss();

    } catch (err) {
      Alert.alert('Error', 'Failed to add dish');
    } finally {
      setLoading(false);
    }
  };

  // Update dish
  const handleEditSave = async (categoryId: string, dishId: string, newName: string, newDescription: string, isActive: boolean) => {
    if (!newName.trim()) return Alert.alert('Error', 'Dish name cannot be empty');
    try {
      setLoading(true);
      await api.patch(`${DISH_API_URL}/${providerId}/${categoryId}/${dishId}`, { 
        name: newName.trim(), 
        description: newDescription.trim(),
        isActive 
      });
      const updatedCategories = categories.map(cat => cat._id === categoryId ? {
        ...cat,
        dishes: cat.dishes.map(d => d._id === dishId ? { 
          ...d, 
          name: newName.trim(), 
          description: newDescription.trim(),
          isActive 
        } : d)
      } : cat);
      setCategories(updatedCategories);
      Keyboard.dismiss();
    } catch (err) {
      Alert.alert('Error', 'Failed to update dish');
    } finally {
      setLoading(false);
    }
  };

  // Delete dish
  const handleDeleteDish = async (categoryId: string, dishId: string) => {
    Alert.alert('Delete Dish', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await api.delete(`${DISH_API_URL}/${providerId}/${categoryId}/${dishId}`);
            const updatedCategories = categories.map(cat => cat._id === categoryId ? {
              ...cat,
              dishes: cat.dishes.filter(d => d._id !== dishId)
            } : cat);
            setCategories(updatedCategories);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete dish');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  // Toggle category expand
  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setShowAddForm(null);
  };

  // DishItem component
const DishItem: React.FC<{ dish: Dish; categoryId: string; isLast: boolean;}> = ({ dish, categoryId, isLast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(dish.name);
  const [editingDescription, setEditingDescription] = useState(dish.description || '');
  const [editingActive, setEditingActive] = useState(dish.isActive ?? true);

  const handleSave = () => {
    handleEditSave(categoryId, dish._id, editingName, editingDescription, editingActive);
    setIsEditing(false);
  };

  return (
    <View style={[styles.dishItem, isLast && styles.lastDishItem]}>
      {isEditing ? (
        <View style={styles.editForm}>
          <TextInput
            ref={(ref) => editInputRefs.current[dish._id] = ref}
            style={styles.editInput}
            value={editingName}
            onChangeText={setEditingName}
            placeholder="Enter dish name..."
            returnKeyType="next"
          />
          <TextInput
            style={[styles.editInput, styles.descriptionInput]}
            value={editingDescription}
            onChangeText={setEditingDescription}
            placeholder="Enter dish description..."
            multiline
            numberOfLines={3}
          />
          <View style={styles.editFormRow}>
            <View style={styles.toggleContainer}>
              <Text weight='extraBold' style={styles.toggleLabel}>Active:</Text>
              <Switch 
                value={editingActive} 
                onValueChange={setEditingActive} 
                trackColor={{false:'#767577', true:'#81ffaf43'}} 
                thumbColor={editingActive ? '#15803d':'#f4f3f4'}
              />
            </View>
            <View style={styles.editButtons}>
              <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setIsEditing(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.dishRow}>
          <View style={styles.dishInfo}>
            <Text weight='extraBold' style={[styles.dishName, !dish.isActive && styles.inactiveDish]}>
              {dish.name}
            </Text>
            {dish.description ? (
              <Text weight='extraBold' style={[styles.dishDescription, !dish.isActive && styles.inactiveDish]}>
                {dish.description}
              </Text>
            ) : null}
          </View>
          <View style={styles.dishActions}>
            <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => setIsEditing(true)}>
              <Edit2 size={18} color="#3B82F6"/>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteDish(categoryId, dish._id)}>
              <Trash2 size={18} color="#EF4444"/>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
  // AddDishForm component
  const AddDishForm: React.FC<{ categoryId: string }> = ({ categoryId }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    
    return (
      <View style={styles.addForm}>
        <TextInput
          ref={(ref) => addInputRefs.current[categoryId] = ref}
          style={styles.addInput}
          placeholder="Enter dish name..."
          value={name}
          onChangeText={setName}
          returnKeyType="next"
        />
        <TextInput
          style={[styles.addInput, styles.descriptionInput]}
          placeholder="Enter dish description..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
        <View style={styles.addFormButtons}>
          <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={() => handleAddDish(categoryId, name, description)}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setShowAddForm(null)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  return (
  <View style={styles.container}>
  <KeyboardAwareScrollView
   ref={scrollRef} 
    style={styles.mainContent} 
    contentContainerStyle={styles.scrollContainer} 
    enableOnAndroid 
    extraScrollHeight={180} 
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false} // Add this
  >
    {/* Remove this container view and move its styles to the content directly */}
    {/* <Text weight='extraBold' style={{ fontSize:18, fontWeight:'600', color:'#1E293B', marginTop: 8 }}>
      Categories
    </Text> */}
    
    <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 16, alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <Text weight='extraBold' style={{ fontSize:18, fontWeight:'600', color:'#1E293B' }}>
          Categories
        </Text>
      </View>
      <TouchableOpacity 
        style={{ backgroundColor:'#15803d', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }} 
        onPress={() => router.push('/categorymaster')}
      >
        <Text weight='extraBold' style={{ color:'#fff', fontWeight:'600', fontSize: 14 }}>
          + Add Category
        </Text>
      </TouchableOpacity>
    </View>
   
  {categories.map(category => (
          <View key={category._id} style={styles.categoryCard}>
            <TouchableOpacity style={styles.categoryHeader} onPress={() => toggleCategoryExpand(category._id)}>
              <View style={styles.categoryInfo}>
                <Image source={{ uri: category.image }} style={styles.categoryImage} />
                <Text weight='extraBold' style={styles.categoryTitle}>
                  {category.name}
                </Text>
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity 
                  style={styles.addDishButton} 
                  onPress={(e) => handleAddDishClick(category._id, e)}
                >
                  <Plus size={18} color="#fff" />
                </TouchableOpacity>
                {expandedCategory === category._id ? 
                  <ChevronUp size={20} color="#64748B" /> : 
                  <ChevronDown size={20} color="#64748B" />
                }
              </View>
            </TouchableOpacity>
          {expandedCategory === category._id && (
  <View style={styles.dishesList}>
    {showAddForm === category._id && <AddDishForm categoryId={category._id} />}
    {category.dishes.map((dish, index) => (
      <DishItem 
        key={dish._id} 
        dish={dish} 
        categoryId={category._id} 
        isLast={index === category.dishes.length - 1} // Pass isLast prop
      />
    ))}
    {category.dishes.length === 0 && showAddForm !== category._id && (
      <Text style={{ textAlign:'center', color:'#94A3B8', padding:12 }}>
        No dishes in this category
      </Text>
    )}
  </View>
)}
          </View>
        ))}
    {categories.length === 0 && !loading && (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No categories found. Add your first category!
        </Text>
      </View>
    )}
  </KeyboardAwareScrollView>
</View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent:'center', alignItems:'center', backgroundColor:'#F8FAFC' },
  mainContent: { flex:1, backgroundColor:'transparent'},
  scrollContainer: { paddingHorizontal:24, paddingBottom:90,paddingTop:12},
  categoryCard: { backgroundColor:'#fff', borderRadius:20, padding:4, marginBottom:8, marginTop:8, overflow:'hidden', borderWidth:1, borderColor:'rgba(0,0,0,0.05)' },
  categoryHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16 },
  categoryInfo: { flexDirection:'row', alignItems:'center', gap:12 },
  categoryImage: { width:32, height:32, borderRadius:6, resizeMode:'contain' },
  categoryTitle: { fontSize:18, fontWeight:'600', color:'#1E293B' },
  categoryActions: { flexDirection:'row', alignItems:'center', gap:12 },
  addDishButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#15803d', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  dishesList: { borderTopWidth:1, borderTopColor:'#E5E7EB' },
  dishItem: { borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  dishRow: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16 },
  dishInfo: { flex: 1, marginRight: 12 },
  dishName: { fontSize:16, fontWeight:'500', color:'#1E293B' },
  dishDescription: { fontSize:14, color: '#64748B', marginTop: 4 },
  inactiveDish: { color:'#94A3B8' },
  dishActions: { flexDirection:'row', gap:8 },
  actionButton: { 
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems:'center',
    justifyContent:'center',
    minWidth: 70,
    flexDirection: 'row',
    gap: 6,
  },
  editButton: { 
    backgroundColor:'#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
  },
  deleteButton: { 
    backgroundColor:'#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
  },
  saveButton: { 
    backgroundColor:'#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButton: { 
    backgroundColor:'#64748B',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addForm: { padding:16, backgroundColor:'rgba(239,246,255,0.5)' },
  addInput: { backgroundColor:'#fff', borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, marginBottom:12 },
  descriptionInput: { minHeight: 80, textAlignVertical: 'top' },
  addFormButtons: { 
    flexDirection:'row', 
    gap:12,
    justifyContent: 'flex-end',
  },
  editForm: { padding:16, backgroundColor:'rgba(239,246,255,0.5)' },
  editInput: { backgroundColor:'#fff', borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, marginBottom:12 },
  editFormRow: { 
    flexDirection:'row', 
    justifyContent:'space-between', 
    flexWrap: 'wrap', 
    alignItems:'center',
    gap:12,
    marginTop: 8,
  },
  toggleContainer: { 
    flexDirection:'row', 
    alignItems:'center',
    flex: 1,
    minWidth:'48%'
  },
  toggleLabel: { 
    marginRight:8, 
    color:'#1E293B', 
    fontWeight:'500', 
    fontSize:14
  },
  editButtons: { 
    flexDirection:'row', 
    gap:12,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth:'48%'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 40,
    marginTop: 20
  },
  emptyText: { 
    color: '#94A3B8', 
    fontSize: 16,
    textAlign: 'center'
  },
  lastDishItem: {
  borderBottomWidth: 0, // Remove bottom border for last item
},
});

export default DishMasterScreen;