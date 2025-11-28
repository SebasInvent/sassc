# 🔐 Plan de Integración: Sistema Biométrico Changingbeat → Medicare

## 📋 Resumen Ejecutivo

Integrar el sistema de verificación biométrica existente en **changingbeat** como método de autenticación principal para el sistema médico **Medicare**, permitiendo:

1. **Login biométrico** para personal médico en web-admin
2. **Check-in biométrico** de pacientes en kiosco
3. **Verificación biométrica** en app móvil de pacientes
4. **Registro biométrico** integrado con datos de pacientes

---

## 🎯 Objetivos de la Integración

### Problemas que Resuelve

✅ **Seguridad Mejorada**
- Autenticación multi-factor con biometría
- Eliminación de contraseñas débiles
- Prevención de suplantación de identidad

✅ **Experiencia de Usuario**
- Check-in rápido de pacientes (< 5 segundos)
- Login sin contraseñas para personal médico
- Reducción de tiempos de espera

✅ **Cumplimiento Normativo**
- Trazabilidad de accesos
- Audit logs completos
- Protección de datos sensibles (HIPAA/GDPR)

---

## 🏗️ Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                    MEDICARE - Sistema Médico                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Web Admin   │  │    Kiosco    │  │ Mobile App   │         │
│  │  (Next.js)   │  │  (Flutter)   │  │  (Flutter)   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                  │
│         └─────────────────┼──────────────────┘                  │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────┐           │
│  │         Medicare Backend (NestJS)               │           │
│  │  ┌──────────────────────────────────────────┐   │           │
│  │  │   🆕 Biometric Module (from changingbeat)│   │           │
│  │  │   - Facial Recognition                   │   │           │
│  │  │   - Fingerprint Verification             │   │           │
│  │  │   - Document OCR                         │   │           │
│  │  │   - RA08 Device Integration              │   │           │
│  │  └──────────────────────────────────────────┘   │           │
│  │                                                  │           │
│  │  ┌──────────────────────────────────────────┐   │           │
│  │  │   Existing Modules                       │   │           │
│  │  │   - Auth (JWT + Biometric)               │   │           │
│  │  │   - Patients (FHIR)                      │   │           │
│  │  │   - Encounters                           │   │           │
│  │  │   - Medications                          │   │           │
│  │  └──────────────────────────────────────────┘   │           │
│  └──────────────────────────────────────────────────┘           │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────┐           │
│  │         PostgreSQL Database                     │           │
│  │  - Users (personal médico)                      │           │
│  │  - Patients (pacientes con biometría)           │           │
│  │  - BiometricData (descriptores faciales)        │           │
│  │  - AuditLogs (accesos biométricos)              │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              Hardware Biométrico (Externo)                      │
├─────────────────────────────────────────────────────────────────┤
│  - Tabletas Android ATAIdentifica                               │
│  - Dispositivos RA08/RA08T (Reconocimiento Facial)              │
│  - Lectores de Huella Dactilar                                  │
│  - Lectores de Cédula (MRZ)                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos Propuesta

```
Medicare/
├── apps/
│   ├── backend/
│   │   └── src/
│   │       ├── biometric/                    # 🆕 Módulo biométrico
│   │       │   ├── biometric.module.ts
│   │       │   ├── biometric.service.ts
│   │       │   ├── biometric.controller.ts
│   │       │   ├── dto/
│   │       │   │   ├── register-biometric.dto.ts
│   │       │   │   ├── verify-biometric.dto.ts
│   │       │   │   └── facial-recognition.dto.ts
│   │       │   ├── interfaces/
│   │       │   │   ├── biometric-data.interface.ts
│   │       │   │   └── ra08-device.interface.ts
│   │       │   └── services/
│   │       │       ├── facial-recognition.service.ts
│   │       │       ├── fingerprint.service.ts
│   │       │       ├── ocr.service.ts
│   │       │       └── ra08-integration.service.ts
│   │       │
│   │       ├── auth/                         # ✏️ Modificado
│   │       │   ├── auth.module.ts
│   │       │   ├── auth.service.ts           # + Integración biométrica
│   │       │   ├── auth.controller.ts        # + Endpoints biométricos
│   │       │   ├── strategies/
│   │       │   │   ├── jwt.strategy.ts
│   │       │   │   └── biometric.strategy.ts # 🆕 Nueva estrategia
│   │       │   └── guards/
│   │       │       ├── jwt-auth.guard.ts
│   │       │       └── biometric-auth.guard.ts # 🆕 Nuevo guard
│   │       │
│   │       └── patients/                     # ✏️ Modificado
│   │           ├── patients.service.ts       # + Registro biométrico
│   │           └── dto/
│   │               └── create-patient.dto.ts # + Campos biométricos
│   │
│   ├── web-admin/
│   │   └── src/
│   │       ├── components/
│   │       │   ├── auth/
│   │       │   │   ├── BiometricLogin.tsx        # 🆕 Login biométrico
│   │       │   │   ├── FacialCapture.tsx         # 🆕 Captura facial
│   │       │   │   └── BiometricSetup.tsx        # 🆕 Config biometría
│   │       │   └── patients/
│   │       │       └── BiometricRegistration.tsx # 🆕 Registro paciente
│   │       └── lib/
│   │           └── biometric.ts                  # 🆕 Utilidades
│   │
│   └── kiosk/                                # ✏️ Mejorado
│       └── lib/
│           ├── features/
│           │   ├── biometric_checkin/        # 🆕 Check-in biométrico
│           │   │   ├── screens/
│           │   │   │   ├── facial_scan_screen.dart
│           │   │   │   ├── fingerprint_scan_screen.dart
│           │   │   │   └── verification_screen.dart
│           │   │   ├── providers/
│           │   │   │   └── biometric_provider.dart
│           │   │   └── services/
│           │   │       └── biometric_service.dart
│           │   └── patient_registration/     # ✏️ Modificado
│           │       └── screens/
│           │           └── register_biometric_screen.dart
│           └── core/
│               └── services/
│                   └── ra08_service.dart     # 🆕 Integración RA08
│
└── packages/
    └── shared-types/
        └── src/
            └── biometric/                    # 🆕 Tipos compartidos
                ├── biometric-data.ts
                ├── facial-descriptor.ts
                └── verification-result.ts
```

