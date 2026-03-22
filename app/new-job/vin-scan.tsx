import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { decodeVin, validateVin } from '@/lib/vinDecoder';
import VinScanner from '@/components/VinScanner';
import { VehicleData } from '@/types';

export default function VinScanScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [vin, setVin] = useState('');
  const [vehicle, setVehicle] = useState<Partial<VehicleData> | null>(null);
  const [paintCode, setPaintCode] = useState('');
  const [paintStages, setPaintStages] = useState<1 | 2 | 3>(1);
  const [decoding, setDecoding] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleDecode(scannedVin?: string) {
    const vinToUse = scannedVin ?? vin;
    if (!validateVin(vinToUse)) {
      Alert.alert('Invalid VIN', 'VIN must be exactly 17 alphanumeric characters (no I, O, or Q).');
      return;
    }
    setDecoding(true);
    try {
      const decoded = await decodeVin(vinToUse);
      setVehicle(decoded);
      if (scannedVin) setVin(scannedVin);
    } catch (err: any) {
      Alert.alert('Decode Failed', err.message);
    } finally {
      setDecoding(false);
    }
  }

  async function handleStartJob() {
    if (!vehicle || !user) return;
    if (!paintCode.trim()) {
      Alert.alert('Paint Code Required', 'Please enter the paint code.');
      return;
    }
    setSaving(true);
    try {
      const fullVehicle: VehicleData = {
        ...(vehicle as VehicleData),
        paintCode: paintCode.trim().toUpperCase(),
        paintStages,
      };
      const docRef = await addDoc(collection(db, 'jobs'), {
        technicianId: user.uid,
        status: 'in_progress',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        vehicle: fullVehicle,
        exteriorPhotos: {},
        damagedPanels: [],
      });
      router.push(`/new-job/exterior-sweep?jobId=${docRef.id}`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Step 1 — Scan VIN</Text>

      <VinScanner onScan={(scannedVin) => handleDecode(scannedVin)} />

      <Text style={styles.orText}>— or enter manually —</Text>

      <TextInput
        style={styles.input}
        placeholder="17-character VIN"
        value={vin}
        onChangeText={(t) => setVin(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={17}
      />
      <TouchableOpacity style={styles.button} onPress={() => handleDecode()} disabled={decoding}>
        {decoding ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Decode VIN</Text>}
      </TouchableOpacity>

      {vehicle && (
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleTitle}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
          <Text style={styles.vehicleMeta}>Body: {vehicle.bodyStyle}</Text>
          <Text style={styles.vehicleMeta}>VIN: {vehicle.vin}</Text>

          <TextInput
            style={[styles.input, { marginTop: 16 }]}
            placeholder="Paint Code (e.g. WA8624)"
            value={paintCode}
            onChangeText={setPaintCode}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Paint Stages</Text>
          <View style={styles.stageRow}>
            {([1, 2, 3] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.stageButton, paintStages === s && styles.stageButtonActive]}
                onPress={() => setPaintStages(s)}
              >
                <Text style={[styles.stageText, paintStages === s && styles.stageTextActive]}>{s}-Stage</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={handleStartJob} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start Exterior Sweep →</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a56db', marginBottom: 20 },
  orText: { textAlign: 'center', color: '#9ca3af', marginVertical: 12 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, marginBottom: 12, fontSize: 16,
  },
  button: {
    backgroundColor: '#1a56db', borderRadius: 8,
    padding: 14, alignItems: 'center', marginBottom: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  vehicleCard: {
    backgroundColor: '#f7f9fc', borderRadius: 10,
    padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb',
  },
  vehicleTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 },
  vehicleMeta: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 8 },
  stageRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  stageButton: {
    flex: 1, borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  stageButtonActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  stageText: { color: '#6b7280', fontWeight: '500' },
  stageTextActive: { color: '#1a56db' },
});
