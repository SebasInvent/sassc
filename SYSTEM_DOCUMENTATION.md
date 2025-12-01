# SASSC - Sistema de Autenticación Biométrica
## Software Anticorrupción Sistema Salud Colombiano

**Fecha**: Noviembre 2025  
**Versión**: 1.0  
**Stack**: Next.js 14 + NestJS + Prisma + PostgreSQL

---

# ÍNDICE

1. [Arquitectura General](#1-arquitectura-general)
2. [Sistema de Autenticación Biométrica](#2-sistema-de-autenticación-biométrica)
3. [Verificación en Cascada](#3-verificación-en-cascada)
4. [Base de Datos](#4-base-de-datos)
5. [APIs y Endpoints](#5-apis-y-endpoints)
6. [Frontend - Estructura](#6-frontend---estructura)
7. [Backend - Estructura](#7-backend---estructura)
8. [Despliegue](#8-despliegue)
9. [Configuración de Servicios Externos](#9-configuración-de-servicios-externos)
10. [Flujos de Usuario](#10-flujos-de-usuario)
11. [Problemas Conocidos y Soluciones](#11-problemas-conocidos-y-soluciones)

---

# 1. ARQUITECTURA GENERAL

## 1.1 Monorepo Structure

```
Medicare/
├── apps/
│   ├── backend/          # NestJS API (Puerto 3001)
│   │   ├── src/
│   │   │   ├── auth/     # Autenticación y biometría
│   │   │   ├── biometrics/
│   │   │   └── ...
│   │   └── prisma/       # Schema de BD
│   │
│   └── web-admin/        # Next.js Frontend (Puerto 3000)
│       ├── src/
│       │   ├── app/      # App Router (páginas)
│       │   ├── components/
│       │   ├── lib/      # Utilidades y servicios
│       │   └── context/  # React Context (Auth)
│       └── public/
│           └── models/   # Modelos face-api.js
│
├── packages/             # Paquetes compartidos
└── pnpm-workspace.yaml
```

## 1.2 URLs de Producción

| Servicio | URL |
|----------|-----|
| Frontend | https://web-admin-production-d1df.up.railway.app |
| Backend | https://backend-production-4923.up.railway.app |
| Base de Datos | PostgreSQL en Railway (interno) |

## 1.3 Tecnologías

### Frontend (web-admin)
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: React Context (AuthContext)
- **Biometría**: face-api.js (TensorFlow.js)
- **HTTP**: fetch nativo

### Backend
- **Framework**: NestJS
- **ORM**: Prisma
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT
- **Servicios Cloud**: AWS Rekognition, Google Cloud Vision

---

# 2. SISTEMA DE AUTENTICACIÓN BIOMÉTRICA

## 2.1 Componentes del Sistema

El sistema usa **3 proveedores de verificación** en paralelo:

### 2.1.1 Google Cloud Vision (Anti-spoofing)
- **Propósito**: Detectar si el rostro es REAL o una foto/pantalla
- **Archivo**: `apps/web-admin/src/lib/googleVision.ts`
- **API Key**: Variable de entorno `NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY`
- **Endpoint**: `https://vision.googleapis.com/v1/images:annotate`
- **Retorna**:
  - `livenessScore`: 0-100 (probabilidad de rostro real)
  - `isRealFace`: boolean
  - `faceDetected`: boolean
  - `confidence`: 0-100

```typescript
// Ejemplo de uso
const result = await detectFaceWithVision(imageBase64, timeoutMs);
// result.antiSpoofing.livenessScore = 75
// result.antiSpoofing.isRealFace = true
```

### 2.1.2 AWS Rekognition (Comparación de Rostros)
- **Propósito**: Comparar rostro capturado vs rostros registrados en BD
- **Archivo Frontend**: `apps/web-admin/src/lib/awsRekognition.ts`
- **Archivo Backend**: `apps/backend/src/auth/auth.controller.ts`
- **Flujo**:
  1. Frontend envía imagen a backend (`/auth/verify-face`)
  2. Backend usa AWS SDK para llamar a Rekognition
  3. Rekognition compara con cada usuario registrado
  4. Retorna mejor match si similarity >= 75%

```typescript
// Frontend llama al backend
const result = await compareFacesWithRekognition(imageBase64, users, timeoutMs);
// result.matched = true
// result.similarity = 95.5
// result.matchedUserId = "cmim27yl..."
```

**Variables de entorno backend**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (us-east-1)

### 2.1.3 Face-API.js (Verificación Local)
- **Propósito**: Verificación rápida sin internet usando descriptores faciales
- **Archivo**: `apps/web-admin/src/lib/faceRecognition.ts`
- **Modelos**: Almacenados en `public/models/`
  - `tiny_face_detector_model`
  - `face_landmark_68_model`
  - `face_recognition_model`

**Cómo funciona**:
1. **Registro**: Captura 3 fotos → extrae descriptor (Float32Array[128]) → promedia → guarda en BD
2. **Verificación**: Captura foto → extrae descriptor → calcula distancia euclidiana con cada usuario
3. **Match**: Si distancia < 0.5, es coincidencia (menor = más parecido)

```typescript
// Extraer descriptor
const descriptor = await detectFace(videoElement);
// descriptor = Float32Array(128) [0.123, -0.456, ...]

// Comparar
const distance = euclideanDistance(desc1, desc2);
// distance < 0.5 = match
// distance < 0.4 = high confidence match

// Convertir para guardar en BD
const descriptorString = descriptorToString(descriptor);
// "[0.123,-0.456,...]"

// Recuperar de BD
const descriptor = stringToDescriptor(descriptorString);
```

## 2.2 Archivos Clave de Biometría

| Archivo | Propósito |
|---------|-----------|
| `lib/faceRecognition.ts` | Face-API.js - detección y descriptores |
| `lib/faceVerification.ts` | Verificación con múltiples capturas |
| `lib/cascadeVerification.ts` | Orquestador de los 3 proveedores |
| `lib/googleVision.ts` | Cliente Google Cloud Vision |
| `lib/awsRekognition.ts` | Cliente AWS Rekognition (via backend) |

---

# 3. VERIFICACIÓN EN CASCADA

## 3.1 Archivo Principal
`apps/web-admin/src/lib/cascadeVerification.ts`

## 3.2 Configuración

```typescript
const CASCADE_CONFIG = {
  MAX_TOTAL_TIME: 1500,      // Tiempo máximo total (ms)
  GOOGLE_TIMEOUT: 600,       // Timeout Google Vision
  AWS_TIMEOUT: 700,          // Timeout AWS Rekognition
  LOCAL_TIMEOUT: 800,        // Timeout Face-API local
  GOOGLE_WEIGHT: 0.25,       // Peso en score combinado
  AWS_WEIGHT: 0.45,          // Peso en score combinado
  LOCAL_WEIGHT: 0.30,        // Peso en score combinado
  MIN_COMBINED_SCORE: 75,    // Mínimo para aprobar
  MIN_PROVIDERS_PASS: 2,     // Mínimo proveedores que deben aprobar
};
```

## 3.3 Flujo de Verificación

```
┌─────────────────────────────────────────────────────────────┐
│                    verifyCascade()                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Capturar imagen del video (480x480 max, JPEG 70%)      │
│                                                             │
│  2. Ejecutar en PARALELO:                                   │
│     ┌──────────────────┐                                    │
│     │ Google Vision    │──► livenessScore, isRealFace      │
│     └──────────────────┘                                    │
│     ┌──────────────────┐                                    │
│     │ AWS Rekognition  │──► similarity, matchedUserId      │
│     └──────────────────┘                                    │
│     ┌──────────────────┐                                    │
│     │ Face-API Local   │──► confidence, matchedUser        │
│     └──────────────────┘                                    │
│                                                             │
│  3. Analizar resultados:                                    │
│     - Contar proveedores que aprueban                       │
│     - Calcular score combinado (ponderado)                  │
│     - Determinar usuario (prioridad: AWS > Local)           │
│     - Verificar anti-spoofing                               │
│                                                             │
│  4. Decisión final:                                         │
│     SUCCESS si:                                             │
│       - providersPass >= minProviders (2, o 1 si alta conf) │
│       - combinedScore >= 75%                                │
│       - isRealFace = true                                   │
│       - matchedUser != null                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 3.4 Lógica de Aprobación

```typescript
// Un proveedor "aprueba" si:
// - Google: success && faceDetected && isRealFace
// - AWS: success && matched && confidence >= 80
// - Local: success && confidence >= 70

// Casos especiales:
// - Si AWS confirma con >90%: solo necesita 1 proveedor
// - Si Local confirma con >90%: solo necesita 1 proveedor
// - Si alta confianza: liveness puede ser >= 40% (en vez de 70%)
```

## 3.5 Resultado (CascadeResult)

```typescript
interface CascadeResult {
  success: boolean;
  user: RegisteredUser | null;
  confidence: number;           // Score combinado
  verificationTimeMs: number;
  providers: {
    googleVision: {
      success: boolean;
      confidence: number;
      antiSpoofing: { isRealFace: boolean; livenessScore: number };
      timeMs: number;
    };
    awsRekognition: {
      success: boolean;
      confidence: number;
      matchedUserId: string | null;
      timeMs: number;
    };
    local: {
      success: boolean;
      confidence: number;
      timeMs: number;
    };
  };
  antiSpoofing: { isRealFace: boolean; livenessScore: number };
  reason: string;
}
```

---

# 4. BASE DE DATOS

## 4.1 Schema Prisma
`apps/backend/prisma/schema.prisma`

## 4.2 Modelo Principal: Practitioner

```prisma
model Practitioner {
  id                      String            @id @default(cuid())
  license                 String            @unique  // Licencia médica (ej: DOC-123456789)
  firstName               String
  lastName                String
  specialty               String
  faceDescriptor          String?           // JSON array [128 números]
  faceImage               String?           // Base64 de imagen facial
  faceRegisteredAt        DateTime?
  createdAt               DateTime          @default(now())
  updatedAt               DateTime          @updatedAt

  // Relaciones
  appointments            Appointment[]
  encounters              Encounter[]
  user                    User?
  // ... más relaciones
}
```

## 4.3 Modelo User (Roles)

```prisma
model User {
  id            String        @id @default(cuid())
  email         String?       @unique
  role          Role          @default(RECEPTIONIST)
  practitionerId String?      @unique
  practitioner  Practitioner? @relation(fields: [practitionerId], references: [id])
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum Role {
  SUPER_ADMIN
  ADMIN
  DOCTOR
  NURSE
  PHARMACIST
  RECEPTIONIST
}
```

## 4.4 Campos Biométricos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `faceDescriptor` | String (JSON) | Array de 128 números Float32 |
| `faceImage` | String (Base64) | Imagen JPEG ~50KB |
| `faceRegisteredAt` | DateTime | Fecha de registro facial |

---

# 5. APIS Y ENDPOINTS

## 5.1 Backend Base URL
```
Producción: https://backend-production-4923.up.railway.app
Local: http://localhost:3001
```

## 5.2 Endpoints de Autenticación

### GET /auth/registered-faces
Obtiene usuarios con rostro registrado.

**Response**:
```json
{
  "count": 2,
  "users": [
    {
      "id": "cmim27yl...",
      "name": "Juan Pérez",
      "license": "DOC-123456789",
      "specialty": "Medicina General",
      "descriptor": "[0.123,-0.456,...]",
      "faceImage": "data:image/jpeg;base64,..."
    }
  ]
}
```

### POST /auth/register-new-user
Registra nuevo usuario con datos faciales.

**Body**:
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "specialty": "Medicina General",
  "role": "DOCTOR",
  "faceDescriptor": "[0.123,-0.456,...]",
  "faceImage": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "cmim27yl...",
    "license": "DOC-123456789",
    "name": "Juan Pérez"
  }
}
```

### POST /auth/register-face
Actualiza rostro de usuario existente.

**Body**:
```json
{
  "odontologoId": "cmim27yl...",
  "faceDescriptor": "[0.123,-0.456,...]",
  "faceImage": "data:image/jpeg;base64,..."
}
```

### POST /auth/login
Login con licencia.

**Body**:
```json
{
  "license": "DOC-123456789"
}
```

**Response**:
```json
{
  "access_token": "eyJhbG...",
  "user": {
    "id": "cmim27yl...",
    "name": "Juan Pérez",
    "role": "DOCTOR"
  }
}
```

### POST /auth/verify-face
Verifica rostro con AWS Rekognition.

**Body**:
```json
{
  "faceImage": "data:image/jpeg;base64,..."
}
```

**Response**:
```json
{
  "success": true,
  "matched": true,
  "user": {
    "id": "cmim27yl...",
    "name": "Juan Pérez"
  },
  "similarity": 95.5,
  "confidence": 95.5
}
```

### POST /auth/compare-faces
Compara dos imágenes directamente.

**Body**:
```json
{
  "sourceImage": "data:image/jpeg;base64,...",
  "targetImage": "data:image/jpeg;base64,..."
}
```

### POST /auth/clear-all-faces
Elimina todos los datos faciales (desarrollo).

**Response**:
```json
{
  "success": true,
  "message": "Se eliminaron los datos faciales de 2 usuarios",
  "cleared": 2
}
```

---

# 6. FRONTEND - ESTRUCTURA

## 6.1 Páginas Principales

| Ruta | Archivo | Descripción |
|------|---------|-------------|
| `/login` | `app/login/page.tsx` | Login con Face ID o licencia |
| `/registro-facial` | `app/registro-facial/page.tsx` | Registro de nuevo usuario |
| `/dashboard` | `app/dashboard/page.tsx` | Panel principal |

## 6.2 Componentes UI (shadcn/ui)

```
components/ui/
├── button.tsx
├── input.tsx
├── card.tsx
├── alert.tsx
├── label.tsx
└── ...
```

## 6.3 Context de Autenticación

`src/context/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

// Uso
const { user, login, logout, isAuthenticated } = useAuth();
```

## 6.4 Configuración API

`src/lib/api.ts`

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL 
  || 'https://backend-production-4923.up.railway.app';
```

---

# 7. BACKEND - ESTRUCTURA

## 7.1 Módulos NestJS

```
src/
├── auth/
│   ├── auth.controller.ts    # Endpoints de autenticación
│   ├── auth.service.ts       # Lógica de negocio
│   └── auth.module.ts
├── biometrics/
│   ├── biometric.controller.ts
│   ├── biometric.service.ts
│   └── dto/
│       ├── biometric-response.dto.ts
│       ├── checkin-biometric.dto.ts
│       └── login-biometric.dto.ts
├── prisma/
│   └── prisma.service.ts     # Conexión a BD
└── main.ts
```

## 7.2 Auth Controller - Métodos Principales

```typescript
@Controller('auth')
export class AuthController {
  
  @Get('registered-faces')
  async getRegisteredFaces() { ... }
  
  @Post('register-new-user')
  async registerNewUser(@Body() body) { ... }
  
  @Post('register-face')
  async registerFace(@Body() body) { ... }
  
  @Post('login')
  async login(@Body() body) { ... }
  
  @Post('verify-face')
  async verifyFace(@Body() body) { ... }
  
  @Post('compare-faces')
  async compareFaces(@Body() body) { ... }
  
  @Post('clear-all-faces')
  async clearAllFaces() { ... }
}
```

## 7.3 AWS Rekognition en Backend

```typescript
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

// Inicialización
const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Comparación
const command = new CompareFacesCommand({
  SourceImage: { Bytes: Buffer.from(sourceImage, 'base64') },
  TargetImage: { Bytes: Buffer.from(targetImage, 'base64') },
  SimilarityThreshold: 70,
});

const response = await rekognitionClient.send(command);
// response.FaceMatches[0].Similarity = 95.5
```

---

# 8. DESPLIEGUE

## 8.1 Plataforma: Railway

### Servicios
- **backend**: NestJS API
- **web-admin**: Next.js Frontend
- **postgres**: Base de datos PostgreSQL

### Comandos Railway CLI

```bash
# Login
railway login

# Ver variables de un servicio
railway variables -s backend

# Agregar variable
railway variables --set AWS_ACCESS_KEY_ID=AKIA... -s backend

# Ver logs
railway logs -s backend

# Redesplegar
railway redeploy -s backend
railway redeploy -s web-admin
```

## 8.2 Variables de Entorno

### Backend
```env
DATABASE_URL=postgresql://...
JWT_SECRET=sassc-jwt-secret-2024-production
CORS_ORIGINS=*
PORT=3001
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### Frontend
```env
NEXT_PUBLIC_API_URL=https://backend-production-4923.up.railway.app
NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY=AIza...
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=AKIA...  # Solo para referencia, no se usa
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=...   # Solo para referencia, no se usa
NEXT_PUBLIC_AWS_REGION=us-east-1
```

## 8.3 Build Commands

### Backend
```json
{
  "build": "nest build",
  "start:prod": "node dist/main"
}
```

### Frontend
```json
{
  "build": "next build",
  "start": "next start"
}
```

---

# 9. CONFIGURACIÓN DE SERVICIOS EXTERNOS

## 9.1 Google Cloud Vision

1. Crear proyecto en Google Cloud Console
2. Habilitar "Cloud Vision API"
3. Crear API Key (sin restricciones o con restricción de dominio)
4. Agregar a variables de entorno: `NEXT_PUBLIC_GOOGLE_CLOUD_API_KEY`

**Endpoint usado**:
```
POST https://vision.googleapis.com/v1/images:annotate?key={API_KEY}
```

**Features usadas**:
- `FACE_DETECTION`: Detectar rostros
- `SAFE_SEARCH_DETECTION`: Detectar contenido inapropiado (usado para liveness)

## 9.2 AWS Rekognition

1. Crear usuario IAM en AWS Console
2. Adjuntar política `AmazonRekognitionFullAccess`
3. Generar Access Key y Secret Key
4. Agregar a variables de entorno del **backend**:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

**Operación usada**: `CompareFaces`

**IMPORTANTE**: Las credenciales AWS deben estar SOLO en el backend, nunca en el frontend (por seguridad de Signature V4).

## 9.3 Face-API.js (Local)

**Modelos requeridos** (en `public/models/`):
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`
- `face_landmark_68_model-weights_manifest.json`
- `face_landmark_68_model-shard1`
- `face_recognition_model-weights_manifest.json`
- `face_recognition_model-shard1`

**Descarga**: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

---

# 10. FLUJOS DE USUARIO

## 10.1 Registro de Usuario

```
┌─────────────────────────────────────────────────────────────┐
│                    /registro-facial                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Usuario llena formulario:                               │
│     - Nombre, Apellido                                      │
│     - Rol (Doctor, Admin, Nurse, etc.)                      │
│     - Especialidad (opcional)                               │
│                                                             │
│  2. Click "Continuar con Captura Facial"                    │
│     - Cargar modelos face-api.js                            │
│     - Iniciar cámara                                        │
│                                                             │
│  3. Captura automática (3 fotos):                           │
│     - Detectar rostro en video                              │
│     - Countdown 3-2-1                                       │
│     - Capturar imagen (480x480, JPEG 70%)                   │
│     - Extraer descriptor facial                             │
│     - Repetir 3 veces                                       │
│                                                             │
│  4. Promediar descriptores:                                 │
│     avgDescriptor[i] = (d1[i] + d2[i] + d3[i]) / 3         │
│                                                             │
│  5. Enviar a backend:                                       │
│     POST /auth/register-new-user                            │
│     { firstName, lastName, role, faceDescriptor, faceImage }│
│                                                             │
│  6. Backend:                                                │
│     - Generar licencia única (DOC-123456789)                │
│     - Crear Practitioner + User                             │
│     - Guardar descriptor y imagen                           │
│                                                             │
│  7. Mostrar licencia al usuario                             │
│     - Redirigir a /login                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 10.2 Login con Face ID

```
┌─────────────────────────────────────────────────────────────┐
│                        /login                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Inicialización:                                         │
│     - Cargar usuarios registrados (GET /auth/registered-faces)
│     - Cargar modelos face-api.js                            │
│     - Iniciar cámara                                        │
│                                                             │
│  2. Detección automática:                                   │
│     - Cada 500ms detectar rostro                            │
│     - Comparar descriptor con usuarios (distancia euclidiana)
│     - Si distancia < 0.5 → posible match                    │
│                                                             │
│  3. Match encontrado → Verificación segura:                 │
│     - Llamar verifyCascade()                                │
│     - Ejecutar 3 proveedores en paralelo                    │
│                                                             │
│  4. Análisis de resultados:                                 │
│     - Google Vision: ¿rostro real?                          │
│     - AWS Rekognition: ¿coincide con BD?                    │
│     - Face-API Local: ¿coincide descriptor?                 │
│                                                             │
│  5. Decisión:                                               │
│     - SUCCESS: Login automático, redirigir a dashboard      │
│     - FAIL: Mostrar error y opciones                        │
│                                                             │
│  6. Alternativa: Login con licencia                         │
│     - Input de licencia                                     │
│     - POST /auth/login { license }                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

# 11. PROBLEMAS CONOCIDOS Y SOLUCIONES

## 11.1 "Request entity too large"

**Causa**: Imagen muy grande (especialmente en iPhone con cámara de alta resolución)

**Solución**: Limitar tamaño de imagen
```typescript
const maxSize = 480;
const scale = Math.min(maxSize / videoWidth, maxSize / videoHeight, 1);
canvas.width = Math.round(videoWidth * scale);
canvas.height = Math.round(videoHeight * scale);
const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);
```

## 11.2 AWS Rekognition no funciona desde frontend

**Causa**: AWS Signature V4 requiere crypto de Node.js, no disponible en navegador

**Solución**: Mover llamadas AWS al backend
```typescript
// Frontend llama al backend
const result = await fetch(`${API_URL}/auth/verify-face`, {
  method: 'POST',
  body: JSON.stringify({ faceImage: imageBase64 }),
});

// Backend usa AWS SDK
const rekognitionClient = new RekognitionClient({ ... });
```

## 11.3 Imagen espejada causa no-match

**Causa**: Registro y verificación capturan imagen de forma diferente

**Solución**: Ambos deben capturar SIN espejo (el espejo es solo visual en el video)
```typescript
// Video muestra espejado (UX)
<video style={{ transform: 'scaleX(-1)' }} />

// Pero captura NO se espeja
ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
// NO usar ctx.scale(-1, 1)
```

## 11.4 Verificación falla con alta confianza local

**Causa**: Lógica requería que AWS confirmara

**Solución**: Permitir que local con >90% también apruebe
```typescript
const localConfirmsIdentity = local.success && local.confidence >= 90;
const highConfidenceMatch = awsConfirmsIdentity || localConfirmsIdentity;
const minProviders = highConfidenceMatch ? 1 : 2;
```

## 11.5 Modelos face-api.js no cargan

**Causa**: Ruta incorrecta o archivos faltantes

**Solución**: Verificar que existan en `public/models/`
```typescript
await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
```

## 11.6 CORS errors

**Causa**: Backend no permite origen del frontend

**Solución**: Configurar CORS en NestJS
```typescript
// main.ts
app.enableCors({
  origin: '*', // o dominios específicos
  credentials: true,
});
```

---

# APÉNDICE A: Generación de Licencias

```typescript
// Formato: {PREFIX}-{RANDOM_9_DIGITS}
// Prefijos por rol:
const LICENSE_PREFIXES = {
  SUPER_ADMIN: 'SUA',
  ADMIN: 'ADM',
  DOCTOR: 'DOC',
  NURSE: 'NUR',
  PHARMACIST: 'PHA',
  RECEPTIONIST: 'REC',
};

// Ejemplo: DOC-123456789
```

---

# APÉNDICE B: Distancia Euclidiana

```typescript
function euclideanDistance(desc1: Float32Array, desc2: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Interpretación:
// < 0.4 = Alta confianza (mismo usuario)
// < 0.5 = Match probable
// < 0.6 = Posible match
// >= 0.6 = No match
```

---

# APÉNDICE C: Comandos Útiles

```bash
# Desarrollo local
cd apps/backend && pnpm dev
cd apps/web-admin && pnpm dev

# Build
pnpm build

# Prisma
cd apps/backend
npx prisma generate
npx prisma db push
npx prisma studio

# Git + Deploy
git add -A
git commit -m "mensaje"
git push
railway redeploy -s backend
railway redeploy -s web-admin

# Limpiar registros faciales
curl -X POST https://backend-production-4923.up.railway.app/auth/clear-all-faces
```

---

**Fin del documento**

*Generado para entrenamiento de IA - SASSC v1.0*
