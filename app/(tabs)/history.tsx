import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, orderBy, limit, onSnapshot, startAfter, getDocs, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Job } from '@/types';

const PAGE_SIZE = 20;

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState<(Job & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'jobs'),
      where('technicianId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Job) }));
      setJobs(data);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (jobs.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No jobs yet. Start a new job from the dashboard.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={jobs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => router.push(`/job/${item.id}`)}>
          <View style={styles.cardHeader}>
            <Text style={styles.vehicleName}>
              {item.vehicle.year} {item.vehicle.make} {item.vehicle.model}
            </Text>
            <View style={[styles.badge, item.status === 'complete' ? styles.badgeComplete : styles.badgeInProgress]}>
              <Text style={styles.badgeText}>{item.status === 'complete' ? 'Complete' : 'In Progress'}</Text>
            </View>
          </View>
          <Text style={styles.meta}>VIN: {item.vehicle.vin}</Text>
          <Text style={styles.meta}>
            {item.createdAt?.toDate?.().toLocaleDateString() ?? '—'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/job/${item.id}`)}
            >
              <Text style={styles.actionText}>View Report</Text>
            </TouchableOpacity>
            {item.status === 'in_progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.continueButton]}
                onPress={() => router.push(`/new-job/damage-analysis?jobId=${item.id}`)}
              >
                <Text style={[styles.actionText, { color: '#fff' }]}>Continue</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#f7f9fc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#6b7280', textAlign: 'center', fontSize: 15 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  vehicleName: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeComplete: { backgroundColor: '#d1fae5' },
  badgeInProgress: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: {
    borderWidth: 1, borderColor: '#1a56db',
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
  },
  continueButton: { backgroundColor: '#1a56db' },
  actionText: { fontSize: 13, color: '#1a56db', fontWeight: '500' },
});
