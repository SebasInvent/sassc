# 📋 INFORME COMPLETO DEL SISTEMA SASSC/MEDICARE
## Checkpoint: 2 de Diciembre 2024 - v1.0 Estable

---

## 🏗️ ARQUITECTURA GENERAL

### Estructura del Monorepo
```
Medicare/
├── apps/
│   ├── backend/          # API NestJS + Prisma + PostgreSQL
│   ├── web-admin/        # Frontend Next.js 14 (Panel Administrativo)
│   ├── kiosk/            # App Flutter (Kiosco de autoatención)
│   └── mobile_patient/   # App Flutter (Pacientes)
├── packages/
│   ├── shared-types/     # Tipos TypeScript compartidos
│   └── ui-components/    # Componentes UI compartidos
├── docs/                 # Documentación
└── scripts/              # Scripts de utilidad
```

### URLs de Producción
- **Backend API**: `https://backend-production-4923.up.railway.app`
- **Web Admin**: `https://web-admin-production-d1df.up.railway.app`
- **Base de Datos**: PostgreSQL en Railway

---

## 🔐 SISTEMA DE AUTENTICACIÓN BIOMÉTRICA (Face ID)

### Tecnologías Utilizadas

#### Frontend (web-admin)
| Librería | Versión | Propósito |
|----------|---------|-----------|
| face-api.js | latest | Detección facial y extracción de descriptores 128D |
| Web Speech API | nativo | Guía por voz para usuarios |

#### Modelos de IA (face-api.js)
- **TinyFaceDetector**: Detección rápida de rostros
- **FaceLandmark68Net**: 68 puntos de referencia facial
- **FaceRecognitionNet**: Extracción de descriptor 128D

### Flujo de Registro Facial

```
1. Usuario completa formulario (nombre, rol, especialidad)
2. Sistema inicia cámara (1280x720 ideal)
3. Guía por voz: "Posicione su rostro en el centro"
4. 5 capturas con diferentes ángulos:
   - Captura 1: Frente (frontal)
   - Captura 2: Giro izquierda
   - Captura 3: Giro derecha
   - Captura 4: Inclinación arriba
   - Captura 5: Posición final
5. Validación de consistencia entre descriptores
6. Selección de descriptor óptimo (frontal si consistencia < 0.4, promedio si no)
7. Envío a backend: POST /auth/register-new-user
8. Generación de licencia única (DOC-XXXXXXXXX)
```

### Flujo de Login Facial

```
1. Carga de usuarios registrados: GET /auth/registered-faces
2. Carga de modelos face-api.js
3. Inicio de cámara fullscreen
4. Detección continua cada 500ms:
   - Análisis de posición del rostro
   - Cálculo de distancia euclidiana vs usuarios registrados
   - Guía por voz según estado
5. Verificación con sistema de niveles:
   - PERFECTO: distancia < 0.48 → Acceso inmediato
   - BUENO: distancia < 0.55 + diff > 0.05 → Acceso
   - ÚNICO: distancia < 0.55 (solo 1 usuario) → Acceso
   - NO_MATCH: distancia ≥ 0.60 → Denegado
6. Login automático tras reconocimiento
```

### Archivos Clave del Sistema Biométrico

#### `/apps/web-admin/src/lib/faceRecognition.ts`
```typescript
// Funciones principales:
- loadModels(): Carga modelos face-api.js
- detectFace(video): Extrae descriptor 128D
- detectFaceOnly(video): Solo detecta presencia
- euclideanDistance(d1, d2): Calcula distancia entre descriptores
- stringToDescriptor(str): Deserializa descriptor
- descriptorToString(desc): Serializa descriptor
```

#### `/apps/web-admin/src/app/login/page.tsx`
```typescript
// Estados del componente:
type Step = 'loading' | 'camera' | 'verifying' | 'recognized' | 
            'not_registered' | 'no_face_detected' | 'verification_failed' | 
            'manual_login';

type FaceStatus = 'no_face' | 'too_far' | 'too_close' | 'off_center' | 
                  'perfect' | 'detecting';

// Umbrales de verificación:
const THRESHOLD_PERFECT = 0.48;  // Match muy bueno
const THRESHOLD_GOOD = 0.55;     // Match aceptable
const MIN_DIFF = 0.05;           // Diferencia mínima con segundo
```

