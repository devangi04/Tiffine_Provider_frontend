import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  Animated,
  Pressable,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { Text } from "@/components/ztext";
import { useRouter } from "expo-router";
import {
  Plus,
  Copy,
  Trash2,
  Send,
  X,
  Utensils,
  Sun,
  Moon,
} from "lucide-react-native";
import { useAppSelector } from "./store/hooks";
import PastHistory from "@/components/pasthistory";
import { BlurView } from "expo-blur";
import { API_URL } from "./config/env";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_BASE_URL = `${API_URL}/api`;
const { width, height } = Dimensions.get("window");

// Interfaces (same as before)
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

interface MenuItem {
  categoryId: string | CategoryItem;
  dishIds: string[];
  _id: string;
  categoryName?: string;
  dishNames?: string[];
}

interface Menu {
  _id: string;
  day: string;
  mealType: "lunch" | "dinner";
  items: MenuItem[];
  note?: string;
  providerId: string;
  name: string;
  createdAt: string;
  isActive?: boolean;
  pricing?: {
    price: number;
    isSpecialPrice: boolean;
    originalPrice: number;
  };
  isSpecialPricing?: boolean;
  specialPricingNote?: string;
}

interface SentMenu {
  _id: string;
  providerId: string;
  menuId: string;
  menuName: string;
  day: string;
  mealType: "lunch" | "dinner";
  items: {
    categoryId: string;
    categoryName: string;
    dishes: {
      dishId: string;
      dishName: string;
    }[];
  }[];
  note?: string;
  sentAt: string;
}

const DAYS = [
  { id: "monday", name: "Mon" },
  { id: "tuesday", name: "Tue" },
  { id: "wednesday", name: "Wed" },
  { id: "thursday", name: "Thu" },
  { id: "friday", name: "Fri" },
  { id: "saturday", name: "Sat" },
  { id: "sunday", name: "Sun" },
];

const MEAL_TYPES = [
  { id: "lunch", name: "Lunch", icon: Sun, color: "#15803d" },
  { id: "dinner", name: "Dinner", icon: Moon, color: "#15803d" },
];

const ScheduleScreen: React.FC = () => {
  const provider = useAppSelector((state) => state.provider);
  const providerId = provider.id;
  const router = useRouter();

  // Combined state
  const [combinedData, setCombinedData] = useState<{
    menus: Menu[];
    categories: CategoryItem[];
    dishes: DishItem[];
    todaySentMenus: { [key: string]: boolean };
    sentMenuIds: { [key: string]: boolean };
    preferences: any;
  }>({
    menus: [],
    categories: [],
    dishes: [],
    todaySentMenus: {},
    sentMenuIds: {},
    preferences: null,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>(
    DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].id
  );
  const [selectedMealType, setSelectedMealType] = useState<"lunch" | "dinner">(
    "lunch"
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [showMealTabs, setShowMealTabs] = useState<boolean>(true);
  const [sendingMenu, setSendingMenu] = useState<string | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [selectedMenuForOverlay, setSelectedMenuForOverlay] =
    useState<Menu | null>(null);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [menuHistory, setMenuHistory] = useState<{ [key: string]: SentMenu[] }>(
    {}
  );
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<{
    [key: string]: boolean;
  }>({});


  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isDuplicateModalVisible, setIsDuplicateModalVisible] = useState(false);

  // Swiping animations
  const scrollX = useRef(new Animated.Value(0)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const horizontalScrollViewRef = useRef<ScrollView>(null);
  
  // Animation for tab text colors
  const lunchTextColor = useRef(new Animated.Value(1)).current; // 1 = active (dark), 0 = inactive (white)
  const dinnerTextColor = useRef(new Animated.Value(0)).current; // 1 = active (dark), 0 = inactive (white)
  
  // Animation for count badges
  const lunchCountOpacity = useRef(new Animated.Value(1)).current;
  const dinnerCountOpacity = useRef(new Animated.Value(0)).current;
  const lunchCountScale = useRef(new Animated.Value(1)).current;
  const dinnerCountScale = useRef(new Animated.Value(0)).current;
  
  // Overlay animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.8)).current;

  // Calculate indicator width - FIXED: Make both sides equal
  const indicatorWidth = (width - 60) / 2-4; // Equal width for both tabs

  // Setup scroll listener for animations
  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const progress = value / width; // 0 to 1 (0 = lunch, 1 = dinner)
      
      // Update indicator position
      const position = progress * indicatorWidth;
      indicatorPosition.setValue(position);
      
      // Update text colors
      lunchTextColor.setValue(1 - progress); // Lunch: 1 to 0
      dinnerTextColor.setValue(progress); // Dinner: 0 to 1
      
      // Update count badges with cross-fade effect
      lunchCountOpacity.setValue(1 - progress);
      dinnerCountOpacity.setValue(progress);
      lunchCountScale.setValue(1 - progress);
      dinnerCountScale.setValue(progress);
    });

    return () => {
      scrollX.removeListener(listener);
    };
  }, [indicatorWidth]);

  useEffect(() => {
  setExpandedHistoryDays({});
}, [selectedDay]);

