import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Ellipse, Text as SvgText, G } from 'react-native-svg';
import { ExteriorPhotos } from '@/types';

interface PanelGuideProps {
  activePanelId: keyof ExteriorPhotos;
}

interface PanelDef {
  id: keyof ExteriorPhotos;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

const PANELS: PanelDef[] = [
  { id: 'front', label: 'Front', x: 60, y: 10, width: 80, height: 30 },
  { id: 'rear', label: 'Rear', x: 60, y: 160, width: 80, height: 30 },
  { id: 'driverSide', label: 'Driver', x: 10, y: 70, width: 30, height: 60 },
  { id: 'passengerSide', label: 'Pass.', x: 160, y: 70, width: 30, height: 60 },
  { id: 'driverFrontQuarter', label: 'DFQ', x: 18, y: 22, width: 38, height: 38, rx: 6 },
  { id: 'passengerFrontQuarter', label: 'PFQ', x: 144, y: 22, width: 38, height: 38, rx: 6 },
  { id: 'driverRearQuarter', label: 'DRQ', x: 18, y: 140, width: 38, height: 38, rx: 6 },
  { id: 'passengerRearQuarter', label: 'PRQ', x: 144, y: 140, width: 38, height: 38, rx: 6 },
];

export default function PanelGuide({ activePanelId }: PanelGuideProps) {
  return (
    <View style={styles.container}>
      <Svg width="200" height="200" viewBox="0 0 200 200">
        {/* Vehicle body outline */}
        <Rect x="40" y="40" width="120" height="120" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5" />

        {PANELS.map((panel) => {
          const isActive = panel.id === activePanelId;
          return (
            <G key={panel.id}>
              <Rect
                x={panel.x}
                y={panel.y}
                width={panel.width}
                height={panel.height}
                rx={panel.rx ?? 4}
                fill={isActive ? '#1a56db' : '#d1d5db'}
                stroke={isActive ? '#1e40af' : '#9ca3af'}
                strokeWidth={isActive ? 2 : 1}
              />
              <SvgText
                x={panel.x + panel.width / 2}
                y={panel.y + panel.height / 2 + 4}
                textAnchor="middle"
                fill={isActive ? '#fff' : '#374151'}
                fontSize="8"
                fontWeight={isActive ? 'bold' : 'normal'}
              >
                {panel.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 12 },
});
