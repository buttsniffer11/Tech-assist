import { DamagedPanel, VehicleData } from '@/types';

export function buildReportPrompt(vehicle: VehicleData, panels: DamagedPanel[]): string {
  const vehicleSummary = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.bodyStyle}) — VIN: ${vehicle.vin}, Paint Code: ${vehicle.paintCode}, Paint Stages: ${vehicle.paintStages}`;

  const panelSummaries = panels
    .map((p) => {
      const a = p.assessment;
      return `Panel: ${p.panelId}
  - Dent Depth: ${a.dentDepth}
  - Dent Type: ${a.dentType}
  - Body Lines Affected: ${a.bodyLines.length > 0 ? a.bodyLines.join(', ') : 'none detected'}
  - Feather Edge Area: ${a.featherEdgeArea} sq in
  - Blend Area: ${a.blendArea} sq in
  - 3-Stage Paint Impact: ${a.paintStageImpact ? 'yes' : 'no'}`;
    })
    .join('\n\n');

  return `You are a certified I-CAR estimator writing a repair justification report for an insurance adjuster.

Vehicle: ${vehicleSummary}

Damaged Panels:
${panelSummaries}

Write a professional repair justification that:
1. Describes the damage on each panel clearly and objectively
2. Cites relevant I-CAR procedures (e.g., edge-to-edge paint, adjacent panel blend requirements)
3. Justifies feather edge and blend area requirements based on damage severity and paint stage count
4. Notes R&I (remove and install) time requirements for any panels requiring panel removal
5. Explains 3-stage paint complexity and additional time for metallic/pearl finishes if applicable
6. Does NOT inflate or exaggerate — all justifications must be grounded in the assessment data above

Write in clear, professional prose. Do not use bullet points. The report will be read by an insurance adjuster.`;
}
