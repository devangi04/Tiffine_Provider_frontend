import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Platform,
  StatusBar,
  Text as RNText,
  ViewStyle,
} from 'react-native';
import Text from '@/components/ztext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface CoachMarkStep {
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
  style?: ViewStyle;
}

interface CoachMarkProps {
  visible: boolean;
  steps: CoachMarkStep[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onComplete: () => void;
  skipable?: boolean;
  overlayColor?: string;
  spotlightColor?: string;
}

const CoachMark = ({
  visible,
  steps,
  currentStep,
  onNext,
  onBack,
  onSkip,
  onComplete,
  skipable = true,
  overlayColor = 'rgba(0, 0, 0, 0.85)',
  spotlightColor = '#FFFFFF',
}: CoachMarkProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      slideAnim.setValue(20);
    }
  }, [visible]);

  if (!visible || currentStep >= steps.length) return null;

  const currentStepData = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Calculate tooltip position based on target
  const getTooltipPosition = () => {
    const { target, position = 'bottom', arrowPosition = 'top' } = currentStepData;
    
    if (!target) {
      // Center the tooltip if no target
      return {
        top: height / 2 - 100,
        left: width / 2 - 140,
        arrowPosition: 'center',
        arrowStyle: {},
      };
    }

    const tooltipWidth = 280;
    const tooltipHeight = 180;
    const arrowSize = 12;
    const margin = 20;

    let top = target.y + target.height + margin;
    let left = target.x + target.width / 2 - tooltipWidth / 2;
    let arrowTop = -arrowSize;
    let arrowLeft = tooltipWidth / 2 - arrowSize;
    let arrowRotation = '0deg';
    let calculatedArrowPosition = 'top';

    // Adjust based on position
    switch (position) {
      case 'top':
        top = target.y - tooltipHeight - margin;
        arrowTop = tooltipHeight;
        calculatedArrowPosition = 'bottom';
        arrowRotation = '180deg';
        break;
      case 'left':
        top = target.y + target.height / 2 - tooltipHeight / 2;
        left = target.x - tooltipWidth - margin;
        arrowTop = tooltipHeight / 2 - arrowSize;
        arrowLeft = tooltipWidth;
        calculatedArrowPosition = 'right';
        arrowRotation = '90deg';
        break;
      case 'right':
        top = target.y + target.height / 2 - tooltipHeight / 2;
        left = target.x + target.width + margin;
        arrowTop = tooltipHeight / 2 - arrowSize;
        arrowLeft = -arrowSize * 2;
        calculatedArrowPosition = 'left';
        arrowRotation = '-90deg';
        break;
      case 'center':
        top = height / 2 - tooltipHeight / 2;
        left = width / 2 - tooltipWidth / 2;
        calculatedArrowPosition = 'center';
        break;
    }

    // Keep within screen bounds
    if (left < margin) left = margin;
    if (left + tooltipWidth > width - margin) left = width - tooltipWidth - margin;
    if (top < 100) top = 100;
    if (top + tooltipHeight > height - 100) top = height - tooltipHeight - 100;

    return {
      top,
      left,
      arrowTop,
      arrowLeft,
      arrowRotation,
      arrowPosition: arrowPosition === 'center' ? 'center' : calculatedArrowPosition,
    };
  };

  const tooltipPosition = getTooltipPosition();

  // Render arrow based on position
  const renderArrow = () => {
    if (tooltipPosition.arrowPosition === 'center') return null;

    return (
      <View
        style={[
          styles.arrow,
          {
            top: tooltipPosition.arrowTop,
            left: tooltipPosition.arrowLeft,
            transform: [{ rotate: tooltipPosition.arrowRotation }],
          },
        ]}
      >
        <View style={styles.arrowInner} />
      </View>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onSkip}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0, 0, 0, 0.9)" barStyle="light-content" />
      
      <View style={styles.container}>
        {/* Overlay */}
        <Animated.View
          style={[
            styles.overlay,
            {
              backgroundColor: overlayColor,
              opacity: fadeAnim,
            },
          ]}
        />

        {/* Spotlight for target element */}
        {currentStepData.target && (
          <View style={styles.spotlightContainer}>
            <Animated.View
              style={[
                styles.spotlight,
                {
                  top: currentStepData.target.y,
                  left: currentStepData.target.x,
                  width: currentStepData.target.width,
                  height: currentStepData.target.height,
                  borderRadius: currentStepData.spotlightRadius || 
                    Math.min(currentStepData.target.width, currentStepData.target.height) / 2,
                  borderColor: spotlightColor,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            />
          </View>
        )}

        {/* Tooltip */}
        <Animated.View
          style={[
            styles.tooltip,
            {
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          {renderArrow()}
          
          <View style={styles.tooltipContent}>
            {/* Header */}
            <View style={styles.tooltipHeader}>
              <View style={styles.stepIndicator}>
                <Text weight="semiBold" style={styles.stepText}>
                  {currentStep + 1}/{steps.length}
                </Text>
              </View>
              {skipable && (
                <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Title */}
            <Text weight="bold" style={styles.tooltipTitle}>
              {currentStepData.title}
            </Text>
            
            {/* Description */}
            <Text style={styles.tooltipDescription}>
              {currentStepData.description}
            </Text>
            
            {/* Action Buttons */}
            <View style={styles.tooltipActions}>
              {!isFirstStep && (
                <TouchableOpacity 
                  onPress={onBack} 
                  style={styles.secondaryButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color="#2c95f8" />
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              
              <View style={styles.spacer} />
              
              <TouchableOpacity
                onPress={isLastStep ? onComplete : onNext}
                style={styles.primaryButton}
                activeOpacity={0.7}
              >
                <Text weight="semiBold" style={styles.primaryButtonText}>
                  {isLastStep ? 'Got it!' : 'Next'}
                </Text>
                <Ionicons
                  name={isLastStep ? 'checkmark' : 'arrow-forward'}
                  size={20}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
            
            {/* Progress Dots */}
            <View style={styles.progressContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep 
                      ? styles.activeProgressDot 
                      : index < currentStep 
                      ? styles.completedProgressDot 
                      : styles.inactiveProgressDot,
                  ]}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlightContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  spotlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  tooltip: {
    position: 'absolute',
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  arrow: {
    position: 'absolute',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowInner: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  tooltipContent: {
    flex: 1,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIndicator: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontSize: 12,
    color: '#6B7280',
  },
  skipButton: {
    padding: 4,
  },
  tooltipTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 24,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  tooltipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    color: '#2c95f8',
    fontWeight: '500',
  },
  spacer: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#2c95f8',
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2c95f8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeProgressDot: {
    backgroundColor: '#2c95f8',
    width: 24,
  },
  completedProgressDot: {
    backgroundColor: '#10B981',
  },
  inactiveProgressDot: {
    backgroundColor: '#E5E7EB',
  },
});

export default CoachMark;