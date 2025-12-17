import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  placeholder?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done' | 'go' | 'send';
  inputRef?: React.RefObject<TextInput>;
  editable?: boolean;
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
  showPasswordToggle = false,
  onTogglePassword,
  maxLength,
  autoCapitalize = 'none',
  autoCorrect = false,
  placeholder,
  onSubmitEditing,
  returnKeyType = 'next',
  inputRef,
  editable = true
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: (isFocused || value) ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [animatedValue, isFocused, value]);

  const labelStyle = {
    position: 'absolute' as const,
    left: 20,
    top: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [20, -10],
    }),
    fontSize: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 13],
    }),
    color: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#9CA3AF', '#007AFF'],
    }),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    fontWeight: '500' as const,
    zIndex: 1,
  };

  const containerStyle = {
    borderColor: animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['#E5E7EB', '#007AFF'],
    }),
  };

  return (
    <View style={styles.floatingInputContainer}>
      <Animated.View style={[styles.floatingInputWrapper, containerStyle, !editable && styles.disabledInputWrapper]}>
        <Animated.Text style={labelStyle}>
          {label}
        </Animated.Text>
        <TextInput
          ref={inputRef}
          style={[
            styles.floatingInput,
            showPasswordToggle && styles.floatingInputWithIcon,
            !editable && styles.disabledInput
          ]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={onChangeText}
          value={value}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          placeholder={isFocused ? placeholder : ''}
          placeholderTextColor="#9CA3AF"
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          blurOnSubmit={false}
          editable={editable}
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            style={styles.floatingEyeIcon}
            onPress={onTogglePassword}
          >
            <Ionicons 
              name={secureTextEntry ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#999" 
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  floatingInputContainer: {
    marginBottom: 20,
  },
  floatingInputWrapper: {
    borderWidth: 1.5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    minHeight: 58,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  floatingInput: {
    fontSize: 16,
    color: '#1F2937',
    paddingHorizontal: 20,
    paddingVertical: 20,
    fontWeight: '400',
    minHeight: 58,
  },
  floatingInputWithIcon: {
    paddingRight: 50,
  },
  floatingEyeIcon: {
    position: 'absolute',
    right: 16,
    top: 19,
    padding: 4,
  },
  disabledInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  disabledInput: {
    color: '#6B7280',
  },
});

export default FloatingInput;