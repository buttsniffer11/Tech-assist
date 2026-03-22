import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';
import OpenAI from 'openai';

admin.initializeApp();
const db = admin.firestore();

const openai = new OpenAI({ apiKey: functions.config().openai.key });

// ─── analyzePanel ─────────────────────────────────────────────────────────────

export const analyzePanel = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');

  const { photoUrl, panelId, vehicle } = data as {
    photoUrl: string;
    panelId: string;
    vehicle: { paintStages: 1 | 2 | 3 };
  };

  const visionApiKey = functions.config().vision.key;
  const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;

  const visionRes = await axios.post(visionUrl, {
    requests: [
      {
        image: { source: { imageUri: photoUrl } },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 20 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'IMAGE_PROPERTIES' },
        ],
      },
    ],
  });

  const visionResult = visionRes.data.responses[0];

  // Import the interpreter (kept as plain JS logic here to avoid bundling issues)
  const labels: Array<{ description: string; score: number }> = visionResult.labelAnnotations ?? [];

  const DEEP_KEYWORDS = ['dent', 'crumple', 'buckle', 'wrinkle', 'collapse', 'deform'];
  const MEDIUM_KEYWORDS = ['damage', 'scratch', 'gouge', 'abrasion', 'impact'];
  const SHARP_KEYWORDS = ['sharp', 'crimp', 'fold', 'crease'];
  const BODY_LINE_KEYWORDS = ['crease', 'ridge', 'feature line', 'body line', 'character line'];

  const descriptions = labels.map((l) => l.description.toLowerCase());
  const dentDepth = descriptions.some((d) => DEEP_KEYWORDS.some((k) => d.includes(k)))
    ? 'deep'
    : descriptions.some((d) => MEDIUM_KEYWORDS.some((k) => d.includes(k)))
    ? 'medium'
    : 'shallow';

  const dentType = descriptions.some((d) => SHARP_KEYWORDS.some((k) => d.includes(k))) ? 'sharp' : 'rolled';
  const bodyLines = labels.filter((l) => BODY_LINE_KEYWORDS.some((k) => l.description.toLowerCase().includes(k))).map((l) => l.description);

  const baseDiameterInches = dentDepth === 'deep' ? 8 : dentDepth === 'medium' ? 5 : 3;
  const featherEdgeArea = Math.round(Math.PI * Math.pow(baseDiameterInches * 1.5, 2));
  const blendMultiplier = vehicle.paintStages === 3 ? 2.5 : vehicle.paintStages === 2 ? 2.0 : 1.5;
  const blendArea = Math.round(Math.PI * Math.pow(baseDiameterInches * blendMultiplier, 2));

  return {
    panelId,
    photoUrl,
    visionAnalysis: visionResult,
    assessment: {
      dentDepth,
      dentType,
      bodyLines,
      featherEdgeArea,
      blendArea,
      paintStageImpact: vehicle.paintStages === 3,
    },
  };
});

// ─── generateReport ───────────────────────────────────────────────────────────

export const generateReport = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');

  const { jobId } = data as { jobId: string };
  const jobSnap = await db.doc(`jobs/${jobId}`).get();
  if (!jobSnap.exists) throw new functions.https.HttpsError('not-found', 'Job not found.');

  const job = jobSnap.data()!;

  if (job.technicianId !== context.auth.uid) {
    throw new functions.https.HttpsError('permission-denied', 'Access denied.');
  }

  const { vehicle, damagedPanels } = job;

  const vehicleSummary = `${vehicle.year} ${vehicle.make} ${vehicle.model} (${vehicle.bodyStyle}) — VIN: ${vehicle.vin}, Paint Code: ${vehicle.paintCode}, Paint Stages: ${vehicle.paintStages}`;

  const panelSummaries = damagedPanels
    .map((p: any) => {
      const a = p.assessment;
      return `Panel: ${p.panelId}
  - Dent Depth: ${a.dentDepth}
  - Dent Type: ${a.dentType}
  - Body Lines Affected: ${a.bodyLines?.length > 0 ? a.bodyLines.join(', ') : 'none detected'}
  - Feather Edge Area: ${a.featherEdgeArea} sq in
  - Blend Area: ${a.blendArea} sq in
  - 3-Stage Paint Impact: ${a.paintStageImpact ? 'yes' : 'no'}`;
    })
    .join('\n\n');

  const userPrompt = `Vehicle: ${vehicleSummary}\n\nDamaged Panels:\n${panelSummaries}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'You are a certified I-CAR estimator writing a repair justification report for an insurance adjuster. Write in clear, professional prose. Do not use bullet points. Cite I-CAR procedures including edge-to-edge paint, adjacent panel blend requirements, and R&I time where applicable. Explain 3-stage paint complexity when relevant. Do not inflate or exaggerate — all justifications must be grounded in the assessment data provided.',
      },
      { role: 'user', content: userPrompt },
    ],
  });

  const narrative = completion.choices[0].message.content ?? '';

  await db.doc(`jobs/${jobId}`).update({
    'report.narrative': narrative,
    'report.generatedAt': admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { narrative };
});
