# Tech-Assist: Autobody AI Damage Analysis App

## Context
Auto body technicians routinely undersell repair time because documenting damage justification is tedious and time-consuming. Tech-Assist solves this by using AI-powered photo analysis to detect dent depth, body lines, feather edge areas, and blend zones — then generates a professional written repair justification report the tech can submit directly to an insurance adjuster. The app captures VIN data, guides the tech through a full exterior sweep, and produces a PDF report grounded in I-CAR and OEM procedures.

---

## Stack
| Layer | Choice | Reason |
|---|---|---|
| Frontend | React Native (Expo) | Web MVP first, native iOS/Android later without rewrite |
| Routing | expo-router (file-based) | Native + web routing in one system |
| Auth | Firebase Auth | Email/password + Google sign-in |
| Database | Firestore | Real-time, mobile-first, per-tech data isolation |
| Storage | Firebase Storage | Photos + exported PDFs |
| AI — Vision | Google Cloud Vision API | Label detection, object localization, image properties |
| AI — Narrative | OpenAI GPT-4o (backend) | Professional written justification from structured assessment |
| VIN Decode | NHTSA vPIC API (free) | Make/model/year/body style — no license required |
| PDF | @react-pdf/renderer | Works on Expo Web; consistent with native path |
| Backend | Firebase Functions (Node.js) | Keeps API keys off the client |

---

## File Structure
```
/Tech-assist
  /app
    /_layout.tsx               # AuthProvider wrap + route guard
    /(auth)/login.tsx
    /(auth)/register.tsx
    /(tabs)/index.tsx          # Dashboard
    /(tabs)/history.tsx        # Job history list
    /job/[id].tsx              # Job detail / re-view report
    /new-job/vin-scan.tsx
    /new-job/exterior-sweep.tsx
    /new-job/damage-analysis.tsx
    /new-job/report.tsx
  /components
    VinScanner.tsx             # Barcode scanner + manual fallback
    PanelGuide.tsx             # 8-position vehicle diagram wizard
    DamageCard.tsx             # Per-panel assessment display + override
    ReportPreview.tsx          # Editable narrative + export button
  /lib
    firebase.ts                # auth, db, storage exports
    vinDecoder.ts              # NHTSA API call + result parsing
    vision.ts                  # interpretVisionResponse() — core logic
    reportGenerator.ts         # buildReportPrompt() for GPT-4o
    pdfExport.ts               # @react-pdf/renderer ReportDocument
  /hooks
    useAuth.ts                 # AuthContext + onAuthStateChanged
  /types
    index.ts                   # Job, VehicleData, DamagedPanel, DamageAssessment
  /functions
    index.ts                   # analyzePanel + generateReport Firebase Functions
  .env.local                   # EXPO_PUBLIC_FIREBASE_* vars (safe); secret keys backend only
  app.json
  package.json
```

---

## Firestore Data Model
```
/users/{uid}
  email, displayName, createdAt

/jobs/{jobId}
  technicianId: string
  status: 'in_progress' | 'complete'
  createdAt / updatedAt: Timestamp
  vehicle: { vin, make, model, year, bodyStyle, paintCode, paintStages: 1|2|3 }
  exteriorPhotos: { front, rear, driverSide, passengerSide, roof, driverFrontQuarter, passengerFrontQuarter, driverRearQuarter }  — Storage URLs
  damagedPanels: [{ panelId, photoUrl, visionAnalysis, assessment: { dentDepth, dentType, bodyLines, featherEdgeArea, blendArea, paintStageImpact } }]
  report: { narrative, editedNarrative, generatedAt, pdfUrl }
```

---

## Implementation Plan

### Phase 1 — Scaffold ✅
1. `npx create-expo-app@latest Tech-assist --template tabs`
2. Install packages: `expo-camera`, `expo-barcode-scanner`, `expo-image-picker`, `expo-image-manipulator`, `firebase`, `@react-pdf/renderer`, `axios`, `react-native-svg`, `uuid`, `date-fns`
3. Configure `app.json`: scheme, camera permissions, `web.bundler: "metro"`
4. Set up Firebase project (Auth, Firestore, Storage, Functions)
5. Create `.env.local` with `EXPO_PUBLIC_FIREBASE_*` vars
6. Write `lib/firebase.ts` — export `auth`, `db`, `storage`
7. Write Firestore + Storage Security Rules (owner-only access)

