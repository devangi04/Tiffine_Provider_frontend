import React from "react";
import { View, StyleSheet, StatusBar } from "react-native";

interface ScreenWrapperProps {
  children: React.ReactNode;
  dimOverlay?: boolean; // when true → darkens everything incl. status bar
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, dimOverlay }) => {
  return (
    <View style={{ flex: 1 }}>
      {/* StatusBar setup */}
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* Actual screen content */}
      {children}

      {/* Dim overlay (covers status bar too) */}
      {dimOverlay && <View style={styles.overlay} />}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)", // semi-transparent dim
  },
});

export default ScreenWrapper;
