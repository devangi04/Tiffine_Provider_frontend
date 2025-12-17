import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CoachMarkStep {
  id: string;
  title: string;
  description: string;
  target?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  arrowPosition?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightRadius?: number;
}

export const COACH_MARK_PREFIX = 'tiffin_coach_mark_';

export const useCoachMark = (pageId?: string) => {
  const [showCoachMark, setShowCoachMark] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<CoachMarkStep[]>([]);
  const [pageCoachMarkKey, setPageCoachMarkKey] = useState<string>('');

  useEffect(() => {
    if (pageId) {
      const key = `${COACH_MARK_PREFIX}${pageId}`;
      setPageCoachMarkKey(key);
      checkCoachMarkStatus(key);
    }
  }, [pageId]);

  const checkCoachMarkStatus = async (key?: string) => {
    const storageKey = key || pageCoachMarkKey;
    if (!storageKey) return;

    try {
      const hasSeenCoachMark = await AsyncStorage.getItem(storageKey);
      if (!hasSeenCoachMark) {
        setShowCoachMark(true);
      }
    } catch (error) {
      console.error('Error checking coach mark status:', error);
    }
  };

  const startTour = (tourSteps: CoachMarkStep[], specificPageId?: string) => {
    setSteps(tourSteps);
    setCurrentStep(0);
    setShowCoachMark(true);
    
    // If a specific page ID is provided, update the key
    if (specificPageId) {
      setPageCoachMarkKey(`${COACH_MARK_PREFIX}${specificPageId}`);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipTour = async () => {
    try {
      if (pageCoachMarkKey) {
        await AsyncStorage.setItem(pageCoachMarkKey, 'true');
      }
      setShowCoachMark(false);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error skipping tour:', error);
    }
  };

  const completeTour = async () => {
    try {
      if (pageCoachMarkKey) {
        await AsyncStorage.setItem(pageCoachMarkKey, 'true');
      }
      setShowCoachMark(false);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error completing tour:', error);
    }
  };

  const restartTour = async (newSteps?: CoachMarkStep[]) => {
    try {
      if (pageCoachMarkKey) {
        await AsyncStorage.removeItem(pageCoachMarkKey);
      }
      if (newSteps) {
        setSteps(newSteps);
      }
      setShowCoachMark(true);
      setCurrentStep(0);
    } catch (error) {
      console.error('Error restarting tour:', error);
    }
  };

  const resetAllCoachMarks = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const coachMarkKeys = keys.filter(key => key.startsWith(COACH_MARK_PREFIX));
      await AsyncStorage.multiRemove(coachMarkKeys);
      console.log('All coach marks reset');
    } catch (error) {
      console.error('Error resetting all coach marks:', error);
    }
  };

  const updateStepTarget = (stepIndex: number, target: CoachMarkStep['target']) => {
    const newSteps = [...steps];
    if (newSteps[stepIndex]) {
      newSteps[stepIndex] = { ...newSteps[stepIndex], target };
      setSteps(newSteps);
    }
  };

  return {
    showCoachMark,
    currentStep,
    steps,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    restartTour,
    resetAllCoachMarks,
    updateStepTarget,
  };
};

// Predefined tours for different pages
export const dashboardTour: CoachMarkStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to Tiffin Dashboard!',
    description: 'This is your command center for managing daily tiffin operations. Let\'s explore!',
    position: 'center',
    arrowPosition: 'center',
  },
  {
    id: 'search',
    title: '🔍 Smart Search',
    description: 'Find anything instantly - customers, dishes, menus, or bills. Just start typing!',
    position: 'bottom',
    arrowPosition: 'top',
    spotlightRadius: 10,
  },
  {
    id: 'today_orders',
    title: '📊 Today\'s Orders',
    description: 'Quick snapshot of today\'s total orders. This updates in real-time.',
    position: 'bottom',
    arrowPosition: 'top',
    spotlightRadius: 24,
  },
  {
    id: 'stats',
    title: '📈 Response Analytics',
    description: 'Track "Yes" and "No" responses for meal confirmations.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'quick_actions',
    title: '⚡ Quick Actions',
    description: 'One-tap access to create menu, check responses, and manage customers.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'menu',
    title: '🍽️ Today\'s Menu',
    description: 'What\'s cooking today? Customers see this menu for their orders.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'recent_orders',
    title: '📝 Recent Activity',
    description: 'Latest customer orders with status updates.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'completion',
    title: '🎉 Ready to Go!',
    description: 'You\'re all set! Tap the help button anytime to see this guide again.',
    position: 'center',
    arrowPosition: 'center',
  },
];

export const menuPageTour: CoachMarkStep[] = [
  {
    id: 'welcome_menu',
    title: '📋 Menu Management',
    description: 'Create and manage your daily menus here. Let\'s get started!',
    position: 'center',
    arrowPosition: 'center',
  },
  {
    id: 'add_dish',
    title: '➕ Add New Dish',
    description: 'Tap here to add a new dish to today\'s menu.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'dish_list',
    title: '🍛 Dish Management',
    description: 'View, edit, or remove dishes from your menu.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'menu_preview',
    title: '👀 Preview Menu',
    description: 'See how your menu looks to customers.',
    position: 'bottom',
    arrowPosition: 'top',
  },
];

export const customerPageTour: CoachMarkStep[] = [
  {
    id: 'welcome_customer',
    title: '👥 Customer Management',
    description: 'Manage all your customers and their preferences here.',
    position: 'center',
    arrowPosition: 'center',
  },
  {
    id: 'add_customer',
    title: '➕ Add New Customer',
    description: 'Register new customers to your service.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'customer_list',
    title: '📋 All Customers',
    description: 'View and manage your complete customer list.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'filter',
    title: '🔍 Filter Options',
    description: 'Filter customers by tiffin type or status.',
    position: 'bottom',
    arrowPosition: 'top',
  },
];

export const responsePageTour: CoachMarkStep[] = [
  {
    id: 'welcome_response',
    title: '✅ Response Management',
    description: 'Track customer responses for daily meals.',
    position: 'center',
    arrowPosition: 'center',
  },
  {
    id: 'yes_responses',
    title: '👍 Yes Responses',
    description: 'Customers who confirmed today\'s meal.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'no_responses',
    title: '👎 No Responses',
    description: 'Customers who declined today\'s meal.',
    position: 'bottom',
    arrowPosition: 'top',
  },
  {
    id: 'send_reminder',
    title: '🔔 Send Reminders',
    description: 'Send reminders to customers who haven\'t responded.',
    position: 'bottom',
    arrowPosition: 'top',
  },
];