### Phase 2 — Auth ✅
8. `hooks/useAuth.ts` — AuthContext with `onAuthStateChanged`
9. `app/_layout.tsx` — wrap with AuthProvider, redirect unauthenticated users to `/login`
10. `app/(auth)/login.tsx` — email/password + Google sign-in (`signInWithPopup` on web)
11. `app/(auth)/register.tsx` — create account + write `/users/{uid}` doc

### Phase 3 — VIN Scanner ✅
12. `components/VinScanner.tsx` — `expo-barcode-scanner` (Code 39 + Code 128) with visual overlay; text input fallback for web
13. `lib/vinDecoder.ts` — call NHTSA vPIC API, parse Make/Model/Year/Body Class; validate VIN with `/^[A-HJ-NPR-Z0-9]{17}$/i`
14. `app/new-job/vin-scan.tsx` — scan → decode → display vehicle card → manual paint code + stage (1/2/3) input → create Firestore job doc → navigate to sweep

### Phase 4 — Exterior Sweep ✅
15. `components/PanelGuide.tsx` — 8-position typed array; SVG vehicle diagram with active position highlighted
16. `app/new-job/exterior-sweep.tsx` — step wizard: instruction text → camera → preview → next; compress with `expo-image-manipulator` (1200px, 0.8 JPEG); upload to Storage; update Firestore `exteriorPhotos`

### Phase 5 — AI Damage Analysis ✅
17. `functions/index.ts` — `analyzePanel` Firebase Function: authenticated, calls Vision API
18. `lib/vision.ts` — `interpretVisionResponse()`: maps labels → assessment fields
19. `components/DamageCard.tsx` — display assessment fields, each tappable to override; color-coded dent depth badge
20. `app/new-job/damage-analysis.tsx` — select damaged panels → photo per panel → upload → call `analyzePanel` → show DamageCard → allow edits → "Generate Report"

### Phase 6 — Report Generation + PDF ✅
21. `lib/reportGenerator.ts` — `buildReportPrompt()`: structured prompt with vehicle + panel assessments
22. `functions/index.ts` — `generateReport` Firebase Function: calls GPT-4o, returns narrative string
23. `lib/pdfExport.ts` — `@react-pdf/renderer` `ReportDocument`
24. `app/new-job/report.tsx` — editable narrative; Regenerate / Export PDF / Finish Job
25. `components/ReportPreview.tsx` — scrollable editable narrative with character count

### Phase 7 — Job History ✅
26. `app/(tabs)/history.tsx` — Firestore real-time query with pagination
27. `app/job/[id].tsx` — full job detail: exterior photo grid, damage cards, narrative, re-export PDF

---

## Next Steps (Firebase Setup)
1. Create Firebase project at console.firebase.google.com
2. Enable Auth (Email/Password + Google)
3. Create Firestore database (production mode)
4. Enable Storage
5. Copy config values into `.env.local`
6. Deploy security rules (see Security Rules Summary below)
7. Deploy functions: `cd functions && npm install && firebase deploy --only functions`
8. Set function config: `firebase functions:config:set openai.key="sk-..." vision.key="AIza..."`

---

## Security Rules Summary
- **Firestore**: `jobs` readable/writable only by `technicianId == request.auth.uid`
- **Storage**: photos under `jobs/{jobId}/` readable only if caller owns that job
- **API keys**: Google Vision + OpenAI keys live only in Firebase Functions environment

---

## Verification Steps
1. **Auth**: Register → verify `/users/{uid}` doc created; log out → confirm redirect to login
2. **VIN**: Enter `1FTFW1ET5DFC10312` (Ford F-150) → verify make/model/year decoded correctly
3. **Exterior sweep**: Complete all 8 photos → verify Storage URLs written to `exteriorPhotos` in Firestore
4. **Vision analysis**: Photo a dented panel → verify `analyzePanel` returns labels; verify `DamageCard` renders
5. **Report**: Generate → verify GPT-4o narrative cites paint stage type and blend area
6. **PDF**: Export → verify PDF opens with vehicle info, panel photos, and narrative
7. **History**: Complete a job → navigate to history tab → verify job appears
8. **Security**: Manually query another user's `jobId` in Firestore → verify 403 denied

---

## Post-MVP
- Native build: `expo eject` + native Google Sign-In
- Offline support: Firestore offline persistence + upload queue UI
- Paint code database: ALLDATA API evaluation
- Custom Vision model: fine-tune on autobody damage photos
- Adjuster email: SendGrid integration
