// components/scroll/basescrollable.tsx
import React from 'react';
import { KeyboardAvoidingView, Platform, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BaseScrollViewProps {
  children: React.ReactNode;
  safeArea?: boolean;
  style?: ViewStyle;
}

export const BaseScrollView = ({
  children,
  safeArea = true,
  style,
}: BaseScrollViewProps) => {
  const Container = safeArea ? SafeAreaView : React.Fragment;
  const containerProps = safeArea ? { style: [styles.flex, style] } : {};

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
      keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
    >
      <Container {...containerProps}>{children}</Container>
    </KeyboardAvoidingView>
  );
};

const styles = {
  flex: { flex: 1 },
} as const;