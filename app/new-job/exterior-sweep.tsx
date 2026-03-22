import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { ExteriorPhotos } from '@/types';
import PanelGuide from '@/components/PanelGuide';

const PANELS: { id: keyof ExteriorPhotos; label: string; instruction: string }[] = [
  { id: 'front', label: 'Front', instruction: 'Stand 8–10 ft directly in front of the vehicle.' },
  { id: 'driverFrontQuarter', label: 'Driver Front Quarter', instruction: 'Stand at the driver-side front corner at 45°.' },
  { id: 'driverSide', label: 'Driver Side', instruction: 'Stand 10 ft away, centered on the driver side.' },
  { id: 'driverRearQuarter', label: 'Driver Rear Quarter', instruction: 'Stand at the driver-side rear corner at 45°.' },
  { id: 'rear', label: 'Rear', instruction: 'Stand 8–10 ft directly behind the vehicle.' },
  { id: 'passengerFrontQuarter', label: 'Passenger Front Quarter', instruction: 'Stand at the passenger-side front corner at 45°.' },
  { id: 'passengerSide', label: 'Passenger Side', instruction: 'Stand 10 ft away, centered on the passenger side.' },
  { id: 'passengerRearQuarter', label: 'Passenger Rear Quarter', instruction: 'Stand at the passenger-side rear corner at 45°.' },
];

export default function ExteriorSweepScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Partial<ExteriorPhotos>>({});
  const [uploading, setUploading] = useState(false);

  const currentPanel = PANELS[step];

  async function capturePhoto() {
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

      const response = await fetch(compressed.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `jobs/${jobId}/exterior/${currentPanel.id}.jpg`);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);

      const newPhotos = { ...photos, [currentPanel.id]: url };
      setPhotos(newPhotos);

      await updateDoc(doc(db, 'jobs', jobId), {
        [`exteriorPhotos.${currentPanel.id}`]: url,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleNext() {
    if (!photos[currentPanel.id]) {
      Alert.alert('Photo Required', 'Please take a photo before continuing.');
      return;
    }
    if (step < PANELS.length - 1) {
      setStep(step + 1);
    } else {
      router.push(`/new-job/damage-analysis?jobId=${jobId}`);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Step 2 — Exterior Sweep</Text>
      <Text style={styles.progress}>{step + 1} of {PANELS.length}</Text>

      <PanelGuide activePanelId={currentPanel.id} />

      <View style={styles.panelInfo}>
        <Text style={styles.panelLabel}>{currentPanel.label}</Text>
        <Text style={styles.instruction}>{currentPanel.instruction}</Text>
      </View>

      {photos[currentPanel.id] ? (
        <Image source={{ uri: photos[currentPanel.id] }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No photo taken yet</Text>
        </View>
      )}

      <TouchableOpacity style={styles.cameraButton} onPress={capturePhoto} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.cameraButtonText}>
            {photos[currentPanel.id] ? 'Retake Photo' : 'Take Photo'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={uploading}>
        <Text style={styles.nextButtonText}>
          {step < PANELS.length - 1 ? 'Next Panel →' : 'Continue to Damage Analysis →'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a56db', marginBottom: 4 },
  progress: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  panelInfo: { marginBottom: 16 },
  panelLabel: { fontSize: 18, fontWeight: '600', color: '#111', marginBottom: 4 },
  instruction: { fontSize: 14, color: '#555', lineHeight: 20 },
  preview: { width: '100%', height: 220, borderRadius: 10, marginBottom: 12, resizeMode: 'cover' },
  placeholder: {
    width: '100%', height: 220, backgroundColor: '#f3f4f6', borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  placeholderText: { color: '#9ca3af' },
  cameraButton: {
    backgroundColor: '#374151', borderRadius: 8,
    padding: 14, alignItems: 'center', marginBottom: 10,
  },
  cameraButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  nextButton: {
    backgroundColor: '#1a56db', borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