---

## 🔄 Flujos de Integración

### 1. Login Biométrico - Personal Médico (Web Admin)

```
┌─────────────┐
│   Doctor    │
│  abre web   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Pantalla de Login       │
│ - Email (opcional)      │
│ - [Botón] Login Facial  │
│ - [Botón] Login Huella  │
│ - [Link] Usar contraseña│
└──────┬──────────────────┘
       │ (selecciona facial)
       ▼
┌─────────────────────────┐
│ Captura Facial          │
│ - Webcam activa         │
│ - Guías de posición     │
│ - Captura automática    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Envío a Backend         │
│ POST /auth/biometric    │
│ { faceData: base64 }    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Backend Verifica        │
│ 1. Extrae descriptores  │
│ 2. Compara con DB       │
│ 3. Valida coincidencia  │
│ 4. Genera JWT           │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Respuesta               │
│ { token, user, role }   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Redirige a Dashboard    │
│ - Token guardado        │
│ - Sesión activa         │
│ - Audit log creado      │
└─────────────────────────┘
```

### 2. Check-in Biométrico - Paciente (Kiosco)

```
┌─────────────┐
│  Paciente   │
│ llega kiosco│
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Pantalla de Bienvenida  │
│ "Toque para comenzar"   │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Opciones de Check-in    │
│ - [Botón] Escanear Cara │
│ - [Botón] Huella Dactilar│
│ - [Botón] Cédula        │
└──────┬──────────────────┘
       │ (selecciona cara)
       ▼
┌─────────────────────────┐
│ Dispositivo RA08        │
│ - Reconocimiento facial │
│ - Detección de vida     │
│ - Captura automática    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Backend Identifica      │
│ POST /biometric/verify  │
│ { deviceId, faceData }  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Paciente Identificado   │
│ - Datos cargados        │
│ - Cita encontrada       │
│ - Triage iniciado       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Confirmación            │
│ "Bienvenido [Nombre]"   │
│ "Su cita es a las XX:XX"│
│ "Espere ser llamado"    │
└─────────────────────────┘
```

### 3. Registro Biométrico - Nuevo Paciente

```
┌─────────────┐
│Recepcionista│
│crea paciente│
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ Formulario Paciente     │
│ - Datos demográficos    │
│ - Documento identidad   │
│ - Contacto              │
│ - Seguro médico         │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Paso: Registro Biométrico│
│ "Registrar biometría"   │
│ [Botón] Capturar Foto   │
│ [Botón] Registrar Huella│
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Captura Múltiple        │
│ - 3 fotos (frente, 45°) │
│ - Detección de calidad  │
│ - Validación de vida    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Procesamiento           │
│ 1. Extrae descriptores  │
│ 2. Valida calidad       │
│ 3. Almacena encriptado  │
│ 4. Vincula con paciente │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Registro en RA08        │
│ POST /person/create     │
│ POST /face/create       │
│ { personId, faceData }  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Confirmación            │
│ "Biometría registrada"  │
│ "Paciente puede usar    │
│  check-in automático"   │
└─────────────────────────┘
```

---

## 🗄️ Esquema de Base de Datos

### Tabla: `biometric_data` (Nueva)

