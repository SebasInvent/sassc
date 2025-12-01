# SASSC Biometric V2 - Arquitectura InsightFace + Mediapipe

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js 14)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Cámara    │───►│  Mediapipe  │───►│  InsightFace│───►│  Anti-Spoof │  │
│  │  480x480    │    │  FaceMesh   │    │   ArcFace   │    │    CNN      │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         │                  │                  │                  │          │
│         │           landmarks[]         embedding512       spoofScore       │
│         │           livenessData                                            │
│         │                  │                  │                  │          │
│         └──────────────────┴──────────────────┴──────────────────┘          │
│                                      │                                      │
│                                      ▼                                      │
│                          ┌─────────────────────┐                            │
│                          │   POST /biometrics  │                            │
│                          │   { embedding512,   │                            │
│                          │     livenessScore,  │                            │
│                          │     spoofScore,     │                            │
│                          │     imageBase64 }   │                            │
│                          └─────────────────────┘                            │
│                                      │                                      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND (NestJS)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      CASCADE VERIFICATION                            │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  1. LIVENESS CHECK                                                   │   │
│  │     └─► livenessScore >= 60 ? CONTINUE : FAIL                       │   │
│  │                                                                      │   │
│  │  2. ANTI-SPOOF CHECK                                                 │   │
│  │     └─► spoofScore <= 40 ? CONTINUE : FAIL                          │   │
│  │                                                                      │   │
│  │  3. INSIGHTFACE COMPARISON                                           │   │
│  │     └─► distance = cosineDistance(embedding512, stored512)          │   │
│  │     └─► distance < 0.45 ? MATCH : (0.45-0.55 ? AWS_BACKUP : FAIL)   │   │
│  │                                                                      │   │
│  │  4. AWS REKOGNITION (BACKUP)                                         │   │
│  │     └─► similarity >= 90 ? MATCH : FAIL                             │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│                          ┌─────────────────────┐                            │
│                          │      RESULTADO      │                            │
│                          │  { success, user,   │                            │
│                          │    confidence,      │                            │
│                          │    providerUsed }   │                            │
│                          └─────────────────────┘                            │
│                                      │                                      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (PostgreSQL)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Practitioner {                                                             │
│    id: String                                                               │
│    embedding512: String (JSON array 512 floats)                            │
│    embeddingQuality: Float                                                  │
│    livenessScore: Float                                                     │
│    spoofScore: Float                                                        │
│    lastVerificationAt: DateTime                                             │
│    embeddingVersion: String (v2)                                           │
│    faceImage: String (base64, backup)                                      │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Registro Facial

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         ENROLLMENT FLOW                                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. Usuario llena formulario (nombre, rol, especialidad)                   │
│                                                                            │
│  2. Iniciar captura facial:                                                │
│     ├─► Cargar Mediapipe FaceMesh                                         │
│     ├─► Cargar InsightFace ArcFace (ONNX/WASM)                            │
│     └─► Cargar Anti-Spoof CNN                                             │
│                                                                            │
│  3. Liveness Challenge (guiado):                                           │
│     ├─► "Parpadea 2 veces"                                                │
│     ├─► "Gira la cabeza a la izquierda"                                   │
│     ├─► "Gira la cabeza a la derecha"                                     │
│     └─► Validar con FaceMesh landmarks                                    │
│                                                                            │
│  4. Captura 3 imágenes (con liveness validado):                           │
│     ├─► Imagen 1 → embedding512_1                                         │
│     ├─► Imagen 2 → embedding512_2                                         │
│     └─► Imagen 3 → embedding512_3                                         │
│                                                                            │
│  5. Promediar embeddings:                                                  │
│     └─► finalEmbedding = normalize(avg(emb1, emb2, emb3))                 │
│                                                                            │
│  6. Calcular calidad:                                                      │
│     └─► quality = 1 - variance(emb1, emb2, emb3)                          │
│                                                                            │
│  7. Anti-Spoof check:                                                      │
│     └─► spoofScore = antiSpoofCNN(bestImage)                              │
│     └─► Si spoofScore > 40% → RECHAZAR                                    │
│                                                                            │
│  8. Enviar a backend:                                                      │
│     POST /biometrics/enroll {                                              │
│       firstName, lastName, role,                                           │
│       embedding512: JSON.stringify(finalEmbedding),                        │
│       embeddingQuality: quality,                                           │
│       livenessScore: avgLiveness,                                          │
│       spoofScore: spoofScore,                                              │
│       faceImage: bestImageBase64                                           │
│     }                                                                      │
│                                                                            │
│  9. Backend genera licencia y guarda en DB                                 │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Login Biométrico

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. Cargar usuarios registrados (embeddings512)                            │
│                                                                            │
│  2. Quick Liveness (simplificado):                                         │
│     ├─► Detectar rostro con FaceMesh                                      │
│     ├─► Validar parpadeo natural                                          │
│     └─► livenessScore >= 60 ? CONTINUE : FAIL                             │
│                                                                            │
│  3. Anti-Spoof check:                                                      │
│     └─► spoofScore <= 40 ? CONTINUE : FAIL                                │
│                                                                            │
│  4. Extraer embedding512 del rostro actual                                 │
│                                                                            │
│  5. Comparar con todos los usuarios:                                       │
│     FOR each user in registeredUsers:                                      │
│       distance = cosineDistance(currentEmb, user.embedding512)             │
│       IF distance < bestDistance:                                          │
│         bestMatch = user                                                   │
│         bestDistance = distance                                            │
│                                                                            │
│  6. Decisión:                                                              │
│     ├─► distance < 0.45 → MATCH DIRECTO                                   │
│     ├─► distance 0.45-0.55 → AWS BACKUP                                   │
│     └─► distance > 0.55 → NO MATCH                                        │
│                                                                            │
│  7. AWS Backup (si necesario):                                             │
│     POST /biometrics/aws-backup {                                          │
│       sourceImage: currentImageBase64,                                     │
│       targetImage: user.faceImage                                          │
│     }                                                                      │
│     └─► similarity >= 90% ? MATCH : FAIL                                  │
│                                                                            │
│  8. Login exitoso → JWT + redirect dashboard                               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Componentes del Sistema

### Frontend
- `src/lib/biometrics/mediapipe.ts` - FaceMesh + Liveness
- `src/lib/biometrics/insightface.ts` - ArcFace embeddings
- `src/lib/biometrics/antispoof.ts` - CNN anti-spoofing
- `src/lib/biometrics/cascade.ts` - Orquestador
- `src/components/FaceEnrollment.tsx` - UI registro
- `src/components/FaceLogin.tsx` - UI login

### Backend
- `biometrics/insightface.service.ts` - Embeddings
- `biometrics/liveness.service.ts` - Validación liveness
- `biometrics/antispoof.service.ts` - Anti-spoofing
- `biometrics/cascade.service.ts` - Cascada
- `biometrics/biometric.controller.ts` - Endpoints

### Modelos (public/models/)
- `face_detection_short_range.tflite` - Mediapipe
- `face_landmark.tflite` - FaceMesh
- `arcface_mobilefacenet.onnx` - InsightFace
- `antispoof_minifasnet.onnx` - Anti-spoof

---

## Archivos Creados

### Backend (apps/backend/src/biometrics/v2/)
```
v2/
├── index.ts                    # Exports
├── biometric.module.ts         # NestJS Module
├── biometric.controller.ts     # REST Endpoints
├── insightface.service.ts      # ArcFace 512D embeddings
├── liveness.service.ts         # Mediapipe liveness validation
├── antispoof.service.ts        # Anti-spoof detection
└── cascade.service.ts          # Cascade orchestrator
```

### Frontend (apps/web-admin/src/lib/biometrics/)
```
biometrics/
├── index.ts                    # Exports
├── cascade.ts                  # Main orchestrator
├── mediapipe.ts                # FaceMesh liveness
├── insightface.ts              # ArcFace ONNX
└── antispoof.ts                # Texture/frequency analysis
```

### Components (apps/web-admin/src/components/biometrics/)
```
biometrics/
├── index.ts
├── FaceEnrollment.tsx          # Registration UI
└── FaceLogin.tsx               # Login UI
```

---

## Endpoints API

### POST /biometrics/enroll
Registra nuevo usuario con biometría V2.

```json
// Request
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "specialty": "Medicina General",
  "role": "DOCTOR",
  "embedding512": "[0.123, -0.456, ...]",  // 512 floats
  "embeddingQuality": 0.95,
  "livenessScore": 85,
  "spoofScore": 15,
  "faceImage": "data:image/jpeg;base64,..."
}

// Response
{
  "success": true,
  "user": {
    "id": "cmim27yl...",
    "license": "DOC-123456789",
    "name": "Juan Pérez",
    "role": "DOCTOR"
  }
}
```

### POST /biometrics/verify
Verificación completa en cascada.

```json
// Request
{
  "embedding512": "[0.123, -0.456, ...]",
  "imageBase64": "data:image/jpeg;base64,...",
  "livenessData": {
    "blinkDetected": true,
    "blinkCount": 2,
    "eyeAspectRatio": 0.25,
    "headPose": { "yaw": 5, "pitch": -3, "roll": 1 },
    "movementDetected": true,
    "movementScore": 65,
    "landmarksDetected": 468,
    "meshQuality": 98,
    "depthScore": 72,
    "textureScore": 85
  },
  "antiSpoofData": {
    "spoofProbability": 0.12,
    "textureVariance": 150,
    "laplacianVariance": 80,
    "highFrequencyRatio": 0.35,
    "reflectionScore": 25,
    "moireScore": 5,
    "colorDistribution": { "naturalness": 75, "saturation": 45 }
  }
}

// Response
{
  "success": true,
  "user": { "id": "...", "name": "Juan Pérez" },
  "confidence": 92.5,
  "decision": "MATCH",
  "reason": "Match confirmed by InsightFace (HIGH)",
  "details": {
    "arcfaceScore": 95.2,
    "livenessScore": 85,
    "spoofScore": 12,
    "awsSimilarity": null,
    "verificationTimeMs": 850
  },
  "providerBreakdown": {
    "liveness": { "passed": true, "score": 85 },
    "antiSpoof": { "passed": true, "score": 88 },
    "insightFace": { "passed": true, "score": 95.2 },
    "awsRekognition": null
  }
}
```

### POST /biometrics/quick-verify
Verificación rápida (sin datos detallados).

### POST /biometrics/liveness
Validar datos de liveness.

### POST /biometrics/embedding
Comparar dos embeddings.

### GET /biometrics/registered
Obtener usuarios registrados con V2.

### GET /biometrics/thresholds
Obtener umbrales de verificación.

---

## Migración de Base de Datos

### Nuevos campos en Practitioner:
```prisma
model Practitioner {
  // Biometric V2 - InsightFace ArcFace 512D
  embedding512       String?   // JSON array of 512 floats
  embeddingQuality   Float?    // 0-1
  embeddingVersion   String?   // "v2"
  
  // Metadata
  livenessScore      Float?    // 0-100
  spoofScore         Float?    // 0-100
  lastVerificationAt DateTime?
  verificationCount  Int       @default(0)
  
  // Legacy (kept for backward compatibility)
  faceDescriptor     String?   // 128D (deprecated)
  faceImage          String?   // Base64 (AWS backup)
}
```

### Comando de migración:
```bash
cd apps/backend
npx prisma db push
npx prisma generate
```

---

## Dependencias Nuevas

### Frontend (apps/web-admin/package.json):
```json
{
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.8",
    "onnxruntime-web": "^1.16.3"
  }
}
```

### Backend (apps/backend/package.json):
```json
{
  "dependencies": {
    "@aws-sdk/client-rekognition": "^3.x"
  }
}
```

---

## Configuración de Thresholds

### InsightFace (Cosine Distance):
- `< 0.35` = HIGH confidence match
- `< 0.45` = MEDIUM confidence match (direct approval)
- `0.45 - 0.55` = LOW confidence (needs AWS backup)
- `> 0.55` = NO match

### Liveness:
- `>= 60` = Pass
- `< 60` = Fail

### Anti-Spoof:
- `<= 40` = Real face
- `> 40` = Possible spoof

### AWS Rekognition (backup):
- `>= 90%` = Match confirmed
- `< 90%` = Reject

---

## Uso

### Registro:
```tsx
import { FaceEnrollment } from '@/components/biometrics';

export default function RegistroPage() {
  return <FaceEnrollment />;
}
```

### Login:
```tsx
import { FaceLogin } from '@/components/biometrics';

export default function LoginPage() {
  return <FaceLogin />;
}
```

### Programático:
```typescript
import { 
  initBiometrics, 
  verifyCascade, 
  enrollUser 
} from '@/lib/biometrics';

// Initialize
await initBiometrics();

// Verify
const result = await verifyCascade(videoElement, registeredUsers);
if (result.success) {
  console.log(`Verified: ${result.user.name}`);
}

// Enroll
const enrollment = await enrollUser(videoElement, {
  firstName: 'Juan',
  lastName: 'Pérez',
  specialty: 'Medicina',
  role: 'DOCTOR',
});
```
