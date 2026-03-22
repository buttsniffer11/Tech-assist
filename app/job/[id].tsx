import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Job } from '@/types';
import { exportPdf } from '@/lib/pdfExport';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import DamageCard from '@/components/DamageCard';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'jobs', id)).then((snap) => {
      if (snap.exists()) setJob({ id: snap.id, ...snap.data() } as Job);
      setLoading(false);
    });
  }, [id]);

  async function handleExportPdf() {
    if (!job) return;
    setExporting(true);
    try {
      const blob = await exportPdf(job);
      const storageRef = ref(storage, `jobs/${id}/report.pdf`);
      await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
      const pdfUrl = await getDownloadURL(storageRef);
      window.open(pdfUrl, '_blank');
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a56db" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text>Job not found.</Text>
      </View>
    );
  }

  const narrative = job.report?.editedNarrative ?? job.report?.narrative ?? '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Vehicle Header */}
      <Text style={styles.vehicleTitle}>
        {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
      </Text>
      <Text style={styles.meta}>VIN: {job.vehicle.vin}</Text>
      <Text style={styles.meta}>Paint Code: {job.vehicle.paintCode} — {job.vehicle.paintStages}-Stage</Text>

      {/* Exterior Photos */}
      {Object.values(job.exteriorPhotos).some(Boolean) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exterior Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoRow}>
              {Object.entries(job.exteriorPhotos)
                .filter(([, url]) => !!url)
                .map(([pos, url]) => (
                  <View key={pos} style={styles.photoItem}>
                    <Image source={{ uri: url! }} style={styles.photo} />
                    <Text style={styles.photoLabel}>{pos.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  </View>
                ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Damaged Panels */}
      {job.damagedPanels.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Damage Assessment</Text>
          {job.damagedPanels.map((panel) => (
            <DamageCard key={panel.panelId} panel={panel} readOnly />
          ))}
        </View>
      )}

      {/* Narrative */}
      {narrative ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Repair Justification</Text>
          <Text style={styles.narrative}>{narrative}</Text>
        </View>
      ) : null}

      {/* Export */}
      <TouchableOpacity style={styles.exportButton} onPress={handleExportPdf} disabled={exporting}>
        {exporting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.exportButtonText}>Export PDF</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  vehicleTitle: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 4 },
  meta: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a56db', marginBottom: 12 },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoItem: { alignItems: 'center' },
  photo: { width: 120, height: 90, borderRadius: 8, resizeMode: 'cover' },
  photoLabel: { fontSize: 10, color: '#6b7280', marginTop: 4, textTransform: 'capitalize' },
  narrative: { fontSize: 14, color: '#374151', lineHeight: 22 },
  exportButton: {
    backgroundColor: '#059669', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 24,
  },
  exportButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