#### `/apps/web-admin/src/app/registro-facial/page.tsx`
```typescript
// Configuración de capturas:
const CAPTURE_ANGLES = [
  { id: 1, instruction: 'Mire al frente', voiceKey: 'lookFront' },
  { id: 2, instruction: 'Gire a la izquierda', voiceKey: 'lookLeft' },
  { id: 3, instruction: 'Gire a la derecha', voiceKey: 'lookRight' },
  { id: 4, instruction: 'Incline hacia arriba', voiceKey: 'lookUp' },
  { id: 5, instruction: 'Posición final', voiceKey: 'finalCapture' },
];
```

### Sistema de Voz (Web Speech API)

```typescript
const VOICE_MESSAGES = {
  welcome: "Bienvenido a SASSC. Posicione su rostro en el centro de la pantalla.",
  tooFar: "Acérquese un poco más a la cámara.",
  tooClose: "Aléjese un poco de la cámara.",
  noFace: "No detectamos su rostro. Asegúrese de estar frente a la cámara.",
  perfect: "Perfecto, mantenga esa posición.",
  verifying: "Verificando identidad.",
  success: "Bienvenido",
  notRegistered: "No encontramos su rostro en el sistema. Por favor regístrese.",
  error: "Ocurrió un error. Intente de nuevo.",
  lookCenter: "Mire directamente a la cámara.",
};
```

---

## 🗄️ BASE DE DATOS (Prisma + PostgreSQL)

### Modelos Principales

#### User (Autenticación)
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  role          UserRole
  isActive      Boolean   @default(true)
  firstName     String
  lastName      String
  patientId     String?   @unique
  practitionerId String?  @unique
}
```

#### Practitioner (Personal Médico con Biometría)
```prisma
model Practitioner {
  id              String   @id @default(cuid())
  license         String   @unique  // Ej: DOC-123456789
  firstName       String
  lastName        String
  specialty       String
  faceDescriptor  String?  // JSON array 128D
  faceImage       String?  // Base64 para backup
  faceRegisteredAt DateTime?
}
```

#### Patient (Pacientes)
```prisma
model Patient {
  id        String       @id @default(cuid())
  docType   DocumentType // CC, CE, PA, RC, TI
  docNumber String       @unique
  firstName String
  lastName  String
  regimen   RegimenSalud // CONTRIBUTIVO, SUBSIDIADO, ESPECIAL, VINCULADO
  capAsignadoId String?  // Territorialización
  biometricRegistered Boolean @default(false)
}
```

### Roles del Sistema (UserRole)
```prisma
enum UserRole {
  // Nivel 1 - Superintendencia
  SUPER_ADMIN, SUPERINTENDENTE
  
  // Nivel 2 - ADRES
  ADMIN_ADRES_NACIONAL, ADMIN_ADRES_REGIONAL
  
  // Nivel 3 - CAP
  DIRECTOR_CAP, MEDICO_CAP, ODONTOLOGO_CAP, ENFERMERO_CAP, ADMINISTRATIVO_CAP
  
  // Nivel 4 - IPS
  DIRECTOR_IPS, ESPECIALISTA_IPS, LABORATORIO_IPS, IMAGENES_IPS, FARMACIA_IPS
  
  // Nivel 5 - Gestores
  GESTOR_ADMINISTRATIVO
  
  // Nivel 6 - Paciente
  PACIENTE
  
  // Legacy
  ADMIN, DOCTOR, NURSE, PHARMACIST, RADIOLOGIST, LAB_TECHNICIAN, RECEPTIONIST, PATIENT
}
```

---

## 🔌 API ENDPOINTS (Backend NestJS)

### Autenticación (`/auth`)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/auth/register-new-user` | Registro con biometría |
| POST | `/auth/login` | Login con licencia |
| GET | `/auth/registered-faces` | Lista usuarios con rostro registrado |

