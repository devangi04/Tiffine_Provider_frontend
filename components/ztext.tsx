// components/global/Text.tsx
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

// Define font themes (like Zomato uses different fonts for different purposes)
export type FontTheme = 'heading' | 'body' | 'button' | 'caption' | 'display' | 'price';
export type FontFamily = 'inter' | 'opensans' | 'poppins' | 'nunito';

interface TextProps extends RNTextProps {
  theme?: FontTheme;
  weight?: 'thin' | 'extraLight' | 'light' | 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold' | 'black';
  size?: 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl' | 'xxxl' | 'huge';
  color?: string;
  fontFamily?: FontFamily;
}

export const Text = ({ 
  children,
  style, 
  theme,
  weight = 'regular',
  size = 'medium',
  color = '#1C1C1C',
  fontFamily,
  ...props 
}: TextProps) => {
  // Determine font family based on theme or prop
  const getFontFamily = () => {
    // If fontFamily is specified, use it
    if (fontFamily) {
      const fontMap = {
        inter: {
          thin: 'Inter-Thin',
          extraLight: 'Inter-ExtraLight',
          light: 'Inter-Light',
          regular: 'Inter-Regular',
          medium: 'Inter-Medium',
          semiBold: 'Inter-SemiBold',
          bold: 'Inter-Bold',
          extraBold: 'Inter-ExtraBold',
          black: 'Inter-Black',
        },
        opensans: {
          thin: 'OpenSans-Light',
          extraLight: 'OpenSans-Light',
          light: 'OpenSans-Light',
          regular: 'OpenSans-Regular',
          medium: 'OpenSans-Medium',
          semiBold: 'OpenSans-SemiBold',
          bold: 'OpenSans-Bold',
          extraBold: 'OpenSans-ExtraBold',
          black: 'OpenSans-ExtraBold',
        },
        poppins: {
          thin: 'Poppins-Thin',
          extraLight: 'Poppins-ExtraLight',
          light: 'Poppins-Light',
          regular: 'Poppins-Regular',
          medium: 'Poppins-Medium',
          semiBold: 'Poppins-SemiBold',
          bold: 'Poppins-Bold',
          extraBold: 'Poppins-ExtraBold',
          black: 'Poppins-Black',
        },
        nunito: {
          thin: 'NunitoSans-ExtraLight',
          extraLight: 'NunitoSans-ExtraLight',
          light: 'NunitoSans-Light',
          regular: 'NunitoSans-Regular',
          medium: 'NunitoSans-SemiBold',
          semiBold: 'NunitoSans-SemiBold',
          bold: 'NunitoSans-Bold',
          extraBold: 'NunitoSans-ExtraBold',
          black: 'NunitoSans-Black',
        },
      };

      const family = fontMap[fontFamily];
      return family?.[weight] || family?.regular || 'Inter-Regular';
    }

    // If theme is specified, use appropriate font family
    if (theme) {
      const themeFonts = {
        heading: 'Poppins-SemiBold', // Zomato uses bold sans-serif for headings
        body: 'Inter-Regular', // Clean, readable body text
        button: 'Inter-SemiBold', // Slightly bold for buttons
        caption: 'Inter-Light', // Light for captions
        display: 'Poppins-Bold', // Bold for display text
        price: 'Inter-Bold', // Bold for prices
      };
      return themeFonts[theme];
    }

    // Default to Inter (clean and modern)
    const interWeights = {
      thin: 'Inter-Thin',
      extraLight: 'Inter-ExtraLight',
      light: 'Inter-Light',
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semiBold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
      extraBold: 'Inter-ExtraBold',
      black: 'Inter-Black',
    };
    
    return interWeights[weight] || 'Inter-Regular';
  };

  const getFontSize = () => {
    if (theme) {
      const themeSizes = {
        heading: 24,
        body: 16,
        button: 16,
        caption: 14,
        display: 32,
        price: 20,
      };
      return themeSizes[theme];
    }

    switch (size) {
      case 'xs': return 11; // Zomato uses slightly smaller xs
      case 'small': return 13;
      case 'medium': return 15; // Standard body size
      case 'large': return 17;
      case 'xl': return 19;
      case 'xxl': return 24;
      case 'xxxl': return 28;
      case 'huge': return 32;
      default: return 15;
    }
  };

  const getColor = () => {
    if (theme === 'price') return '#FF7E8B'; // Zomato-like red for prices
    if (theme === 'caption') return '#6B7280'; // Gray for captions
    return color;
  };

  return (
    <RNText 
      style={[
        {
          fontFamily: getFontFamily(),
          fontSize: getFontSize(),
          color: getColor(),
          includeFontPadding: false,
          textAlignVertical: 'center',
        },
        style
      ]} 
      {...props}
    >
      {children}
    </RNText>
  );
};

// Pre-styled components for Zomato-like usage
export const Heading = (props: Omit<TextProps, 'theme'>) => (
  <Text  theme="heading" fontFamily="poppins" weight="semiBold" {...props} />
);

export const Body = (props: Omit<TextProps, 'theme'>) => (
  <Text theme="body" fontFamily="inter" weight="regular" {...props} />
);

export const ButtonText = (props: Omit<TextProps, 'theme'>) => (
  <Text theme="button" fontFamily="inter" weight="semiBold" color="#FFFFFF" {...props} />
);

export const Caption = (props: Omit<TextProps, 'theme'>) => (
  <Text theme="caption" fontFamily="inter" weight="light" {...props} />
);

export const Price = (props: Omit<TextProps, 'theme'>) => (
  <Text theme="price" fontFamily="inter" weight="bold" color="#FF7E8B" {...props} />
);

export const Display = (props: Omit<TextProps, 'theme'>) => (
  <Text theme="display" fontFamily="poppins" weight="bold" {...props} />
);

// Zomato-inspired styles
export const TextStyles = StyleSheet.create({
  // Headers
  h1: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#1F2937',
    lineHeight: 34,
  },
  h2: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    color: '#1F2937',
    lineHeight: 30,
  },
  h3: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    color: '#374151',
    lineHeight: 26,
  },
  
  // Body
  bodyLarge: {
    fontFamily: 'Inter-Regular',
    fontSize: 17,
    color: '#4B5563',
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  
  // Special
  priceLarge: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    color: '#FF7E8B',
  },
  price: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FF7E8B',
  },
  
  // Labels
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Buttons
  buttonPrimary: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  buttonSecondary: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#FF7E8B',
    textAlign: 'center',
  },
  
  // Captions
  caption: {
    fontFamily: 'Inter-Light',
    fontSize: 12,
    color: '#9CA3AF',
  },
});

// Usage examples in your components:
/*
import { Text, Heading, Body, Price, Caption } from '../components/global/Text';

// Simple usage
<Heading>Restaurant Name</Heading>
<Body>Delicious food served fresh daily</Body>
<Price>₹299</Price>
<Caption>30-40 min • 4.2 ★</Caption>

// Custom usage
<Text theme="body" fontFamily="inter" weight="medium" size="large">
  Custom text
</Text>
*/

export default Text;