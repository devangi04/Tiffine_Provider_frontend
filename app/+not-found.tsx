import { Link, Stack } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Help and support' }} />
      <View style={styles.container}>
        {/* Icon Container */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <View style={styles.documentIcon}>
              <View style={styles.docLines} />
              <View style={styles.docLines} />
              <View style={styles.docLines} />
            </View>
            <View style={styles.errorBadge}>
              <Text style={styles.errorX}>✕</Text>
            </View>
          </View>
        </View>

        {/* Error Message */}
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>
          The page you were looking for does not exist.
        </Text>

        {/* Return Button */}
        <Link href="/dashboard" asChild>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Return</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  documentIcon: {
    width: 48,
    height: 56,
    backgroundColor: '#FFF',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#6B7280',
    padding: 8,
    justifyContent: 'center',
  },
  docLines: {
    height: 2,
    backgroundColor: '#6B7280',
    marginVertical: 3,
    width: '80%',
  },
  errorBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F5F5F5',
  },
  errorX: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#0EA5E9',
    paddingHorizontal: 64,
    paddingVertical: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});