useFocusEffect(
  useCallback(() => {
    return () => {
      // Reset all UI states when screen loses focus
      setExpandedHistoryDays({});
      setSelectedMenuId(null);
      setIsOverlayVisible(false);
      setSelectedMenuForOverlay(null);
      setSelectedMenu(null);
    };
  }, [])
);
useEffect(() => {
  setExpandedHistoryDays({});
}, [selectedMealType]);
  // Handle scroll end to update selected meal type
  const handleScrollEnd = useCallback((event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    const mealType = index === 0 ? "lunch" : "dinner";
    
    if (mealType !== selectedMealType) {
      setSelectedMealType(mealType);
    }
  }, [selectedMealType]);

  // Handle meal type tab press
  const handleMealTypePress = useCallback((mealType: "lunch" | "dinner") => {
    const index = mealType === "lunch" ? 0 : 1;
    
    // Scroll to the correct page
    if (horizontalScrollViewRef.current) {
      horizontalScrollViewRef.current.scrollTo({
        x: index * width,
        animated: true,
      });
    }
    
    setSelectedMealType(mealType);
  }, []);

  // Fetch combined data
  const fetchCombinedData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/combine/menu/combined-data?providerId=${providerId}`
      );
      const result = await response.json();

      if (result.success) {
        setCombinedData({
          menus: result.menus || [],
          categories: result.categories || [],
          dishes: result.dishes || [],
          todaySentMenus: result.todaySentMenus || {},
          sentMenuIds: result.sentMenuIds || {},
          preferences: result.preferences || null,
        });

        // Set meal preferences
       if (result.preferences) {
  const lunchEnabled = result.preferences.lunch?.enabled === true;
  const dinnerEnabled = result.preferences.dinner?.enabled === true;
  
  // Only show tabs if both are enabled
  setShowMealTabs(lunchEnabled && dinnerEnabled);

  // Set default selected meal type based on preferences
  if (lunchEnabled && !dinnerEnabled) {
    setSelectedMealType("lunch");
  } else if (!lunchEnabled && dinnerEnabled) {
    setSelectedMealType("dinner");
  } else if (lunchEnabled && dinnerEnabled) {
    // Both enabled, default to lunch
    setSelectedMealType("lunch");
  }
}
      } else {
        setError(result.message || "Failed to load data");
      }
    } catch (error: any) {
      setError("Failed to load data. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [providerId]);

  // Fetch menu history
  const fetchMenuHistory = useCallback(
    async (day: string) => {
      try {
        setHistoryLoading(true);
        const response = await fetch(
          `${API_BASE_URL}/sentmenu?providerId=${providerId}&weeks=12`
        );
        const result = await response.json();

        if (result.success) {
          const sentMenus = result.data || [];
          const dayHistory = sentMenus
            .filter((menu: SentMenu) => menu.day === day)
            .sort(
              (a: SentMenu, b: SentMenu) =>
                new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
            );

          setMenuHistory((prev) => ({
            ...prev,
            [day]: dayHistory,
          }));
        }
      } catch (error) {
        console.error("Error fetching menu history:", error);
      } finally {
        setHistoryLoading(false);
      }
    },
    [providerId]
  );

  // Initial load
  useEffect(() => {
    if (!providerId) {
      router.push("/");
      return;
    }
    fetchCombinedData();
  }, [providerId, fetchCombinedData]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const refreshData = async () => {
        if (isActive && providerId) {
          await fetchCombinedData();
        }
      };

      refreshData();

      return () => {
        isActive = false;
      };
    }, [fetchCombinedData, providerId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCombinedData();
  };

  // Delete menu
  const deleteMenu = useCallback(async () => {
    if (!selectedMenu) return;
    try {
      const response = await fetch(`${API_BASE_URL}/menu/${selectedMenu._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        setIsDeleteModalVisible(false);
        setSelectedMenu(null);

        // Update local state
        setCombinedData((prev) => ({
          ...prev,
          menus: prev.menus.filter((menu) => menu._id !== selectedMenu._id),
        }));

        Alert.alert("Success", "Menu deleted successfully!");
      } else {
        throw new Error(result.message || "Failed to delete menu");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete menu");
    }
  }, [selectedMenu]);

  // Duplicate menu
  const duplicateMenu = useCallback(
    async (day: string, mealType: "lunch" | "dinner") => {
      if (!selectedMenu) return;
      try {
        const response = await fetch(
          `${API_BASE_URL}/menu/${selectedMenu._id}/duplicate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              day: day,
              mealType: mealType,
              name: `Copy of ${selectedMenu.name}`,
            }),
          }
        );

        const result = await response.json();

        if (result.success) {
          setIsDuplicateModalVisible(false);
          setSelectedMenu(null);
          await fetchCombinedData();
          Alert.alert("Success", "Menu duplicated successfully!");
        } else {
          throw new Error(result.message || "Failed to duplicate menu");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to duplicate menu");
      }
    },
    [selectedMenu, fetchCombinedData]
  );

  // Helper functions
  const getCategoryName = useCallback(
    (categoryId: string | CategoryItem): string => {
      if (typeof categoryId === "object" && categoryId?.name) {
        return categoryId.name;
      }

      const category = combinedData.categories.find(
        (cat) => cat._id === categoryId
      );
      return category?.name || "Unknown Category";
    },
    [combinedData.categories]
  );

  const getDishNamesForCategory = useCallback(
    (dishIds: string[]): string => {
      if (!dishIds || !Array.isArray(dishIds)) return "No dishes";

      const dishNames = dishIds.map((dishId) => {
        const dish = combinedData.dishes.find((d) => d._id === dishId);
        return dish?.name || "Unknown Dish";
      });

      return (
        dishNames.filter((name) => name !== "Unknown Dish").join(", ") ||
        "No dishes"
      );
    },
    [combinedData.dishes]
  );

  const getMealTypeIcon = (mealType: "lunch" | "dinner") => {
    const mealConfig = MEAL_TYPES.find((m) => m.id === mealType);
    const IconComponent = mealConfig?.icon || Utensils;
    const color = mealConfig?.color || "#15803d";

    return { IconComponent, color };
  };

  // Send menu function
const sendMenu = useCallback(
  async (menuId: string) => {
    try {
      const menu = combinedData.menus.find((m) => m._id === menuId);
      if (!menu) {
        Alert.alert("Error", "Menu not found");
        return;
      }

      // Check if ANY menu has been sent today
      const hasAnyMenuBeenSentToday = Object.keys(combinedData.todaySentMenus).length > 0;
      
      if (hasAnyMenuBeenSentToday) {
        // Get the first sent menu info to show in the message
        const firstSentKey = Object.keys(combinedData.todaySentMenus)[0];
        const [sentDay, sentMealType] = firstSentKey.split('_');
        
        Alert.alert(
          "Cannot Send Menu",
          `Today's menu has already been sent (${sentDay.charAt(0).toUpperCase() + sentDay.slice(1)} ${sentMealType}).\n\nYou can only send one menu per day.`,
          [{ text: "OK" }]
        );
        return;
      }

      Alert.alert(
        "Confirm Send",
        `Are you sure you want to send the ${menu.mealType} menu for ${
          menu.day.charAt(0).toUpperCase() + menu.day.slice(1)
        }?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send",
            onPress: async () => {
              try {
                setSendingMenu(menuId);
                const response = await fetch(`${API_URL}/api/sentmenu`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ providerId, menuId }),
                });

                const result = await response.json();

                if (result.success) {
                  // Update both states
                  const todayKey = `${menu.day}_${menu.mealType}`;
                  setCombinedData((prev) => ({
                    ...prev,
                    todaySentMenus: {
                      ...prev.todaySentMenus,
                      [todayKey]: true,
                    },
                    sentMenuIds: {
                      ...prev.sentMenuIds,
                      [menuId]: true,
                    },
                  }));

                  Alert.alert("Success", "Menu sent successfully!");
                  setSelectedMenuId(null);
                  setIsOverlayVisible(false);
                }
              } catch (error) {
                Alert.alert("Error", "Failed to send menu");
              } finally {
                setSendingMenu(null);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error in sendMenu:", error);
      Alert.alert("Error", "An unexpected error occurred");
    }
  },
  [combinedData, providerId]
);

  // Menu history toggle
  const toggleHistory = async (day: string) => {
    const isExpanded = expandedHistoryDays[day];

    if (!isExpanded && !menuHistory[day]) {
      await fetchMenuHistory(day);
    }

    setExpandedHistoryDays((prev) => ({
      ...prev,
      [day]: !isExpanded,
    }));
  };

  // Render day tabs
  const renderDayTab = (day: (typeof DAYS)[0]) => {
    const isActive = day.id === selectedDay;

    const today = new Date();
    const currentDayIndex = today.getDay();
    const adjustedCurrentDayIndex =
      currentDayIndex === 0 ? 6 : currentDayIndex - 1;
    const targetDayIndex = DAYS.findIndex((d) => d.id === day.id);
    const dayDifference = targetDayIndex - adjustedCurrentDayIndex;

    const targetDate = new Date();
    targetDate.setDate(today.getDate() + dayDifference);
    const dayOfMonth = targetDate.getDate();

    return (
      <TouchableOpacity
        key={day.id}
        style={[
          styles.dayTab,
          isActive && styles.activeDayTab,
          isActive && styles.activeDayTabShadow,
        ]}
        onPress={() => {
          setSelectedDay(day.id);
          setSelectedMenuId(null);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.dayTabContent}>
          <Text
            weight="extraBold"
            style={[styles.dayName, isActive && styles.activeDayName]}
          >
            {day.name}
          </Text>

          <View
            style={
              isActive
                ? styles.dateNumberCircle
                : styles.inactiveDateNumberCircle
            }
          >
            <Text
              weight="extraBold"
              style={[styles.dateNumber, isActive && styles.activeDateNumber]}
            >
              {dayOfMonth}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Action button component
  const ActionButton = useCallback(
    ({
      icon: Icon,
      onPress,
      color,
      disabled = false,
    }: {
      icon: React.ComponentType<{ size: number; color: string }>;
      onPress: () => void;
      color: string;
      disabled?: boolean;
    }) => (
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: `${color}15`, borderColor: `${color}30` },
          disabled && styles.disabledButton,
        ]}
        onPress={(e) => {
          e.stopPropagation();
          if (!disabled) onPress();
        }}
        disabled={disabled}
      >
        <Icon size={18} color={disabled ? "#94A3B8" : color} />
      </TouchableOpacity>
    ),
    []
  );

  // Sort menus - sent today first, then others
  const sortMenus = useCallback((menus: Menu[]) => {
    return [...menus].sort((a, b) => {
      const aSent = combinedData.sentMenuIds[a._id] ? 1 : 0;
      const bSent = combinedData.sentMenuIds[b._id] ? 1 : 0;
      return bSent - aSent; // Sent menus first
    });
  }, [combinedData.sentMenuIds]);

  // Render menu card
  const renderMenuCard = useCallback(
    ({ item }: { item: Menu }) => {
      const isSelected = selectedMenuId === item._id;
      const hasDishes = item.items?.some(
        (menuItem) => menuItem.dishIds?.length > 0
      );
      const { IconComponent, color } = getMealTypeIcon(item.mealType);

      const todayKey = `${item.day}_${item.mealType}`;
     const isComboSentToday = Object.keys(combinedData.todaySentMenus).length > 0;
      const isThisMenuSentToday = !!combinedData.sentMenuIds[item._id];
      const isCurrentlySending = sendingMenu === item._id;

      return (
        <Pressable
          style={[
            styles.menuCard,
            isThisMenuSentToday && styles.sentMenuCard,
          ]}
          onPress={() => {
            setSelectedMenuId(item._id);
            setSelectedMenuForOverlay(item);
            setIsOverlayVisible(true);
          }}
        >
          {isThisMenuSentToday && (
            <View style={styles.sentTodayBadge}>
              <Text weight="bold" style={styles.sentTodayText}>
                Sent Today
              </Text>
            </View>
          )}

          <View style={styles.menuHeader}>
            <View style={styles.menuTitleContainer}>
              <View style={styles.menuTitleRow}>
                <Text
                  weight="bold"
                  style={[
                    styles.menuName,
                    isThisMenuSentToday && styles.sentMenuName,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View
                  style={[
                    styles.mealTypeBadge,
                    { backgroundColor: `${color}15` },
                  ]}
                >
                  <IconComponent size={14} color={color} />
                  <Text
                    weight="bold"
                    style={[
                      styles.mealTypeBadgeText,
                      { color: color, marginLeft: 4 },
                    ]}
                  >
                    {item.mealType.charAt(0).toUpperCase() +
                      item.mealType.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.menuDay}>
                {item.day.charAt(0).toUpperCase() + item.day.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.menuItemsContainer}>
            {item.items?.map((menuItem, index) => (
              <View key={`${item._id}-${index}`} style={styles.menuItemRow}>
                <Text weight="bold" style={styles.menuItemCategory}>
                  {menuItem.categoryName?.toUpperCase() ||
                    getCategoryName(menuItem.categoryId).toUpperCase()}
                </Text>
                <Text weight="bold" style={styles.dishNames} numberOfLines={1}>
                  {menuItem.dishNames?.join(", ") ||
                    getDishNamesForCategory(menuItem.dishIds)}
                </Text>
              </View>
            ))}

            {!hasDishes && (
              <View style={styles.noDishesContainer}>
                <Text weight="bold" style={styles.noDishesText}>
                  No dishes added yet
                </Text>
              </View>
            )}
          </View>

          {item.note && (
            <View style={styles.specialNotes}>
              <Text style={styles.specialNotesText}>📝 {item.note}</Text>
            </View>
          )}

          {item.specialPricingNote && (
            <View
              style={[
                styles.specialNotes,
                {
                  backgroundColor: "rgba(245, 158, 11, 0.05)",
                  borderLeftColor: "#F59E0B",
                },
              ]}
            >
              <Text style={[styles.specialNotesText, { color: "#B45309" }]}>
                {item.specialPricingNote}
              </Text>
            </View>
          )}

          <View style={styles.priceActionRow}>
            <View style={styles.priceContainer}>
              {item.pricing?.price > 0 && (
                <Text weight="extraBold" style={styles.menuPrice}>
                  ₹{item.pricing.price}
                </Text>
              )}
            </View>
            <View style={styles.actionButtons}>
              <ActionButton
                icon={Copy}
                onPress={() => {
                  setSelectedMenu(item);
                  setIsDuplicateModalVisible(true);
                }}
                color="#10B981"
              />
              <ActionButton
                icon={Trash2}
                onPress={() => {
                  setSelectedMenu(item);
                  setIsDeleteModalVisible(true);
                }}
                color="#EF4444"
              />

              {isComboSentToday ? (
                <TouchableOpacity
                  style={[styles.sendButton, styles.disabledSendButton]}
                  disabled={true}
                >
                  <Send size={16} color="#94A3B8" />
                  <Text style={styles.disabledSendText}>Limit reached</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    isCurrentlySending && styles.sendingButton,
                  ]}
                  onPress={() => sendMenu(item._id)}
                  disabled={isCurrentlySending}
                >
                  {isCurrentlySending ? (
                    <ActivityIndicator size="small" color={color} />
                  ) : (
                    <>
                      <Send size={16} color="#2c95f8" />
                      <Text style={styles.sendButtonText}>Send</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [
      selectedMenuId,
      sendingMenu,
      combinedData.todaySentMenus,
      combinedData.sentMenuIds,
      getCategoryName,
      getDishNamesForCategory,
      sendMenu,
    ]
  );

  // Overlay animation
  useEffect(() => {
    if (isOverlayVisible) {
      overlayOpacity.setValue(0);
      cardScale.setValue(0.8);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOverlayVisible]);

  const closeOverlay = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.8,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOverlayVisible(false);
      setSelectedMenuId(null);
      setSelectedMenuForOverlay(null);
    });
  };

  // Instagram-style overlay with Android status bar fix
  const renderInstagramStyleOverlay = () => {
    if (!isOverlayVisible || !selectedMenuForOverlay) return null;

    const menu = selectedMenuForOverlay;
    const hasDishes = menu.items?.some(menuItem => menuItem.dishIds?.length > 0);
    const { IconComponent, color } = getMealTypeIcon(menu.mealType);
    const todayKey = `${menu.day}_${menu.mealType}`;
   const isComboSentToday = Object.keys(combinedData.todaySentMenus).length > 0;
    const isThisMenuSentToday = !!combinedData.sentMenuIds[menu._id];

    const renderOverlayContent = () => (
      <Pressable style={styles.overlayPressable} onPress={closeOverlay}>
        <View style={styles.overlayContainer}>
          <Animated.View style={[styles.centeredCardContainer]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <Animated.View style={[
                styles.overlayMenuCard,
                Platform.OS === 'android' && styles.androidOverlayCard,
                isThisMenuSentToday && styles.overlaySentMenuCard,
                { 
                  transform: [{ scale: cardScale }], 
                  opacity: overlayOpacity 
                }
              ]}>
                <ScrollView style={styles.cardScrollView} showsVerticalScrollIndicator={false}>
                  {isThisMenuSentToday && (
                    <View style={[styles.overlaySentTodayBadge, Platform.OS === 'android' && styles.androidSentBadge]}>
                      <Text weight="bold" style={styles.overlaySentTodayText}>
                        Sent Today
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.menuHeader}>
                    <View style={styles.menuTitleContainer}>
                      <View style={styles.menuTitleRow}>
                        <Text weight='bold' style={[
                          styles.overlayMenuName,
                          isThisMenuSentToday && styles.sentMenuName
                        ]} numberOfLines={2}>
                          {menu.name}
                        </Text>
                        <View style={[styles.mealTypeBadge, { backgroundColor: `${color}15` }]}>
                          <IconComponent size={16} color={color} />
                          <Text weight='bold' style={[styles.mealTypeBadgeText, { color: color, marginLeft: 4 }]}>
                            {menu.mealType.charAt(0).toUpperCase() + menu.mealType.slice(1)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.overlayMenuDay}>
                        {menu.day.charAt(0).toUpperCase() + menu.day.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.menuItemsContainer}>
                    {menu.items?.map((menuItem, index) => (
                      <View key={`${menu._id}-${index}`} style={styles.overlayMenuItemRow}>
                        <View style={styles.categoryHeader}>
                          <View style={[styles.categoryDot, { backgroundColor: color }]} />
                          <Text weight='bold' style={styles.overlayMenuItemCategory}>
                            {menuItem.categoryName || getCategoryName(menuItem.categoryId)}
                          </Text>
                        </View>
                        <Text style={styles.overlayDishNames}>
                          {menuItem.dishNames?.join(", ") || getDishNamesForCategory(menuItem.dishIds)}
                        </Text>
                      </View>
                    ))}
                    
                    {!hasDishes && (
                      <View style={styles.noDishesContainer}>
                        <Utensils size={32} color="#CBD5E1" />
                        <Text weight="bold" style={styles.noDishesText}>
                          No dishes added yet
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {menu.pricing?.price > 0 && (
                    <View style={styles.overlayPriceContainer}>
                      <Text weight="bold" style={styles.priceLabel}>
                        Price
                      </Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.overlayMenuPrice}>
                          ₹{menu.pricing.price}
                        </Text>
                        {menu.isSpecialPricing && (
                          <View style={styles.specialPriceBadge}>
                            <Text style={styles.specialPriceBadgeText}>
                              Special
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </ScrollView>
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View style={styles.buttonsBelowCard}>
            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity 
                style={[
                  styles.bottomButton, 
                  styles.cancelButton,
                  Platform.OS === 'android' && styles.androidBottomButton
                ]}
                onPress={closeOverlay}
                activeOpacity={0.7}
              >
                <X size={20} color="red" />
                <Text color='red' style={styles.bottomButtonText}>Cancel</Text>
              </TouchableOpacity>


{!isComboSentToday ? (
  <TouchableOpacity 
    style={[
      styles.bottomButton, 
      styles.activeSendButton,
      Platform.OS === 'android' && styles.androidBottomButton
    ]}
    onPress={(e) => {
      e.stopPropagation();
      closeOverlay();
      setTimeout(() => sendMenu(menu._id), 300);
    }}
    activeOpacity={0.7}
  >
    <Send size={20} color="#117ae3ff" />
    <Text color='#117ae3ff' style={styles.bottomButtonText}>Send</Text>
  </TouchableOpacity>
) : (
  <TouchableOpacity 
    style={[
      styles.bottomButton, 
      styles.disabledBottomButton,
      Platform.OS === 'android' && styles.androidBottomButton
    ]}
    disabled={true}
    activeOpacity={0.8}
  >
    <Send size={20} color="black" />
    <Text color='black' style={styles.bottomButtonText}>Daily Limit Reached</Text>
  </TouchableOpacity>
)}
            </View>
          </Animated.View>
        </View>
      </Pressable>
    );

    return (
      <Modal
        visible={isOverlayVisible}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true} // FIX: Add this for Android
        onRequestClose={closeOverlay}
        {...(Platform.OS === 'android' && {
          hardwareAccelerated: true,
          presentationStyle: 'overFullScreen'
        })}
      >
        {/* FIX: Handle status bar for Android */}
        {Platform.OS === 'android' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
            <StatusBar backgroundColor="rgba(0, 0, 0, 0.8)" barStyle="light-content" />
            <Animated.View style={[
              styles.androidOverlayBackground,
              { opacity: overlayOpacity }
            ]}>
              {renderOverlayContent()}
            </Animated.View>
          </View>
        ) : (
          <BlurView intensity={30} tint="systemMaterialDark" style={StyleSheet.absoluteFill}>
            <StatusBar barStyle="light-content" />
            <Animated.View style={[styles.overlayBackground, { opacity: overlayOpacity }]}>
              {renderOverlayContent()}
            </Animated.View>
          </BlurView>
        )}
      </Modal>
    );
  };

  // Duplicate modal
  const renderDuplicateModal = () => (
    <Modal
      visible={isDuplicateModalVisible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={() => setIsDuplicateModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Duplicate "{selectedMenu?.name}"
          </Text>
          <Text style={styles.modalText}>
            Select a day and meal type to duplicate this menu to:
          </Text>

          <ScrollView style={styles.dayPicker}>
            {DAYS.filter((day) => day.id !== selectedMenu?.day).map((day) => (
              <View key={day.id} style={styles.dayOptionGroup}>
                <Text style={styles.dayOptionLabel}>{day.name}</Text>
                <View style={styles.mealTypeOptions}>
                  {MEAL_TYPES.map((mealType) => {
                    const Icon = mealType.icon;
                    return (
                      <TouchableOpacity
                        key={`${day.id}-${mealType.id}`}
                        style={[
                          styles.mealTypeOption,
                          { borderColor: mealType.color },
                        ]}
                        onPress={() =>
                          duplicateMenu(
                            day.id,
                            mealType.id as "lunch" | "dinner"
                          )
                        }
                      >
                        <Icon size={16} color={mealType.color} />
                        <Text
                          style={[
                            styles.mealTypeOptionText,
                            { color: mealType.color, marginLeft: 6 },
                          ]}
                        >
                          {mealType.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setIsDuplicateModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Filtered and sorted menus for both meal types
  const lunchMenus = useMemo(() => {
    const filtered = combinedData.menus.filter(
      (menu) => menu.day === selectedDay && menu.mealType === "lunch"
    );
    return sortMenus(filtered);
  }, [combinedData.menus, selectedDay, sortMenus]);

  const dinnerMenus = useMemo(() => {
    const filtered = combinedData.menus.filter(
      (menu) => menu.day === selectedDay && menu.mealType === "dinner"
    );
    return sortMenus(filtered);
  }, [combinedData.menus, selectedDay, sortMenus]);

  // Render history section
  const renderHistorySection = (day: string) => {
    return (
      <PastHistory
        history={menuHistory[day] || []}
        loading={historyLoading}
        isExpanded={expandedHistoryDays[day] || false}
        onToggle={() => toggleHistory(day)}
        day={day}
        getDishName={(dishId) => {
          const dish = combinedData.dishes.find((d) => d._id === dishId);
          return dish?.name || "Unknown Dish";
        }}
        formatDate={(dateString) => {
          const date = new Date(dateString);
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        }}
        type="sent"
      />
    );
  };

  // Render empty state
  const renderEmptyState = (mealType: "lunch" | "dinner") => {
    return (
      <View style={styles.emptyContainer}>
        <Utensils size={48} color="#94A3B8" />
        <Text style={styles.emptyText}>
          No {mealType} menus for{" "}
          {DAYS.find((d) => d.id === selectedDay)?.name}
        </Text>
        <Text style={styles.emptySubtext}>
          Create a {mealType} menu and add dishes to get started
        </Text>

        {/* {renderHistorySection(selectedDay)} */}

        {/* <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: "/menu",
              params: {
                providerId,
                defaultDay: selectedDay,
                defaultMealType: mealType,
              },
            })
          }
        >
          <Plus size={20} color="#fff" />
          <Text style={styles.addButtonText}>
            Create{" "}
            {mealType.charAt(0).toUpperCase() +
              mealType.slice(1)}{" "}
            Menu
          </Text>
        </TouchableOpacity> */}
      </View>
    );
  };

  // Loading states
  if (loading && combinedData.menus.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Loading menus...</Text>
      </View>
    );
  }

  if (error && combinedData.menus.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchCombinedData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.container}>
      {/* Days Container */}
      <View style={styles.daysContainer}>
        <View style={styles.daysGrid}>{DAYS.map(renderDayTab)}</View>
      </View>

      {/* Meal Type Tabs with Swipe Indicator - FIXED: Equal width */}
      {showMealTabs && (
        <View style={styles.mealTypeTabWrapper}>
          <View style={styles.mealTypeTabContainer}>
            {/* Sliding indicator - FIXED: Centered width */}
           <Animated.View
             pointerEvents="none"
             style={[
               styles.mealTypeTabIndicator,
               {
                 width: indicatorWidth,
                 transform: [{ translateX: indicatorPosition }],
               },
             ]}
           />
            
            <View style={styles.mealTypeTabsInner}>
              {MEAL_TYPES.map((mealType) => {
                const isActive = mealType.id === selectedMealType;
                const Icon = mealType.icon;
                const dayMenus = mealType.id === "lunch" ? lunchMenus : dinnerMenus;
                
                // Interpolate text color based on scroll position
                const textColor = isActive ? "#15803d" : "#FFFFFF";


                return (
                  <TouchableOpacity
                    key={mealType.id}
                    style={[
                      styles.mealTypeTabButton,
                      isActive && styles.activeMealTypeTabButton,
                    ]}
                    onPress={() => handleMealTypePress(mealType.id as "lunch" | "dinner")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.mealTypeContent}>
                      
                        <Icon
                          size={18}
                          color={isActive ? "#15803d" : "#FFFFFF"}
                        />
                     
                     <Text
                      key={`${mealType.id}-${isActive}`}   // 👈 forces re-mount
                      style={[
                        styles.mealTypeTabText,
                        {
                          color: isActive ? '#15803d' : '#FFFFFF',
                        },
                      ]}
                    >
                      {mealType.name}
                    </Text>
                    </View>

                    {dayMenus.length > 0 && (
                      <Animated.View
                        style={[
                          styles.mealTypeTabCount,
                          {
                            backgroundColor: "#FFFFFF",
                            borderColor: "#15803d",
                            opacity: mealType.id === "lunch" ? lunchCountOpacity : dinnerCountOpacity,
                            transform: [
                              { 
                                scale: mealType.id === "lunch" ? lunchCountScale : dinnerCountScale 
                              }
                            ],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.mealTypeTabCountText,
                            { color: "#15803d" },
                          ]}
                        >
                          {dayMenus.length}
                        </Text>
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Horizontal ScrollView for Content Swiping */}
    {/* Horizontal ScrollView for Content Swiping - Only when both meals are enabled */}
{showMealTabs ? (
  <Animated.ScrollView
    ref={horizontalScrollViewRef}
    horizontal
    pagingEnabled
    showsHorizontalScrollIndicator={false}
    onScroll={Animated.event(
      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
      { useNativeDriver: false }
    )}
    onMomentumScrollEnd={handleScrollEnd}
    scrollEventThrottle={16}
    style={styles.horizontalScrollView}
    contentContainerStyle={styles.horizontalScrollContent}
    decelerationRate="fast"
    snapToInterval={width}
    snapToAlignment="center"
  >
    {/* Lunch Content Page */}
    <View style={styles.pageContainer}>
      <FlatList
        data={lunchMenus}
        renderItem={renderMenuCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContainer,
          lunchMenus.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={() => renderEmptyState("lunch")}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2c95f8"]}
          />
        }
        ListHeaderComponent={
          <>{lunchMenus.length > 0 && renderHistorySection(selectedDay)}</>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
    
    {/* Dinner Content Page */}
    <View style={styles.pageContainer}>
      <FlatList
        data={dinnerMenus}
        renderItem={renderMenuCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContainer,
          dinnerMenus.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={() => renderEmptyState("dinner")}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2c95f8"]}
          />
        }
        ListHeaderComponent={
          <>{dinnerMenus.length > 0 && renderHistorySection(selectedDay)}</>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  </Animated.ScrollView>
) : (
  /* Single meal type view - No swiping */
  <View style={styles.singleMealContainer}>
    <FlatList
      data={selectedMealType === "lunch" ? lunchMenus : dinnerMenus}
      renderItem={renderMenuCard}
      keyExtractor={(item) => item._id}
      contentContainerStyle={[
        styles.listContainer,
        (selectedMealType === "lunch" ? lunchMenus : dinnerMenus).length === 0 && 
        styles.emptyListContainer,
      ]}
      ListEmptyComponent={() => renderEmptyState(selectedMealType)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#2c95f8"]}
        />
      }
      ListHeaderComponent={
        <>{renderHistorySection(selectedDay)}</>
      }
      showsVerticalScrollIndicator={false}
    />
  </View>
)}

   

      {/* Overlay */}
      {renderInstagramStyleOverlay()}

      {/* Delete Modal */}
      <Modal
        visible={isDeleteModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Menu</Text>
            <Text style={styles.modalText}>
              Are you sure you want to delete "{selectedMenu?.name}"? This
              action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={deleteMenu}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duplicate Modal */}
      {renderDuplicateModal()}
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // paddingTop:120,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 12,
    paddingBottom: 100,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: "center",
  },
  daysContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(226, 232, 240, 0.3)",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  daysGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  dayTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: "#F8FAFC",
    borderWidth: 0,
    minHeight: 66,
    position: "relative",
  },
  activeDayTab: {
    backgroundColor: "#15803d",
    transform: [{ scale: 1.05 }],
  },
  activeDayTabShadow: {
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  dayTabContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dayName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#15803d",
    textTransform: "capitalize",
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  activeDayName: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dateNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 28,
  },
  activeDateNumber: {
    color: "#060606ff",
    fontWeight: "800",
  },
  dateNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 23,
    borderColor: "white",
    borderWidth: 1,
    backgroundColor: "#e5e7f3d3",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: -12,
  },
  inactiveDateNumberCircle: {
    width: 36,
    height: 36,
    borderRadius: 23,
    borderColor: "white",
    borderWidth: 2,
    backgroundColor: "#ebecedff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: -12,
  },
  mealTypeTabWrapper: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  // FIXED: Meal type container with equal width tabs
  mealTypeTabContainer: {
    position: 'relative',
  backgroundColor: '#15803d',
  borderRadius: 25,
  padding: 4,
  height: 50,
  overflow: 'hidden',
  },
  mealTypeTabsInner: {
    flexDirection: "row",
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
  // FIXED: Indicator with equal width
  mealTypeTabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    width: (width - 60) / 2, // Equal width for both tabs
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
   
  },
  mealTypeTabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 21,
    position: "relative",
    zIndex: 2,
  },
  activeMealTypeTabButton: {
    backgroundColor: "transparent",
  },
  mealTypeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  mealTypeTabText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 2,
  },
  mealTypeTabCount: {
    position: "absolute",
    top: -6,
    right: 8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#15803d",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  mealTypeTabCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
  },
  // Horizontal ScrollView Styles
  horizontalScrollView: {
    flex: 1,
  },
  horizontalScrollContent: {
    width: width * 2,
  },
  pageContainer: {
    width: width,
    flex: 1,
  },
  // Menu Card Styles
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  menuTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  menuName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    marginRight: 8,
  },
  mealTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  menuDay: {
    fontSize: 12,
    color: "#64748B",
  },
  priceActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuPrice: {
    color: "#080808ff",
    fontWeight: "600",
    fontSize: 22,
  },
  menuItemsContainer: {
    marginBottom: 8,
  },
  menuItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  menuItemCategory: {
    fontWeight: "600",
    color: "#030303ff",
    fontSize: 13,
    flex: 1,
    textAlign: "left",
  },
  dishNames: {
    fontSize: 14,
    color: "#475569",
    flex: 1,
    textAlign: "right",
  },
  noDishesContainer: {
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    marginVertical: 8,
    alignItems: "center",
  },
  noDishesText: {
    color: "#64748B",
    fontStyle: "italic",
    fontSize: 14,
  },
  specialNotes: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#e5e7f3d3",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#15803d",
  },
  specialNotesText: {
    fontSize: 13,
    color: "#64748B",
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "#F1F5F9",
    borderColor: "#E2E8F0",
  },
  sendButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minWidth: 70,
  },
  disabledSendButton: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    opacity: 0.6,
    flexDirection: "row",
  },
  sendingButton: {
    opacity: 0.7,
    backgroundColor: "#EFF6FF",
  },
  disabledSendText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  sendButtonText: {
    color: "#2c95f8",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#64748B",
    marginBottom: 8,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 16,
    textAlign: "center",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#15803d",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#15803d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 16,
  },
  floatingAddButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#15803d",
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2c95f8",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: "#475569",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
 cancelButton: {
    backgroundColor: '#fdfeffff',
    ...Platform.select({
      ios: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
      },
      android: {
        borderWidth: 2,
        borderColor: '#E2E8F0',
      }
    }),
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  cancelButtonText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 16,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  dayPicker: {
    marginBottom: 24,
    maxHeight: 300,
  },
  dayOptionGroup: {
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dayOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  mealTypeOptions: {
    flexDirection: "row",
    gap: 8,
  },
  mealTypeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.05)",
    borderWidth: 1,
  },
  mealTypeOptionText: {
    color: "#475569",
    fontWeight: "500",
    fontSize: 14,
  },
  overlayBackground: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.8)',
  },
  overlayPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, // FIX: Include status bar height
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    width: '100%',
  },
  overlayCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    right: 20,
    zIndex: 1000,
    padding: 8,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 20,
  },
  centeredCardContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 20,
  },
 overlayMenuCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: width - 50,
    maxWidth: 500,
    maxHeight: height * 0.6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 32,
        elevation: 12,
      },
      android: {
        elevation: 4,
      }
    }),
    overflow: 'hidden',
  },
  cardScrollView: {
    padding: 24,
  },
  overlayMenuName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    marginRight: 12,
  },
  overlayMenuDay: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  divider: {
    height: 2,
    backgroundColor: "#E2E8F0",
    marginVertical: 1,
  },
  overlayMenuItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    paddingVertical: 4,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  overlayMenuItemCategory: {
    fontSize: 15,
    color: "#1E293B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  overlayDishNames: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    marginLeft: 14,
  },
  overlayPriceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  priceLabel: {
    fontSize: 12,
    color: "#94A3B8",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  overlayMenuPrice: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
  },
  specialPriceBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specialPriceBadgeText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "600",
  },
  buttonsBelowCard: {
    width: width - 50,
    maxWidth: 500,
    marginTop: 16,
    paddingHorizontal: 4,
  },
  bottomButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
 bottomButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {},
    }),
  },
  activeSendButton: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      ios: {
        borderWidth: 1,
        borderColor: '#117ae3ff',
      },
      android: {
        borderWidth: 2,
        borderColor: '#117ae3ff',
      }
    }),
  },
  
  disabledBottomButton: {
    backgroundColor: "#ffffffff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    opacity: 0.6,
  },
  bottomButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color:'black'
  },
  sentMenuCard: {
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  sentTodayBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sentTodayText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  sentMenuName: {
    color: "#059669",
  },
  overlaySentTodayBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  overlaySentTodayText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  overlaySentMenuCard: {
    borderWidth: 2,
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
   androidOverlayBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  
  androidOverlayCard: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  androidOverlayCloseButton: {
    elevation: 0,
    shadowColor: 'transparent',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  
  androidBottomButton: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    borderWidth: 2,
  },
  
  androidSentBadge: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  singleMealContainer: {
  flex: 1,
},

});

export default ScheduleScreen;