```sql
CREATE TABLE biometric_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),           -- Para personal médico
  patient_id UUID REFERENCES patients(id),     -- Para pacientes
  
  -- Datos faciales
  face_descriptors JSONB,                      -- Array de descriptores
  face_photos TEXT[],                          -- URLs de fotos
  face_quality_score DECIMAL(3,2),             -- 0.00 - 1.00
  
  -- Datos de huella
  fingerprint_templates JSONB,                 -- Templates de huellas
  fingerprint_quality_score DECIMAL(3,2),
  
  -- Dispositivos RA08
  ra08_person_id VARCHAR(50),                  -- ID en dispositivo RA08
  ra08_device_ids TEXT[],                      -- Dispositivos registrados
  
  -- Metadatos
  registration_date TIMESTAMP DEFAULT NOW(),
  last_verification TIMESTAMP,
  verification_count INTEGER DEFAULT 0,
  failed_attempts INTEGER DEFAULT 0,
  
  -- Estado
  status VARCHAR(20) DEFAULT 'active',         -- active, suspended, revoked
  is_verified BOOLEAN DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_biometric_user ON biometric_data(user_id);
CREATE INDEX idx_biometric_patient ON biometric_data(patient_id);
CREATE INDEX idx_biometric_ra08 ON biometric_data(ra08_person_id);
```

### Tabla: `biometric_audit_logs` (Nueva)

```sql
CREATE TABLE biometric_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  biometric_data_id UUID REFERENCES biometric_data(id),
  
  -- Evento
  event_type VARCHAR(50),                      -- login, verification, registration, failure
  event_result VARCHAR(20),                    -- success, failure, error
  
  -- Datos del intento
  verification_score DECIMAL(3,2),             -- Confianza de la verificación
  liveness_score DECIMAL(3,2),                 -- Detección de vida
  device_id VARCHAR(100),                      -- Dispositivo usado
  
  -- Contexto
  ip_address INET,
  user_agent TEXT,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_biometric ON biometric_audit_logs(biometric_data_id);
CREATE INDEX idx_audit_event ON biometric_audit_logs(event_type, created_at);
```

### Modificación: Tabla `users` (Existente)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_required BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_biometric_login TIMESTAMP;
```

### Modificación: Tabla `patients` (Existente)

```sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS biometric_registered BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS biometric_registration_date TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allow_biometric_checkin BOOLEAN DEFAULT true;
```

---

## 🔌 API Endpoints

### Autenticación Biométrica

```typescript
// Login con biometría
POST /api/auth/biometric/login
Body: {
  type: 'facial' | 'fingerprint',
  data: string (base64),
  deviceId?: string
}
Response: {
  token: string,
  user: User,
  expiresIn: number
}

// Verificar biometría
POST /api/auth/biometric/verify
Body: {
  userId: string,
  type: 'facial' | 'fingerprint',
  data: string (base64)
}
Response: {
  verified: boolean,
  confidence: number,
  userId: string
}

// Registrar biometría para usuario
POST /api/auth/biometric/register
Body: {
  userId: string,
  facePhotos: string[],
  fingerprintTemplates?: any[]
}
Response: {
  biometricId: string,
  status: 'registered'
}
```

### Gestión de Pacientes con Biometría

```typescript
// Registrar biometría de paciente
POST /api/patients/:id/biometric
Body: {
  facePhotos: string[],
  fingerprintTemplates?: any[],
  ra08DeviceId?: string
}
Response: {
  biometricId: string,
  ra08PersonId: string,
  status: 'registered'
}

// Check-in biométrico
POST /api/patients/checkin/biometric
Body: {
  type: 'facial' | 'fingerprint',
  data: string (base64),
  deviceId: string,
  appointmentId?: string
}
Response: {
  patient: Patient,
  appointment: Appointment,
  encounter: Encounter
}

// Buscar paciente por biometría
POST /api/patients/search/biometric
Body: {
  faceData: string (base64)
}
Response: {
  patients: Patient[],
  confidence: number[]
}
```

### Integración con Dispositivos RA08

```typescript
// Callback de reconocimiento RA08
POST /api/biometric/ra08/callback
Body: {
  deviceKey: string,
  personId: string,
  time: string,
  type: number,
  imgBase64: string,
  searchScore: number,
  livenessScore: number,
  temperature: number
}
Response: {
  success: boolean,
  patient?: Patient
}

