import { Timestamp } from 'firebase/firestore';

export type PaintStages = 1 | 2 | 3;

export interface VehicleData {
  vin: string;
  make: string;
  model: string;
  year: string;
  bodyStyle: string;
  paintCode: string;
  paintStages: PaintStages;
}

export type DentDepth = 'shallow' | 'medium' | 'deep';
export type DentType = 'sharp' | 'rolled';

export interface DamageAssessment {
  dentDepth: DentDepth;
  dentType: DentType;
  bodyLines: string[];
  featherEdgeArea: number; // square inches
  blendArea: number; // square inches
  paintStageImpact: boolean;
}

export interface DamagedPanel {
  panelId: string;
  photoUrl: string;
  visionAnalysis: Record<string, unknown>;
  assessment: DamageAssessment;
}

export type ExteriorPhotos = {
  front?: string;
  rear?: string;
  driverSide?: string;
  passengerSide?: string;
  roof?: string;
  driverFrontQuarter?: string;
  passengerFrontQuarter?: string;
  driverRearQuarter?: string;
};

export type JobStatus = 'in_progress' | 'complete';

export interface Report {
  narrative: string;
  editedNarrative?: string;
  generatedAt: Timestamp;
  pdfUrl?: string;
}

export interface Job {
  id?: string;
  technicianId: string;
  status: JobStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  vehicle: VehicleData;
  exteriorPhotos: ExteriorPhotos;
  damagedPanels: DamagedPanel[];
  report?: Report;
}
