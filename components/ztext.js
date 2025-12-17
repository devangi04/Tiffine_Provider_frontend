// components/global/Text.tsx
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

interface TextProps extends RNTextProps {
  weight?: 'extraLight' | 'light' | 'regular' | 'semiBold' | 'bold' | 'extraBold' | 'black';
  size?: 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl' | 'xxxl';
  color?: string;
}

export const Text = ({ 
  children,
  style, 
  weight = 'regular',
  size = 'medium',
  color = '#1C1C1C',
  ...props 
}: TextProps) => {
  const getFontFamily = () => {
    switch (weight) {
      case 'extraLight': return 'NunitoSans-ExtraLight';
      case 'light': return 'NunitoSans-Light';
      case 'regular': return 'NunitoSans-Regular';
      case 'semiBold': return 'NunitoSans-SemiBold';
      case 'bold': return 'NunitoSans-Bold';
      case 'extraBold': return 'NunitoSans-ExtraBold';
      case 'black': return 'NunitoSans-Black';
      default: return 'NunitoSans-Regular';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'xs': return 12;
      case 'small': return 14;
      case 'medium': return 16;
      case 'large': return 18;
      case 'xl': return 20;
      case 'xxl': return 24;
      case 'xxxl': return 28;
      default: return 16;
    }
  };

  return (
    <RNText 
      style={[
        {
          fontFamily: getFontFamily(),
          fontSize: getFontSize(),
          color: color,
          includeFontPadding: false, // Removes extra padding around text
        },
        style
      ]} 
      {...props}
    >
      {children}
    </RNText>
  );
};

// Export pre-defined styles
export const TextStyles = StyleSheet.create({
  heading: {
    fontFamily: 'NunitoSans-Bold',
    fontSize: 24,
    color: '#1C1C1C',
  },
  subheading: {
    fontFamily: 'NunitoSans-SemiBold',
    fontSize: 18,
    color: '#1C1C1C',
  },
  body: {
    fontFamily: 'NunitoSans-Regular',
    fontSize: 16,
    color: '#4A4A4A',
  },
  caption: {
    fontFamily: 'NunitoSans-Light',
    fontSize: 14,
    color: '#9B9B9B',
  },
  button: {
    fontFamily: 'NunitoSans-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  price: {
    fontFamily: 'NunitoSans-Bold',
    fontSize: 18,
    color: '#FF7E8B',
  },
});

export default Text;