### Módulos del Backend
```
├── auth/           # Autenticación y registro
├── users/          # Gestión de usuarios
├── patients/       # Gestión de pacientes
├── appointments/   # Citas médicas
├── encounters/     # Encuentros clínicos
├── observations/   # Observaciones médicas
├── conditions/     # Diagnósticos
├── medications/    # Medicamentos
├── prescriptions/  # Prescripciones
├── laboratory/     # Órdenes de laboratorio
├── imaging/        # Imágenes diagnósticas
├── dashboard/      # Estadísticas
├── caps/           # Centros de Atención Primaria
├── ips/            # Instituciones Prestadoras de Salud
├── remisiones/     # Sistema de remisiones
├── adres/          # Integración ADRES
├── financiero/     # Módulo financiero
├── preventivo/     # Medicina preventiva
├── firma-biometrica/ # Firmas digitales
├── notificaciones/ # Sistema de notificaciones
├── auditoria/      # Logs de auditoría
├── rips/           # Reportes RIPS
├── mipres/         # Integración MIPRES
├── consentimiento/ # Consentimientos informados
├── facturacion/    # Facturación electrónica
└── biometrics/v2/  # Biometría avanzada (InsightFace)
```

---

## 🎨 INTERFAZ DE USUARIO

### Diseño Visual
- **Tema**: Futurista, minimalista, médico
- **Colores principales**: 
  - Background: `slate-950` (#020617)
  - Primario: `cyan-500` (#06b6d4)
  - Secundario: `teal-500` (#14b8a6)
  - Éxito: `green-400` (#4ade80)
  - Error: `red-400` (#f87171)
- **Efectos**: Glassmorphism, gradientes, blur

### Componentes UI
- Framework: **shadcn/ui**
- Iconos: **Lucide React**
- Estilos: **Tailwind CSS**

### Pantallas de Login
1. **Loading**: Spinner con fingerprint animado
2. **Camera**: Video fullscreen con guía oval
3. **Verifying**: Animación de verificación
4. **Recognized**: Confirmación con datos del usuario
5. **Not Registered**: Invitación a registrarse
6. **Verification Failed**: Error con opción de reintentar
7. **Manual Login**: Formulario de licencia

---

## 📊 MÉTRICAS Y UMBRALES

### Distancia Euclidiana (Face Matching)
| Rango | Interpretación | Acción |
|-------|----------------|--------|
| 0.00 - 0.30 | Match perfecto | ✅ Acceso inmediato |
| 0.30 - 0.48 | Match muy bueno | ✅ Acceso |
| 0.48 - 0.55 | Match aceptable | ✅ Acceso (con validación) |
| 0.55 - 0.60 | Match dudoso | ⚠️ Requiere diferencia clara |
| 0.60+ | No match | ❌ Denegado |

### Validación de Registro
- **Consistencia interna**: Distancia promedio entre 5 capturas
- **Umbral de consistencia**: < 0.4 = usar descriptor frontal
- **Umbral de consistencia**: ≥ 0.4 = usar promedio

---

## 🔧 CONFIGURACIÓN DE DESARROLLO

### Variables de Entorno (Backend)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Variables de Entorno (Frontend)
```env
NEXT_PUBLIC_API_URL=https://backend-production-4923.up.railway.app
```

### Comandos de Desarrollo
```bash
# Backend
cd apps/backend
npm run start:dev

# Frontend
cd apps/web-admin
npm run dev

# Deploy
railway redeploy -s web-admin
railway redeploy -s backend
```

---

## 📝 NOTAS IMPORTANTES

### Seguridad
1. Los descriptores faciales son vectores 128D, no imágenes
2. Las imágenes se guardan solo como backup para AWS Rekognition
3. La verificación es local (face-api.js) - no envía datos a servidores externos
4. Sistema de niveles previene falsos positivos

### Limitaciones Conocidas
1. Requiere buena iluminación para detección óptima
2. Funciona mejor con cámara frontal de alta resolución
3. El umbral de 0.55 puede requerir ajuste según población de usuarios

### Próximas Mejoras Planificadas
1. Implementar liveness detection (anti-spoofing)
2. Agregar verificación con múltiples capturas en login
3. Integrar AWS Rekognition como backup
4. Dashboard de métricas de reconocimiento

---

## ✅ ESTADO ACTUAL: FUNCIONAL

- [x] Registro facial con 5 capturas
- [x] Login con reconocimiento automático
- [x] Guía por voz
- [x] UI fullscreen inmersiva
- [x] Sistema de niveles de matching
- [x] Rechazo de usuarios no registrados
- [x] Manejo de múltiples usuarios

---

*Documento generado el 2 de Diciembre de 2024*
*Versión del sistema: 1.0 Estable*
*Autor: Sistema SASSC/Medicare*
