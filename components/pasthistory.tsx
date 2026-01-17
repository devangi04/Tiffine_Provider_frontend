import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { History, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react-native';
import {Text,TextStyles} from '@/components/ztext';

interface SentMenu {
  _id: string;
  providerId: string;
  menuId: string;
  menuName: string;
  day: string;
  mealType: 'lunch' | 'dinner';
  items: {
    categoryId: string;
    categoryName: string;
    dishes: {
      dishId: string;
      dishName: string;
    }[];
  }[];
  note?: string;
  pricing?: {
    price: number;
    isSpecialPrice: boolean;
    originalPrice: number;
  };
  isSpecialPricing?: boolean;
  specialPricingNote?: string;
  sentAt: string;
}

interface PastHistoryProps {
  history: SentMenu[];
  loading: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  day: string;
  getDishName: (dishId: string) => string;
  formatDate: (dateString: string) => string;
}

const MEAL_TYPE_CONFIG = {
  lunch: { icon: Sun, color: '#F59E0B', name: 'Lunch' },
  dinner: { icon: Moon, color: '#7C3AED', name: 'Dinner' }
};

const PastHistory: React.FC<PastHistoryProps> = ({
  history,
  loading,
  isExpanded,
  onToggle,
  day,
  getDishName,
  formatDate
}) => {
  const getMealTypeIcon = (mealType: 'lunch' | 'dinner') => {
    return MEAL_TYPE_CONFIG[mealType] || MEAL_TYPE_CONFIG.lunch;
  };

  const renderHistoryItem = ({ item, index }: { item: SentMenu; index: number }) => {
    const mealConfig = getMealTypeIcon(item.mealType);
    const IconComponent = mealConfig.icon;

    return (
      <View key={item._id || index} style={styles.historyItem}>
        {/* Compact Header */}
        <View style={styles.compactHeader}>
          <View style={styles.leftSection}>
            <View style={[styles.mealIcon, { backgroundColor: `${mealConfig.color}10` }]}>
              <IconComponent size={14} color={mealConfig.color} />
            </View>
            <View style={styles.titleSection}>
              <Text weight='bold' style={styles.menuName} numberOfLines={1}>{item.menuName}</Text>
              <Text weight='bold' style={styles.dateText}>{formatDate(item.sentAt)}</Text>
            </View>
          </View>
          {item.pricing?.price > 0 && (
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>₹{item.pricing.price}</Text>
            </View>
          )}
        </View>
        
        {/* Compact Menu Items */}
        <View style={styles.itemsSection}>
          {item.items && item.items.map((menuItem, itemIndex) => (
            <View key={itemIndex} style={styles.menuRow}>
              <Text weight='bold' style={styles.categoryLabel}>{menuItem.categoryName}</Text>
              <Text weight='bold' style={styles.dishList} numberOfLines={1}>
                {menuItem.dishes && menuItem.dishes.length > 0 
                  ? menuItem.dishes.map(d => d.dishName || getDishName(d.dishId)).join(' • ')
                  : 'No dishes'
                }
              </Text>
            </View>
          ))}
        </View>
        
        {/* Notes Section */}
        {(item.note || item.specialPricingNote) && (
          <View style={styles.notesSection}>
            {item.note && (
              <Text  weight='bold'style={styles.noteText} numberOfLines={1}>
                📝 {item.note}
              </Text>
            )}
            {item.specialPricingNote && (
              <Text  weight='bold'style={styles.specialNote} numberOfLines={1}>
                💰 {item.specialPricingNote}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <History size={32} color="#CBD5E1" />
      <Text weight='bold' style={styles.emptyText}>No history yet</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="small" color="#15803d" />
      <Text  weight='bold' style={styles.loadingText}>Loading...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
       <TouchableOpacity 
             style={styles.toggleButton}
             onPress={onToggle}
           >
             <View style={styles.toggleContent}>
               <History size={16} color="#64748B" />
               <Text weight='bold' style={styles.toggleText}>
                 {isExpanded ? 'Hide History' : 'Show Sent History'}
               </Text>
               {isExpanded ? (
                 <ChevronUp size={16} color="#64748B" />
               ) : (
                 <ChevronDown size={16} color="#64748B" />
               )}
             </View>
           </TouchableOpacity>

      {/* History Content */}
      {isExpanded && (
        <View style={styles.historyWrapper}>
          {loading ? (
            renderLoadingState()
          ) : history.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={(item, index) => item._id || index.toString()}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  toggleButton: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    marginLeft: 8,
    marginRight: 4,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  historyWrapper: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  listContent: {
    padding: 8,
  },
  historyItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#15803d',
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  mealIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    flex: 1,
  },
  menuName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  priceTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  itemsSection: {
    gap: 4,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 6,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    minWidth: 60,
  },
  dishList: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  notesSection: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 3,
  },
  noteText: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  specialNote: {
    fontSize: 10,
    color: '#B45309',
    fontStyle: 'italic',
  },
  loadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

export default PastHistory;