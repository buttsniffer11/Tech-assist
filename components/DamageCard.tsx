import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { DamagedPanel, DentDepth, DentType } from '@/types';

interface DamageCardProps {
  panel: DamagedPanel;
  onUpdate?: (panelId: string, updated: DamagedPanel) => void;
  readOnly?: boolean;
}

const DEPTH_COLORS: Record<DentDepth, string> = {
  shallow: '#d1fae5',
  medium: '#fef3c7',
  deep: '#fee2e2',
};

const DEPTH_TEXT_COLORS: Record<DentDepth, string> = {
  shallow: '#065f46',
  medium: '#92400e',
  deep: '#991b1b',
};

export default function DamageCard({ panel, onUpdate, readOnly = false }: DamageCardProps) {
  const [assessment, setAssessment] = useState(panel.assessment);
  const [expanded, setExpanded] = useState(true);

  function update<K extends keyof typeof assessment>(key: K, value: (typeof assessment)[K]) {
    const updated = { ...assessment, [key]: value };
    setAssessment(updated);
    onUpdate?.(panel.panelId, { ...panel, assessment: updated });
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.panelTitle}>{panel.panelId.replace(/_/g, ' ').toUpperCase()}</Text>
        <View style={[styles.depthBadge, { backgroundColor: DEPTH_COLORS[assessment.dentDepth] }]}>
          <Text style={[styles.depthBadgeText, { color: DEPTH_TEXT_COLORS[assessment.dentDepth] }]}>
            {assessment.dentDepth.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {panel.photoUrl ? (
            <Image source={{ uri: panel.photoUrl }} style={styles.photo} />
          ) : null}

          {/* Dent Depth */}
          <Text style={styles.fieldLabel}>Dent Depth</Text>
          {readOnly ? (
            <Text style={styles.readOnlyValue}>{assessment.dentDepth}</Text>
          ) : (
            <View style={styles.optionRow}>
              {(['shallow', 'medium', 'deep'] as DentDepth[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.option, assessment.dentDepth === d && styles.optionActive]}
                  onPress={() => update('dentDepth', d)}
                >
                  <Text style={[styles.optionText, assessment.dentDepth === d && styles.optionTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Dent Type */}
          <Text style={styles.fieldLabel}>Dent Type</Text>
          {readOnly ? (
            <Text style={styles.readOnlyValue}>{assessment.dentType}</Text>
          ) : (
            <View style={styles.optionRow}>
              {(['sharp', 'rolled'] as DentType[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.option, assessment.dentType === t && styles.optionActive]}
                  onPress={() => update('dentType', t)}
                >
                  <Text style={[styles.optionText, assessment.dentType === t && styles.optionTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Measurements */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Feather Edge</Text>
              <Text style={styles.metaValue}>{assessment.featherEdgeArea} sq in</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Blend Area</Text>
              <Text style={styles.metaValue}>{assessment.blendArea} sq in</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>3-Stage</Text>
              <Text style={styles.metaValue}>{assessment.paintStageImpact ? 'Yes' : 'No'}</Text>
            </View>
          </View>

          {assessment.bodyLines.length > 0 && (
            <Text style={styles.bodyLines}>Body lines: {assessment.bodyLines.join(', ')}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 12, backgroundColor: '#f9fafb',
  },
  panelTitle: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  depthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  depthBadgeText: { fontSize: 11, fontWeight: '700' },
  body: { padding: 12 },
  photo: { width: '100%', height: 160, borderRadius: 8, marginBottom: 12, resizeMode: 'cover' },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 6, marginTop: 8 },
  readOnlyValue: { fontSize: 14, color: '#374151', marginBottom: 4 },
  optionRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  option: {
    borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
  },
  optionActive: { borderColor: '#1a56db', backgroundColor: '#eff6ff' },
  optionText: { color: '#6b7280', fontSize: 13 },
  optionTextActive: { color: '#1a56db', fontWeight: '600' },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  metaItem: {
    flex: 1, backgroundColor: '#f3f4f6',
    borderRadius: 8, padding: 10, alignItems: 'center',
  },
  metaLabel: { fontSize: 10, color: '#6b7280', marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  bodyLines: { fontSize: 12, color: '#6b7280', marginTop: 8, fontStyle: 'italic' },
});
