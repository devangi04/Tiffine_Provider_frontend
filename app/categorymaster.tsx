import React, { useState, useEffect, useRef } from 'react';
import { 
  View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Keyboard,Animated ,ScrollView
} from 'react-native';
import api from './api/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Save, X, Edit2, Trash2,Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from './store/hooks';
import BottomNavBar from '@/components/navbar';
import Header from '@/components/header';
import { useNavigation } from 'expo-router';
import {Text,TextStyles} from '@/components/ztext';
import { API_URL } from './config/env';

const CATEGORY_API_URL = `${API_URL}/api/category`;

interface Category {
  _id: string;
  name: string;
  image: string;
  isActive?: boolean;
}

const CategoryMasterScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeNav, setActiveNav] = useState('Profile');
  
  const provider = useAppSelector(state => state.provider);
  const providerId = provider.id;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(()=>{
    navigation.setOptions({
        headerShown:false,
    });
  },[navigation]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (!providerId) return;
      try {
        setLoading(true);
        const res = await api.get(`${CATEGORY_API_URL}/provider/${providerId}`);
        setCategories(res.data.data || []);
      } catch (err) {
        Alert.alert('Error', 'Failed to fetch categories. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [providerId]);

  // Add category
 // Add category
const handleAddCategory = async () => {
  if (!newCategoryName.trim()) {
    return Alert.alert('Error', 'Category name cannot be empty');
  }

  // ✅ Prevent API call if limit is reached
  if (categories.length >= 10) {
    return Alert.alert('Limit Reached', 'You can only add Total 10 categories.');
  }

  try {
    setLoading(true);
    const res = await api.post(CATEGORY_API_URL, { 
      providerId, 
      name: newCategoryName.trim(), 
      isActive: true 
    });

    setCategories([...categories, res.data.data]);
    setNewCategoryName('');
    Alert.alert('Success', 'Category added successfully!');
  } catch (err: any) {
    Alert.alert('Error', 'Failed to add category. Please try again.');
  } finally {
    setLoading(false);
  }
};


  // Edit category
  const handleEditCategory = async (categoryId: string) => {
    if (!editingName.trim()) return Alert.alert('Error', 'Category name cannot be empty');
    try {
      setLoading(true);
      await api.patch(`${CATEGORY_API_URL}/${categoryId}`, { name: editingName.trim() });
      setCategories(categories.map(cat => cat._id === categoryId ? { ...cat, name: editingName.trim() } : cat));
      setEditingCategoryId(null);
      setEditingName('');
      Alert.alert('Success', 'Category updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = (categoryId: string) => {
    Alert.alert('Delete Category', 'Are you sure you want to delete this category?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await api.delete(`${CATEGORY_API_URL}/${categoryId}`);
            setCategories(categories.filter(cat => cat._id !== categoryId));
            Alert.alert('Success', 'Category deleted successfully!');
          } catch (err) {
            Alert.alert('Error', 'Failed to delete category. Please try again.');
          } finally {
            setLoading(false);
          }
        }
      }
    ]);
  };

  if (loading && categories.length === 0) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#15803d" /></View>;
  }

  return (
   <View style={styles.container}>
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
      enableOnAndroid={true}
      extraScrollHeight={120}
      keyboardShouldPersistTaps="handled"
    >
      {/* Add Category Section */}
      <Text  weight='bold'style={styles.sectionTitle}>Add New Category</Text>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Category name..."
          value={newCategoryName}
          onChangeText={setNewCategoryName}
          returnKeyType="done"
          onSubmitEditing={handleAddCategory}
        />
        <TouchableOpacity style={styles.saveButton} onPress={handleAddCategory}><Check size={20} color="#fff"/></TouchableOpacity>
      </View>

      {/* Categories List */}
      <Text weight='bold' style={[styles.sectionTitle, { marginTop: 24 }]}>Categories List</Text>
      {categories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text weight='bold' style={styles.emptyStateText}>No categories found</Text>
        </View>
      ) : (
        categories.map(cat => (
          <View key={cat._id} style={styles.categoryCard}>
            {editingCategoryId === cat._id ? (
              <View style={styles.editRow}>
                <TextInput
                  style={styles.input}
                  value={editingName}
                  onChangeText={setEditingName}
                  returnKeyType="done"
                  onSubmitEditing={() => handleEditCategory(cat._id)}
                />
                <TouchableOpacity style={styles.saveButton} onPress={() => handleEditCategory(cat._id)}><Save size={18} color="#fff"/></TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditingCategoryId(null)}><X size={18} color="#fff"/></TouchableOpacity>
              </View>
            ) : (
              <View style={styles.row}>
                <Image source={{ uri: cat.image || 'https://i.postimg.cc/tCkn8xbR/salad-4.png' }} style={styles.categoryImage}/>
                <Text weight='bold' style={styles.categoryName}>{cat.name}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => { setEditingCategoryId(cat._id); setEditingName(cat.name); }}><Edit2 size={18} color="#3B82F6"/></TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCategory(cat._id)}><Trash2 size={18} color="#EF4444"/></TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </KeyboardAwareScrollView>
  </View>
);
};

const styles = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#f8fafc' },
  loading:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#F8FAFC' },
  sectionTitle:{ fontSize:18, fontWeight:'600', marginBottom:10, color:'#1E293B',  marginTop:14},
  addRow:{ flexDirection:'row', gap:8, alignItems:'center' },
  input:{ flex:1, borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, padding:12, backgroundColor:'#fff' },
  saveButton:{ backgroundColor:'#15803d', padding:12, borderRadius:12 },
  cancelButton:{ backgroundColor:'#64748B', padding:12, borderRadius:12 },
  categoryCard:{ backgroundColor:'#fff', borderRadius:12, padding:12, marginBottom:12 },
  row:{ flexDirection:'row', alignItems:'center', gap:12 },
  editRow:{ flexDirection:'row', alignItems:'center', gap:8 },
  categoryImage:{ width:40, height:40, borderRadius:8, resizeMode:'cover' },
  categoryName:{ fontSize:18, fontWeight:'500', flex:1, color:'#1E293B' },
  actions:{ flexDirection:'row', gap:8 },
  editBtn:{ backgroundColor:'#EFF6FF', padding:8, borderRadius:8 },
  deleteBtn:{ backgroundColor:'#FEF2F2', padding:8, borderRadius:8 },
  emptyState: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 24, 
    alignItems: 'center',
    marginBottom: 12 
  },
  emptyStateText: { 
    fontSize: 18, 
    color: '#64748B',
    textAlign: 'center'
  },
});

export default CategoryMasterScreen;