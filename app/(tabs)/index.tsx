import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tech-Assist</Text>
        <Text style={styles.greeting}>Welcome{user?.displayName ? `, ${user.displayName}` : ''}</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/new-job/vin-scan')}>
        <Text style={styles.primaryButtonText}>+ New Job</Text>
        <Text style={styles.primaryButtonSub}>Scan VIN and start damage analysis</Text>
      </TouchableOpacity>

      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/history')}>
          <Text style={styles.cardTitle}>Job History</Text>
          <Text style={styles.cardSub}>View past jobs and reports</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  content: { padding: 24 },
  header: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a56db' },
  greeting: { fontSize: 16, color: '#555', marginTop: 4 },
  primaryButton: {
    backgroundColor: '#1a56db', borderRadius: 12,
    padding: 20, marginBottom: 20,
  },
  primaryButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  primaryButtonSub: { color: '#c3d7f9', fontSize: 13, marginTop: 4 },
  quickLinks: { gap: 12, marginBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 10,
    padding: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  signOutButton: { alignSelf: 'center' },
  signOutText: { color: '#ef4444', fontSize: 14 },
});
