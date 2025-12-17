// components/mainlayout.tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Header from './header';
import BottomNavBar from './navbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  showUserButton?: boolean;
  onBackPress?: () => void;
  onUserPress?: () => void;
  backgroundColor?: string;
  textColor?: string;
  subtitleColor?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  title,
  subtitle,
  showBackButton = true,
  showUserButton = true,
  onBackPress,
  onUserPress,
  backgroundColor = '#2c95f8',
  textColor = '#fff',
  subtitleColor = 'rgba(255, 255, 255, 0.8)',
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <Header
          title={title}
          subtitle={subtitle}
          showBackButton={showBackButton}
          showUserButton={showUserButton}
          onBackPress={onBackPress}
          onUserPress={onUserPress}
          backgroundColor={backgroundColor}
          textColor={textColor}
          subtitleColor={subtitleColor}
        />
      </View>

      {/* Scrollable Content - positioned between header and navbar */}
      <View style={styles.contentWrapper}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>

      {/* Fixed Bottom NavBar */}
      <View style={styles.navbarWrapper}>
        <BottomNavBar insets={insets} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  contentWrapper: {
    flex: 1,
    marginTop: 120, // Height of your header
    marginBottom: 70, // Height of your navbar
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  navbarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default MainLayout;