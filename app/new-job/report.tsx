import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, storage } from '@/lib/firebase';
import { Job } from '@/types';
import { exportPdf } from '@/lib/pdfExport';

export default function ReportScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [narrative, setNarrative] = useState('');
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadJob();
  }, []);

  async function loadJob() {
    const snap = await getDoc(doc(db, 'jobs', jobId));
    if (!snap.exists()) return;
    const data = { id: snap.id, ...snap.data() } as Job;
    setJob(data);
    setNarrative(data.report?.editedNarrative ?? data.report?.narrative ?? '');
  }

  async function handleGenerate() {
    if (!job) return;
    setGenerating(true);
    try {
      const functions = getFunctions();
      const generateReport = httpsCallable<{ jobId: string }, { narrative: string }>(functions, 'generateReport');
      const res = await generateReport({ jobId });
      const newNarrative = res.data.narrative;
      setNarrative(newNarrative);

      await updateDoc(doc(db, 'jobs', jobId), {
        'report.narrative': newNarrative,
        'report.generatedAt': serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await loadJob();
    } catch (err: any) {
      Alert.alert('Generation Failed', err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveEdits() {
    if (!job) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        'report.editedNarrative': narrative,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      Alert.alert('Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    if (!job) return;
    setExporting(true);
    try {
      const updatedJob: Job = {
        ...job,
        report: {
          ...job.report!,
          editedNarrative: narrative,
        },
      };
      const blob = await exportPdf(updatedJob);
      const storageRef = ref(storage, `jobs/${jobId}/report.pdf`);
      await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });
      const pdfUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'jobs', jobId), {
        'report.pdfUrl': pdfUrl,
        updatedAt: serverTimestamp(),
      });

      window.open(pdfUrl, '_blank');
    } catch (err: any) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setExporting(false);
    }
  }

  async function handleFinish() {
    await updateDoc(doc(db, 'jobs', jobId), {
      status: 'complete',
      updatedAt: serverTimestamp(),
    });
    router.replace('/(tabs)/history');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Step 4 — Report</Text>

      <TouchableOpacity style={styles.generateButton} onPress={handleGenerate} disabled={generating}>
        {generating ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator color="#fff" />
            <Text style={[styles.generateButtonText, { marginTop: 4 }]}>Generating narrative...</Text>
          </View>
        ) : (
          <Text style={styles.generateButtonText}>
            {narrative ? 'Regenerate Report' : 'Generate Report'}
          </Text>
        )}
      </TouchableOpacity>

      {narrative ? (
        <>
          <Text style={styles.sectionTitle}>Repair Justification Narrative</Text>
          <Text style={styles.charCount}>{narrative.length} characters</Text>
          <TextInput
            style={styles.narrativeInput}
            value={narrative}
            onChangeText={setNarrative}
            multiline
            textAlignVertical="top"
            placeholder="Narrative will appear here after generation..."
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveEdits} disabled={saving}>
              {saving ? <ActivityIndicator color="#1a56db" /> : <Text style={styles.secondaryButtonText}>Save Edits</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.pdfButton} onPress={handleExportPdf} disabled={exporting}>
              {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.pdfButtonText}>Export PDF</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
            <Text style={styles.finishButtonText}>Finish Job ✓</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Click "Generate Report" to create an AI-written repair justification narrative based on your damage assessments.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a56db', marginBottom: 20 },
  generateButton: {
    backgroundColor: '#1a56db', borderRadius: 8,
    padding: 14, alignItems: 'center', marginBottom: 20,
  },
  generateButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 4 },
  charCount: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  narrativeInput: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, fontSize: 14, minHeight: 300, lineHeight: 22,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryButton: {
    flex: 1, borderWidth: 1, borderColor: '#1a56db',
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  secondaryButtonText: { color: '#1a56db', fontWeight: '600' },
  pdfButton: {
    flex: 1, backgroundColor: '#059669',
    borderRadius: 8, padding: 12, alignItems: 'center',
  },
  pdfButtonText: { color: '#fff', fontWeight: '600' },
  finishButton: {
    backgroundColor: '#374151', borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  finishButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  placeholder: {
    backgroundColor: '#f9fafb', borderRadius: 8, padding: 20,
    alignItems: 'center', justifyContent: 'center', minHeight: 200,
  },
  placeholderText: { color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
