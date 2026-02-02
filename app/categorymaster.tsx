import React, { useState, useEffect } from 'react';
import { 
  View, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image 
} from 'react-native';
import api from './api/api';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Save, X, Edit2, Trash2, Check, Lock } from 'lucide-react-native';
import { useAppSelector } from './store/hooks';
import { useNavigation } from 'expo-router';
import { Text } from '@/components/ztext';
import { API_URL } from './config/env';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORY_API_URL = `${API_URL}/api/category`;

interface Category {
  _id: string;
  name: string;
  image: string;
  isActive?: boolean;
  isDefault?: boolean;
}

const CategoryMasterScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const provider = useAppSelector(state => state.provider);
  const providerId = provider.id;
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      return Alert.alert('Error', 'Category name cannot be empty');
    }

    // Check if category name already exists
    const existingCategory = categories.find(cat => 
      cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );
    if (existingCategory) {
      return Alert.alert('Error', 'Category with this name already exists');
    }

    // Prevent API call if limit is reached
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
      Alert.alert('Error', err.response?.data?.error || 'Failed to add category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Edit category
  const handleEditCategory = async (categoryId: string) => {
    if (!editingName.trim()) return Alert.alert('Error', 'Category name cannot be empty');
    
    const category = categories.find(cat => cat._id === categoryId);
    
    // Check if it's a default category
    if (category?.isDefault) {
      return Alert.alert('Cannot Modify', 'Default categories cannot be modified. These are essential categories for your menu.');
    }

    // Check if category name already exists (excluding current category)
    const existingCategory = categories.find(cat => 
      cat._id !== categoryId && 
      cat.name.toLowerCase() === editingName.trim().toLowerCase()
    );
    if (existingCategory) {
      return Alert.alert('Error', 'Category with this name already exists');
    }

    try {
      setLoading(true);
      await api.patch(`${CATEGORY_API_URL}/${categoryId}`, { 
        name: editingName.trim() 
      });
      
      setCategories(categories.map(cat => 
        cat._id === categoryId ? { ...cat, name: editingName.trim() } : cat
      ));
      setEditingCategoryId(null);
      setEditingName('');
      Alert.alert('Success', 'Category updated successfully!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete category
  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find(cat => cat._id === categoryId);
    
    // Check if it's a default category
    if (category?.isDefault) {
      return Alert.alert('Cannot Delete', 'Default categories cannot be deleted. These are essential categories for your menu.');
    }

    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
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
            } catch (err: any) {
              // Check if error is about dishes
              const errorMessage = err.response?.data?.error || 'Failed to delete category. Please try again.';
              
              if (errorMessage.includes('contains') && errorMessage.includes('dish')) {
                Alert.alert(
                  'Cannot Delete Category',
                  errorMessage,
                  [
                    { text: 'OK', style: 'default' }
                  ]
                );
              } else {
                Alert.alert('Error', errorMessage);
              }
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && categories.length === 0) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#15803d" /></View>;
  }

  return (
    <SafeAreaView  edges={['left', 'right', 'bottom']} style={styles.container}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
        enableOnAndroid={true}
        extraScrollHeight={120}
        keyboardShouldPersistTaps="handled"
      >
        {/* Add Category Section */}
        <Text weight='bold' style={styles.sectionTitle}>Add New Category</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Category name..."
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            returnKeyType="done"
            onSubmitEditing={handleAddCategory}
            maxLength={50}
          />
          <TouchableOpacity 
            style={[styles.saveButton, categories.length >= 10 && styles.disabledButton]} 
            onPress={handleAddCategory}
            disabled={categories.length >= 10}
          >
            <Check size={20} color="#fff"/>
          </TouchableOpacity>
        </View>
        {categories.length >= 10 && (
          <Text style={styles.limitWarning}>Maximum limit of 10 categories reached</Text>
        )}

        {/* Categories List */}
        <Text weight='bold' style={[styles.sectionTitle, { marginTop: 24 }]}>
          Categories List {categories.length > 0 && `(${categories.length}/10)`}
        </Text>
        
        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text weight='bold' style={styles.emptyStateText}>No categories found</Text>
          </View>
        ) : (
          categories.map(cat => (
            <View key={cat._id} style={[
              styles.categoryCard,
              cat.isDefault && styles.defaultCategoryCard
            ]}>
              {editingCategoryId === cat._id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.input, cat.isDefault && styles.disabledInput]}
                    value={editingName}
                    onChangeText={setEditingName}
                    returnKeyType="done"
                    onSubmitEditing={() => handleEditCategory(cat._id)}
                    editable={!cat.isDefault}
                    maxLength={50}
                  />
                  {!cat.isDefault ? (
                    <>
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={() => handleEditCategory(cat._id)}
                      >
                        <Save size={18} color="#fff"/>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => setEditingCategoryId(null)}
                      >
                        <X size={18} color="#fff"/>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={() => setEditingCategoryId(null)}
                    >
                      <X size={18} color="#fff"/>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.row}>
                  <Image 
                    source={{ uri: cat.image || 'https://i.postimg.cc/tCkn8xbR/salad-4.png' }} 
                    style={styles.categoryImage}
                  />
                  <View style={styles.categoryInfo}>
                    <View style={styles.nameRow}>
                      <Text weight='bold' style={styles.categoryName}>{cat.name}</Text>
                      {cat.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Lock size={12} color="#1E40AF" />
                          <Text style={styles.defaultBadgeText}>Default</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity 
                      style={[styles.editBtn, cat.isDefault && styles.disabledAction]} 
                      onPress={() => { 
                        if (!cat.isDefault) {
                          setEditingCategoryId(cat._id); 
                          setEditingName(cat.name); 
                        }
                      }}
                      disabled={cat.isDefault}
                    >
                      <Edit2 size={18} color={cat.isDefault ? "#9CA3AF" : "#3B82F6"}/>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.deleteBtn, cat.isDefault && styles.disabledAction]} 
                      onPress={() => handleDeleteCategory(cat._id)}
                      disabled={cat.isDefault}
                    >
                      <Trash2 size={18} color={cat.isDefault ? "#9CA3AF" : "#EF4444"}/>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, color: '#1E293B', marginTop: 14 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  disabledInput: { backgroundColor: '#F3F4F6', color: '#6B7280' },
  saveButton: { backgroundColor: '#15803d', padding: 12, borderRadius: 12 },
  cancelButton: { backgroundColor: '#64748B', padding: 12, borderRadius: 12 },
  disabledButton: { backgroundColor: '#9CA3AF' },
  categoryCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  defaultCategoryCard: { backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#E0F2FE' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryImage: { width: 40, height: 40, borderRadius: 8, resizeMode: 'cover' },
  categoryInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  categoryName: { fontSize: 18, fontWeight: '500', color: '#1E293B' },
  actions: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#EFF6FF', padding: 8, borderRadius: 8 },
  deleteBtn: { backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  disabledAction: { backgroundColor: '#F3F4F6' },
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
  defaultBadge: {
    backgroundColor: '#DBEAFE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: '#1E40AF',
    fontWeight: '600',
  },
  limitWarning: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default CategoryMasterScreen;