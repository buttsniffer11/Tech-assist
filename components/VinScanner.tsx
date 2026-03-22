import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

export default function VinScanner({ onScan }: VinScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    BarCodeScanner.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  // Web: no camera scanner — parent uses manual text input fallback
  if (Platform.OS === 'web') return null;

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera access denied. Use manual entry below.</Text>
      </View>
    );
  }

  function handleBarCodeScanned({ data }: BarCodeScannerResult) {
    if (scanned) return;
    setScanned(true);
    onScan(data.toUpperCase());
  }

  return (
    <View style={styles.container}>
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        barCodeTypes={[BarCodeScanner.Constants.BarCodeType.code39, BarCodeScanner.Constants.BarCodeType.code128]}
        style={styles.scanner}
      />
      <View style={styles.overlay}>
        <View style={styles.scanLine} />
      </View>
      <Text style={styles.hint}>Align barcode with the frame</Text>
      {scanned && (
        <Text style={styles.scannedText} onPress={() => setScanned(false)}>
          Tap to scan again
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 200, borderRadius: 10, overflow: 'hidden', marginBottom: 12, backgroundColor: '#000' },
  scanner: { flex: 1 },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  scanLine: {
    width: '80%', height: 2,
    backgroundColor: '#1a56db', opacity: 0.8,
  },
  message: { color: '#fff', textAlign: 'center', padding: 16 },
  hint: {
    position: 'absolute', bottom: 8,
    width: '100%', textAlign: 'center', color: '#fff', fontSize: 12,
  },
  scannedText: {
    position: 'absolute', top: 8,
    width: '100%', textAlign: 'center', color: '#93c5fd', fontSize: 13,
  },
});
