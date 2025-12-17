// components/KeyboardAwareScrollView.tsx
import React from 'react';
import {
  KeyboardAwareScrollView as BaseKeyboardAwareScrollView,
  KeyboardAwareScrollViewProps
} from 'react-native-keyboard-aware-scroll-view';

interface Props extends KeyboardAwareScrollViewProps {
  children: React.ReactNode;
}

export const KeyboardAwareScrollView = ({ children, ...props }: Props) => (
  <BaseKeyboardAwareScrollView
    enableOnAndroid={true}
    extraScrollHeight={30}
    keyboardShouldPersistTaps="handled"
    enableAutomaticScroll={true}
    contentContainerStyle={{ flexGrow: 1 }}
    {...props}
  >
    {children}
  </BaseKeyboardAwareScrollView>
);