import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { storage, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { DamagedPanel, VehicleData } from '@/types';
import DamageCard from '@/components/DamageCard';

const PANEL_OPTIONS = [
  'Hood', 'Roof', 'Trunk', 'Front Bumper', 'Rear Bumper',
  'Driver Door (Front)', 'Driver Door (Rear)', 'Passenger Door (Front)', 'Passenger Door (Rear)',
  'Driver Fender', 'Passenger Fender',
  'Driver Quarter Panel', 'Passenger Quarter Panel',
  'Driver Rocker', 'Passenger Rocker',
];

export default function DamageAnalysisScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [currentPanelIdx, setCurrentPanelIdx] = useState(-1);
  const [analyzedPanels, setAnalyzedPanels] = useState<DamagedPanel[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  function togglePanel(panel: string) {
    setSelectedPanels((prev) =>
      prev.includes(panel) ? prev.filter((p) => p !== panel) : [...prev, panel]
    );
  }

  async function captureAndAnalyze(panelId: string) {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      const blob = await (await fetch(compressed.uri)).blob();
      const panelKey = panelId.replace(/\s+/g, '_').toLowerCase();
      const storageRef = ref(storage, `jobs/${jobId}/panels/${panelKey}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const photoUrl = await getDownloadURL(storageRef);

      setUploading(false);
      setAnalyzing(true);

      const jobSnap = await getDoc(doc(db, 'jobs', jobId));
      const vehicle = jobSnap.data()?.vehicle as VehicleData;

      const functions = getFunctions();
      const analyzePanel = httpsCallable<{ photoUrl: string; panelId: string; vehicle: VehicleData }, DamagedPanel>(
        functions, 'analyzePanel'
      );
      const res = await analyzePanel({ photoUrl, panelId: panelKey, vehicle });
      const damagedPanel = res.data;

      setAnalyzedPanels((prev) => [...prev, damagedPanel]);

      await updateDoc(doc(db, 'jobs', jobId), {
        damagedPanels: arrayUnion(damagedPanel),
        updatedAt: serverTimestamp(),
      });

      setCurrentPanelIdx((prev) => prev + 1);
    } catch (err: any) {
      Alert.alert('Analysis Failed', err.message);
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  }

  function updateAssessment(panelId: string, updated: DamagedPanel) {
    setAnalyzedPanels((prev) => prev.map((p) => (p.panelId === panelId ? updated : p)));
  }

  async function handleGenerateReport() {
    if (analyzedPanels.length === 0) {
      Alert.alert('No Panels', 'Analyze at least one damaged panel before generating the report.');
      return;
    }
    router.push(`/new-job/report?jobId=${jobId}`);
  }

  if (currentPanelIdx === -1) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Step 3 — Select Damaged Panels</Text>
        <Text style={styles.subtitle}>Tap all panels with visible damage</Text>

        {PANEL_OPTIONS.map((panel) => (
          <TouchableOpacity
            key={panel}
            style={[styles.panelOption, selectedPanels.includes(panel) && styles.panelOptionSelected]}
            onPress={() => togglePanel(panel)}
          >
            <Text style={[styles.panelOptionText, selectedPanels.includes(panel) && styles.panelOptionTextSelected]}>
              {panel}
            </Text>
          </TouchableOpacity>
        ))}

        {selectedPanels.length > 0 && (
          <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={() => setCurrentPanelIdx(0)}>
            <Text style={styles.buttonText}>Photograph Damage ({selectedPanels.length} panels) →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  const activePanelId = selectedPanels[currentPanelIdx];
  const panelDone = analyzedPanels.some((p) => p.panelId === activePanelId?.replace(/\s+/g, '_').toLowerCase());
  const allDone = currentPanelIdx >= selectedPanels.length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Step 3 — Damage Analysis</Text>
      <Text style={styles.progress}>Panel {currentPanelIdx + 1} of {selectedPanels.length}</Text>

      {!allDone && (
        <>
          <Text style={styles.panelLabel}>{activePanelId}</Text>
          <Text style={styles.instruction}>Take a close-up photo of the damage on this panel.</Text>

          <TouchableOpacity style={styles.cameraButton} onPress={() => captureAndAnalyze(activePanelId)} disabled={uploading || analyzing}>
            {uploading || analyzing ? (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.cameraButtonText, { marginTop: 4 }]}>
                  {uploading ? 'Uploading...' : 'Analyzing with AI...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.cameraButtonText}>{panelDone ? 'Retake Photo' : 'Take Photo of Damage'}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {analyzedPanels.map((panel) => (
        <DamageCard key={panel.panelId} panel={panel} onUpdate={updateAssessment} />
      ))}

      {allDone && (
        <TouchableOpacity style={styles.button} onPress={handleGenerateReport}>
          <Text style={styles.buttonText}>Generate Report →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a56db', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  progress: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  panelOption: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  panelOptionSelected: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  panelOptionText: { color: '#374151', fontSize: 15 },
  panelOptionTextSelected: { color: '#1a56db', fontWeight: '600' },
  panelLabel: { fontSize: 18, fontWeight: '600', color: '#111', marginBottom: 6 },
  instruction: { fontSize: 14, color: '#555', marginBottom: 16 },
  cameraButton: {
    backgroundColor: '#374151', borderRadius: 8,
    padding: 16, alignItems: 'center', marginBottom: 12,
  },
  cameraButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  button: {
    backgroundColor: '#1a56db', borderRadius: 8,
    padding: 14, alignItems: 'center', marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
