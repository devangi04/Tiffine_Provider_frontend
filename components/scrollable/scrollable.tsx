// components/scroll/ScrollContainer.tsx
import React from 'react';
import {
  ScrollView,
  StyleProp,
  ViewStyle,
  ScrollViewProps
} from 'react-native';
import { BaseScrollView } from './basescrollable';

// Extend ScrollViewProps to include all native ScrollView properties
interface ScrollContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  safeArea?: boolean;
}

export const ScrollContainer = ({
  children,
  contentContainerStyle,
  safeArea = true,
  ...rest // This captures all other ScrollView props
}: ScrollContainerProps) => (
  <BaseScrollView safeArea={safeArea}>
    <ScrollView
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest} // Spread all other ScrollView props
    >
      {children}
    </ScrollView>
  </BaseScrollView>
);

const styles = {
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
} as const;