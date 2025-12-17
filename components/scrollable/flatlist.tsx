// components/scroll/FlatListContainer.tsx
import React from 'react';
import { FlatList, FlatListProps, StyleProp, ViewStyle } from 'react-native';
import { BaseScrollView } from './basescrollable';

interface CustomFlatListProps<T> extends FlatListProps<T> {
  safeArea?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function FlatListContainer<T>({
  safeArea = true,
  contentContainerStyle,
  ...flatListProps
}: CustomFlatListProps<T>) {
  return (
    <BaseScrollView safeArea={safeArea}>
      <FlatList<T>
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        {...flatListProps}
      />
    </BaseScrollView>
  );
}

const styles = {
  contentContainer: {
    paddingBottom: 24,
  },
} as const;