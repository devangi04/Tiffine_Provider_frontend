// ... (keep all the imports and interfaces same)
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, TextInput, TouchableOpacity, StyleSheet, Alert,
  Animated, ActivityIndicator, Switch, Keyboard, Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Edit2, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import BottomNavBar from '@/components/navbar';
import Header from '@/components/header';
import MainLayout from '@/components/mainlayout';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from './store/hooks';
import {Text,TextStyles} from '@/components/ztext';
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
  originalName: string; // Store original name
  image: string;
  dishes: Dish[];
}

// Define the order for specific categories
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
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeNav, setActiveNav] = useState('Profile');

  const addInputRefs = useRef<{[key: string]: TextInput | null}>({});
  const editInputRefs = useRef<{[key: string]: TextInput | null}>({});

  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const navbarOpacity = new Animated.Value(1);
  const router = useRouter();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (text: string): string => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  };

  // Helper function to format category name for display
  const formatCategoryName = (name: string): string => {
    return capitalizeFirstLetter(name);
  };

  // Helper function to sort categories
  const sortCategories = (categories: DishCategory[]): DishCategory[] => {
    return [...categories].sort((a, b) => {
      const aLower = a.originalName.toLowerCase();
      const bLower = b.originalName.toLowerCase();
      
      // Get order for specific categories
      const aOrder = CATEGORY_ORDER[aLower as keyof typeof CATEGORY_ORDER] || 999;
      const bOrder = CATEGORY_ORDER[bLower as keyof typeof CATEGORY_ORDER] || 999;
      
      // If both are in the predefined order, sort by that
      if (aOrder !== 999 && bOrder !== 999) {
        return aOrder - bOrder;
      }
      
      // If only one is in predefined order, that comes first
      if (aOrder !== 999) return -1;
      if (bOrder !== 999) return 1;
      
      // Otherwise sort alphabetically
      return a.originalName.localeCompare(b.originalName);
    });
  };

  // --- Fetch categories & dishes ---
  useEffect(() => {
    if (!providerId) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // --- Fetch categories ---
        const catRes = await axios.get(`${CATEGORY_API_URL}/provider/${providerId}`);
        
        // --- Fetch dishes ---
        let dishesByCategory = {};
        
        try {
          const dishRes = await axios.get(`${DISH_API_URL}/provider/${providerId}`);
      
          if (dishRes.data.data && Array.isArray(dishRes.data.data)) {
            dishRes.data.data.forEach(categoryData => {
              // Handle the case where dishes array might be empty
              if (categoryData.categoryId && categoryData.dishes) {
                dishesByCategory[categoryData.categoryId] = categoryData.dishes;
              }
              // Also handle the case where the API returns categories with empty dishes arrays
              else if (categoryData.categoryId) {
                dishesByCategory[categoryData.categoryId] = [];
              }
            });
          }
        } catch (dishError) {
          // If dishes API fails, we'll just use empty dishes for all categories
        }

        // Merge categories with their dishes
        const categoriesData = catRes.data.data.map((cat: any) => {
          const categoryDishes = dishesByCategory[cat._id] || [];
          
          return {
            _id: cat._id,
            originalName: cat.name, // Store original name
            name: formatCategoryName(cat.name), // Display with capitalized first letter
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
        Alert.alert('Error', 'Failed to fetch categories');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [providerId]);

  useEffect(() => {
    nav.setOptions({ headerShown: false });
  }, [nav]);

  // --- Add category ---
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return Alert.alert('Error', 'Category name cannot be empty');
    try {
      setLoading(true);
      const response = await axios.post(`${CATEGORY_API_URL}`, {
        providerId,
        name: newCategoryName.trim(),
        isActive: true,
      });
      
      const newCategory = {
        _id: response.data.data._id,
        originalName: response.data.data.name, // Store original name
        name: formatCategoryName(response.data.data.name), // Display with capitalized first letter
        image: 'https://i.postimg.cc/HkWd0xgX/salad-2.png',
        dishes: []
      };
      
      // Add new category and sort
      const updatedCategories = sortCategories([...categories, newCategory]);
      setCategories(updatedCategories);
      
      setNewCategoryName('');
      setShowAddCategoryForm(false);
      Alert.alert('Success', 'Category added!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (screenName: string) => {
    setActiveNav(screenName);
  };
  
  // --- Handle add dish button click ---
  const handleAddDishClick = (categoryId: string, e: any) => {
    e.stopPropagation();
    
    // If category is not expanded, expand it first
    if (expandedCategory !== categoryId) {
      setExpandedCategory(categoryId);
      
      // Wait a moment for the category to expand, then show the form
      setTimeout(() => {
        setShowAddForm(categoryId);
        setTimeout(() => addInputRefs.current[categoryId]?.focus(), 100);
      }, 100);
    } else {
      // If already expanded, just show the form
      setShowAddForm(categoryId);
      setTimeout(() => addInputRefs.current[categoryId]?.focus(), 100);
    }
  };

  // --- Add dish ---
  const handleAddDish = async (categoryId: string, name: string, description: string) => {
    if (!name.trim()) return Alert.alert('Error', 'Dish name cannot be empty');

    try {
      setLoading(true);

      const response = await axios.post(`${DISH_API_URL}/`, {
        providerId,
        name: name.trim(),
        description: description.trim(),
        categoryId,
      });

      // Directly get the newly created dish from the API
      const newDish = response.data.data;

      // Update state instantly
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
      setShowAddForm(null); // hide the add form
      Keyboard.dismiss();   // close the keyboard

    } catch (err) {
      Alert.alert('Error', 'Failed to add dish');
    } finally {
      setLoading(false);
    }
  };

  // --- Update dish ---
  const handleEditSave = async (categoryId: string, dishId: string, newName: string, newDescription: string, isActive: boolean) => {
    if (!newName.trim()) return Alert.alert('Error', 'Dish name cannot be empty');
    try {
      setLoading(true);
      await axios.patch(`${DISH_API_URL}/${providerId}/${categoryId}/${dishId}`, { 
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

  // --- Delete dish ---
  const handleDeleteDish = async (categoryId: string, dishId: string) => {
    Alert.alert('Delete Dish', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await axios.delete(`${DISH_API_URL}/${providerId}/${categoryId}/${dishId}`);
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

  // --- Toggle category expand ---
  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setShowAddForm(null);
  };

  // --- DishItem component ---
  const DishItem: React.FC<{ dish: Dish; categoryId: string }> = ({ dish, categoryId }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingName, setEditingName] = useState(dish.name);
    const [editingDescription, setEditingDescription] = useState(dish.description || '');
    const [editingActive, setEditingActive] = useState(dish.isActive ?? true);

    const handleSave = () => {
      handleEditSave(categoryId, dish._id, editingName, editingDescription, editingActive);
      setIsEditing(false);
    };

    return (
      <View style={styles.dishItem}>
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
                <Switch value={editingActive} onValueChange={setEditingActive} trackColor={{false:'#767577', true:'#81b0ff'}} thumbColor={editingActive ? '#2c95f8':'#f4f3f4'}/>
              </View>
              <View style={styles.editButtons}>
                <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave}>
                  <Text style={styles.buttonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={()=>setIsEditing(false)}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.dishRow}>
            <View style={styles.dishInfo}>
              <Text weight='extraBold' style={[styles.dishName, !dish.isActive && styles.inactiveDish]}>{dish.name}</Text>
              {dish.description ? (
                <Text weight='extraBold' style={[styles.dishDescription, !dish.isActive && styles.inactiveDish]}>{dish.description}</Text>
              ) : null}
            </View>
            <View style={styles.dishActions}>
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={()=>setIsEditing(true)}>
                <Edit2 size={18} color="#3B82F6"/>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={()=>handleDeleteDish(categoryId, dish._id)}>
                <Trash2 size={18} color="#EF4444"/>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // --- AddDishForm ---
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
          <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={()=>handleAddDish(categoryId, name, description)}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={()=>setShowAddForm(null)}>
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

    if (loading && categories.length === 0) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2c95f8" /></View>;
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContainer} enableOnAndroid extraScrollHeight={100} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection:'row', justifyContent:'space-between', marginTop:12 }}>
          <Text weight='extraBold' style={{ fontSize:18,fontWeight:'600',color:'#1E293B'}}>Categories</Text>
          <TouchableOpacity 
            style={{backgroundColor:'#004C99',padding:8,borderRadius:8}} 
            onPress={() => router.push('/categorymaster')}
          >
            <Text weight='extraBold' style={{color:'#fff',fontWeight:'600'}}>+ Add Category</Text>
          </TouchableOpacity>
        </View>
     
        {categories.map(category => (
          <View key={category._id} style={styles.categoryCard}>
            <TouchableOpacity style={styles.categoryHeader} onPress={()=>toggleCategoryExpand(category._id)}>
              <View style={styles.categoryInfo}>
                <Image source={{uri:category.image}} style={styles.categoryImage}/>
                <Text weight='extraBold' style={styles.categoryTitle}>{category.name}</Text>
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity 
                  style={styles.addDishButton} 
                  onPress={(e) => handleAddDishClick(category._id, e)}
                >
                  <Plus size={18} color="#fff"/>
                </TouchableOpacity>
                {expandedCategory===category._id ? <ChevronUp size={20} color="#64748B"/> : <ChevronDown size={20} color="#64748B"/>}
              </View>
            </TouchableOpacity>
            {expandedCategory===category._id && (
              <View style={styles.dishesList}>
                {showAddForm===category._id && <AddDishForm categoryId={category._id}/>}
                {category.dishes.map(dish=><DishItem key={dish._id} dish={dish} categoryId={category._id}/>)}
                {category.dishes.length===0 && showAddForm!==category._id && <Text style={{textAlign:'center',color:'#94A3B8',padding:12}}>No dishes in this category</Text>}
              </View>
            )}
          </View>
        ))}
        
        {/* Show message if no categories */}
        {categories.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No categories found. Add your first category!</Text>
          </View>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
  // ... (keep the rest of the component same)
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent:'center', alignItems:'center', backgroundColor:'#F8FAFC' },
  mainContent:{ flex:1, backgroundColor:'transparent' },
  scrollContainer:{ paddingHorizontal:24, paddingBottom:100 },
  categoryCard:{ backgroundColor:'#fff', borderRadius:20, padding:4, marginBottom:12, marginTop:12, overflow:'hidden', borderWidth:1, borderColor:'rgba(0,0,0,0.05)' },
  categoryHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16 },
  categoryInfo:{ flexDirection:'row', alignItems:'center', gap:12 },
  categoryImage:{ width:32, height:32, borderRadius:6, resizeMode:'contain' },
  categoryTitle:{ fontSize:18, fontWeight:'600', color:'#1E293B' },
  categoryActions:{ flexDirection:'row', alignItems:'center', gap:12 },
  addDishButton:{ 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: '#004C99', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  dishesList:{ borderTopWidth:1, borderTopColor:'#E5E7EB' },
  dishItem:{ borderBottomWidth:1, borderBottomColor:'#E5E7EB' },
  dishRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16 },
  dishInfo: { flex: 1, marginRight: 12 },
  dishName:{ fontSize:16, fontWeight:'500', color:'#1E293B' },
  dishDescription: { fontSize:14, color: '#64748B', marginTop: 4 },
  inactiveDish:{ color:'#94A3B8' },
  dishActions:{ flexDirection:'row', gap:8 },
  actionButton:{ 
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems:'center',
    justifyContent:'center',
    minWidth: 80, // Set minimum width for better touch area
    flexDirection: 'row',
    gap: 6,
  },
  editButton:{ 
    backgroundColor:'#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
  },
  deleteButton:{ 
    backgroundColor:'#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
  },
  saveButton:{ 
    backgroundColor:'#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButton:{ 
    backgroundColor:'#64748B',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addForm:{ padding:16, backgroundColor:'rgba(239,246,255,0.5)' },
  addInput:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, marginBottom:12 },
  descriptionInput: { minHeight: 80, textAlignVertical: 'top' },
  addFormButtons:{ 
    flexDirection:'row', 
    gap:12,
    justifyContent: 'flex-end',
  },
  editForm:{ padding:16, backgroundColor:'rgba(239,246,255,0.5)' },
  editInput:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, marginBottom:12 },
  editFormRow:{ 
    flexDirection:'row', 
    justifyContent:'space-between', 
    alignItems:'center',
    marginTop: 8,
  },
  toggleContainer:{ 
    flexDirection:'row', 
    alignItems:'center',
    flex: 1,
  },
  toggleLabel:{ 
    marginRight:8, 
    color:'#1E293B', 
    fontWeight:'500' 
  },
  editButtons:{ 
    flexDirection:'row', 
    gap:12,
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
});

export default DishMasterScreen;