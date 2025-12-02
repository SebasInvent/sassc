# SASSC v2.0 - Especificación Técnica Completa
## Sistema Anticorrupción del Sistema de Salud Colombiano

---

## 1. RESUMEN EJECUTIVO

SASSC v2.0 extiende el sistema actual (face-api.js 128D, Next.js, NestJS) agregando:
- **InsightFace 512D** para kioscos
- **Lector de huella** USB/Bluetooth
- **Lector de cédula** con MRZ/NFC/QR
- **Motor anticorrupción** con reglas de fraude
- **Motor de routing** inteligente
- **Auditoría inmutable** tipo blockchain

---

## 2. ARQUITECTURA EXTENDIDA

```
Medicare/
├── apps/
│   ├── backend/src/biometrics/v2/     # 🆕 Módulos v2
│   │   ├── fingerprint/
│   │   ├── cedula-reader/
│   │   ├── face-insight/
│   │   ├── anticorrupcion-engine/
│   │   ├── routing-engine/
│   │   └── audit/
│   ├── web-admin/                      # ✅ Mantener (128D)
│   └── kiosk/lib/                      # 🆕 Reescribir Flutter
│       ├── core/security/kiosk_mode.dart
│       ├── features/registration/
│       ├── features/biometrics/
│       └── services/insightface_service.dart
├── services/
│   └── insightface-worker/             # 🆕 Python + ONNX
└── packages/
    └── anticorrupcion-rules/           # 🆕 Reglas de negocio
```

---

## 3. NUEVOS MODELOS PRISMA

```prisma
// Terminal/Kiosko
model Terminal {
  id          String   @id @default(cuid())
  code        String   @unique  // "KIOSK-CAP-001"
  type        TerminalType
  deviceToken String   @unique
  ipsId       String?
  capId       String?
}

// Sesión Biométrica
model BiometricSession {
  id              String   @id @default(cuid())
  terminalId      String
  patientId       String?
  status          SessionStatus
  faceMatchScore  Float?
  livenessScore   Float?
  fingerprintScore Float?
  cedulaMatchScore Float?
  overallRiskScore Float?
  routingDecision RoutingDestination?
}

// Embedding InsightFace 512D
model InsightFaceEmbedding {
  id          String   @id @default(cuid())
  patientId   String
  embedding   String   // JSON Float32[512]
  quality     Float
  livenessScore Float?
  isPrimary   Boolean  @default(true)
}

// Huella Dactilar
model FingerprintData {
  id          String   @id @default(cuid())
  patientId   String
  finger      String   // RIGHT_THUMB, etc.
  templateISO String   // ISO 19794-2
  templateHash String  // SHA256
}

// Escaneo de Cédula
model CedulaScan {
  id             String   @id @default(cuid())
  sessionId      String
  documentNumber String
  mrzData        String?
  chipData       Json?
  photoHash      String?
  faceMatchScore Float?
}

// Alertas de Fraude
model FraudAlert {
  id          String   @id @default(cuid())
  sessionId   String
  type        FraudType
  severity    AlertSeverity
  description String
  evidence    Json?
  isResolved  Boolean  @default(false)
}

// Auditoría Inmutable
model AuditEvent {
  id           String   @id @default(cuid())
  sessionId    String?
  action       String
  outcome      String
  eventHash    String   // Hash para inmutabilidad
  previousHash String?  // Cadena tipo blockchain
}
```

---

## 4. UMBRALES DE DETECCIÓN

| Métrica | Umbral Mínimo | Acción si falla |
|---------|---------------|-----------------|
| Face Match | 0.70 | ALERT |
| Liveness | 0.35 | BLOCK |
| Fingerprint | 0.80 | ALERT |
| Cédula Match | 0.65 | REDIRECT |
| Risk Score | 0.60 | ALERT |
| Risk Score | 0.85 | BLOCK |

---

## 5. TIPOS DE FRAUDE DETECTADOS

```typescript
enum FraudType {
  IDENTITY_SPOOFING       // Suplantación
  CEDULA_TAMPERING        // Cédula adulterada
  DUPLICATE_REGISTRATION  // Registro duplicado
  FACE_CEDULA_MISMATCH    // Rostro ≠ cédula
  FINGERPRINT_MISMATCH    // Huella ≠ registro
  DEEPFAKE_DETECTED       // Deepfake
  LIVENESS_FAILED         // Spoofing
  PHANTOM_SERVICE         // Servicio fantasma
}
```

---

## 6. MOTOR DE ROUTING

```typescript
// Reglas de decisión
if (alertSeverity === 'CRITICAL') → AUDIT_OFFICE
if (riskScore >= 0.8) → DOCUMENT_WINDOW
if (terminal === 'KIOSK_LAB') → LABORATORY
if (terminal === 'KIOSK_PHARMACY') → PHARMACY
if (service === 'URGENCIAS') → EMERGENCY
default → WAITING_ROOM
```

---

## 7. ENDPOINTS API v2

```
POST /biometrics/v2/session/start
POST /biometrics/v2/face/extract-512d
POST /biometrics/v2/face/liveness
POST /biometrics/v2/face/match-cedula
POST /biometrics/v2/fingerprint/capture
POST /biometrics/v2/fingerprint/verify
POST /biometrics/v2/cedula/scan
POST /biometrics/v2/cedula/validate
POST /biometrics/v2/anticorrupcion/evaluate
POST /biometrics/v2/routing/decide
GET  /biometrics/v2/audit/session/:id
GET  /biometrics/v2/alerts/pending
```

---

## 8. KIOSKO FLUTTER - MODO FULLSCREEN

```dart
// main.dart
await SystemChrome.setEnabledSystemUIMode(
  SystemUiMode.immersiveSticky,
  overlays: [],
);
await KioskMode.enable();  // Bloquea Home, Back, Recents
```

---

## 9. FLUJO DE REGISTRO PACIENTE

```
1. Pantalla bienvenida + voz
2. Formulario datos personales
3. Escaneo de cédula (MRZ/NFC/QR)
4. Auto-llenado de datos
5. Captura facial InsightFace 512D
6. Liveness detection
7. Match rostro ↔ foto cédula
8. Captura huella dactilar
9. Evaluación anticorrupción
10. Decisión de routing
11. Pantalla resultado + instrucciones
```

---

## 10. SEGURIDAD

- **Cifrado**: AES-256 para datos biométricos
- **TLS Pinning**: En kioscos
- **Hash**: SHA256 para templates
- **Auditoría**: Logs inmutables con cadena de hashes
- **Tokens**: Por dispositivo, rotación automática
- **Geolocalización**: Registro de terminal

---

## 11. COMPATIBILIDAD

✅ Mantiene face-api.js 128D en web-admin
✅ Mantiene modelos Prisma existentes
✅ Mantiene endpoints auth actuales
✅ Extiende con módulos v2 sin romper v1

---

*Documento generado: 2 Diciembre 2024*
*Versión: SASSC v2.0 Specification*