// Sincronizar con RA08
POST /api/biometric/ra08/sync
Body: {
  deviceId: string,
  action: 'register' | 'update' | 'delete',
  personId: string,
  faceData?: string
}
Response: {
  success: boolean,
  ra08PersonId: string
}
```

---

## 🛠️ Plan de Migración

### Fase 1: Preparación (2-3 días)

**Backend**
- [ ] Crear módulo `biometric` en Medicare backend
- [ ] Migrar servicios de changingbeat:
  - [ ] `facial-recognition.service.ts`
  - [ ] `fingerprint.service.ts`
  - [ ] `ocr.service.ts`
  - [ ] `ra08-integration.service.ts`
- [ ] Crear DTOs para biometría
- [ ] Crear migraciones de base de datos
- [ ] Configurar variables de entorno

**Frontend Web**
- [ ] Instalar dependencias de captura biométrica
- [ ] Crear componentes de UI para biometría
- [ ] Configurar permisos de cámara/dispositivos

**Kiosco Flutter**
- [ ] Agregar dependencias de biometría
- [ ] Configurar permisos de cámara
- [ ] Crear servicios de comunicación con RA08

### Fase 2: Implementación Backend (3-4 días)

- [ ] Implementar endpoints de autenticación biométrica
- [ ] Integrar con módulo de auth existente
- [ ] Implementar guards y strategies
- [ ] Crear servicios de verificación
- [ ] Implementar audit logs
- [ ] Testing unitario

### Fase 3: Implementación Frontend Web (3-4 días)

- [ ] Pantalla de login biométrico
- [ ] Componente de captura facial
- [ ] Integración con backend
- [ ] Manejo de errores
- [ ] UI/UX optimizada
- [ ] Testing de integración

### Fase 4: Implementación Kiosco (4-5 días)

- [ ] Pantalla de check-in biométrico
- [ ] Integración con RA08
- [ ] Flujo de registro de pacientes
- [ ] Manejo de casos edge
- [ ] Testing en dispositivo real

### Fase 5: Integración RA08 (2-3 días)

- [ ] Configurar dispositivos RA08
- [ ] Implementar callbacks
- [ ] Sincronización de datos
- [ ] Testing de reconocimiento
- [ ] Optimización de precisión

### Fase 6: Testing y Optimización (3-4 días)

- [ ] Testing de seguridad
- [ ] Testing de rendimiento
- [ ] Testing de precisión biométrica
- [ ] Optimización de velocidad
- [ ] Documentación

### Fase 7: Deploy y Monitoreo (2 días)

- [ ] Deploy a staging
- [ ] Testing con usuarios reales
- [ ] Ajustes finales
- [ ] Deploy a producción
- [ ] Monitoreo de métricas

**Total Estimado: 19-25 días**

---

## 🔒 Consideraciones de Seguridad

### Almacenamiento de Datos Biométricos

1. **Encriptación**
   - Descriptores faciales encriptados con AES-256
   - Templates de huellas en formato propietario
   - Claves de encriptación en AWS KMS o similar

2. **Acceso Restringido**
   - Solo servicios autorizados pueden acceder
   - Logs de todos los accesos
   - Rotación de claves periódica

3. **Cumplimiento Legal**
   - Consentimiento explícito del usuario
   - Derecho al olvido (eliminación de datos)
   - Portabilidad de datos
   - Auditorías regulares

### Prevención de Ataques

1. **Anti-Spoofing**
   - Detección de vida (liveness detection)
   - Análisis de textura de piel
   - Detección de pantallas/fotos
   - Validación de profundidad (si disponible)

2. **Rate Limiting**
   - Máximo 3 intentos por minuto
   - Bloqueo temporal tras 5 fallos
   - Alertas de intentos sospechosos

3. **Audit Trail**
   - Log de todos los intentos
   - Geolocalización de accesos
   - Detección de anomalías
   - Alertas en tiempo real

---

## 📊 Métricas de Éxito

### KPIs Técnicos

- ✅ Precisión de reconocimiento facial: > 98%
- ✅ Tasa de falsos positivos: < 0.1%
- ✅ Tasa de falsos negativos: < 2%
- ✅ Tiempo de verificación: < 3 segundos
- ✅ Tiempo de registro: < 30 segundos
- ✅ Disponibilidad del sistema: > 99.9%

### KPIs de Negocio

- ✅ Reducción de tiempo de check-in: > 70%
- ✅ Satisfacción de usuarios: > 4.5/5
- ✅ Adopción de biometría: > 80% en 3 meses
- ✅ Reducción de errores de identificación: > 95%

---

## 🚀 Próximos Pasos Inmediatos

1. **Revisar y aprobar este plan de integración**
2. **Configurar entorno de desarrollo**
3. **Comenzar Fase 1: Preparación**
4. **Crear rama de desarrollo `feature/biometric-integration`**
5. **Iniciar migración de código de changingbeat**

---

**Versión:** 1.0  
**Fecha:** Noviembre 2025  
**Proyecto:** Medicare + Changingbeat Integration  
**Equipo:** Cascade AI + Sebastián
