import { DamageAssessment, DentDepth, DentType, VehicleData } from '@/types';

interface VisionLabel {
  description: string;
  score: number;
}

interface VisionAnnotation {
  labelAnnotations?: VisionLabel[];
  localizedObjectAnnotations?: Array<{ name: string; score: number }>;
  imagePropertiesAnnotation?: {
    dominantColors: {
      colors: Array<{ color: { red: number; green: number; blue: number }; score: number }>;
    };
  };
}

const DEEP_DENT_KEYWORDS = ['dent', 'crumple', 'buckle', 'wrinkle', 'collapse', 'deform'];
const MEDIUM_DENT_KEYWORDS = ['damage', 'scratch', 'gouge', 'abrasion', 'impact'];
const BODY_LINE_KEYWORDS = ['crease', 'ridge', 'feature line', 'body line', 'character line'];
const SHARP_DENT_KEYWORDS = ['sharp', 'crimp', 'fold', 'crease'];

function classifyDentDepth(labels: VisionLabel[]): DentDepth {
  const descriptions = labels.map((l) => l.description.toLowerCase());
  if (descriptions.some((d) => DEEP_DENT_KEYWORDS.some((k) => d.includes(k)))) return 'deep';
  if (descriptions.some((d) => MEDIUM_DENT_KEYWORDS.some((k) => d.includes(k)))) return 'medium';
  return 'shallow';
}

function classifyDentType(labels: VisionLabel[]): DentType {
  const descriptions = labels.map((l) => l.description.toLowerCase());
  if (descriptions.some((d) => SHARP_DENT_KEYWORDS.some((k) => d.includes(k)))) return 'sharp';
  return 'rolled';
}

function detectBodyLines(labels: VisionLabel[]): string[] {
  return labels
    .filter((l) => BODY_LINE_KEYWORDS.some((k) => l.description.toLowerCase().includes(k)))
    .map((l) => l.description);
}

/**
 * I-CAR guideline: feather edge = 1.5x damage diameter.
 * Blend area depends on paint type and stages.
 */
function calcAreas(
  dentDepth: DentDepth,
  vehicle: Pick<VehicleData, 'paintStages'>
): { featherEdgeArea: number; blendArea: number } {
  const baseDiameterInches = dentDepth === 'deep' ? 8 : dentDepth === 'medium' ? 5 : 3;
  const featherEdgeArea = Math.round(Math.PI * Math.pow(baseDiameterInches * 1.5, 2));

  const blendMultiplier = vehicle.paintStages === 3 ? 2.5 : vehicle.paintStages === 2 ? 2.0 : 1.5;
  const blendArea = Math.round(Math.PI * Math.pow(baseDiameterInches * blendMultiplier, 2));

  return { featherEdgeArea, blendArea };
}

export function interpretVisionResponse(
  visionResult: VisionAnnotation,
  vehicle: Pick<VehicleData, 'paintStages'>
): DamageAssessment {
  const labels = visionResult.labelAnnotations ?? [];

  const dentDepth = classifyDentDepth(labels);
  const dentType = classifyDentType(labels);
  const bodyLines = detectBodyLines(labels);
  const { featherEdgeArea, blendArea } = calcAreas(dentDepth, vehicle);
  const paintStageImpact = vehicle.paintStages === 3;

  return {
    dentDepth,
    dentType,
    bodyLines,
    featherEdgeArea,
    blendArea,
    paintStageImpact,
  };
}
