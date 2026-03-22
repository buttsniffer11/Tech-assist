import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView } from 'react-native';

interface ReportPreviewProps {
  narrative: string;
  onEdit: (text: string) => void;
  readOnly?: boolean;
}

export default function ReportPreview({ narrative, onEdit, readOnly = false }: ReportPreviewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Repair Justification Narrative</Text>
        <Text style={styles.charCount}>{narrative.length} characters</Text>
      </View>

      {readOnly ? (
        <ScrollView style={styles.readOnlyScroll}>
          <Text style={styles.readOnlyText}>{narrative}</Text>
        </ScrollView>
      ) : (
        <TextInput
          style={styles.input}
          value={narrative}
          onChangeText={onEdit}
          multiline
          textAlignVertical="top"
          placeholder="Narrative will appear here after generation..."
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 15, fontWeight: '600', color: '#111' },
  charCount: { fontSize: 12, color: '#9ca3af' },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    padding: 12, fontSize: 14, minHeight: 300, lineHeight: 22,
  },
  readOnlyScroll: { maxHeight: 400 },
  readOnlyText: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
