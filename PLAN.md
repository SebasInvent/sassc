# Plan de Desarrollo - Sistema de Salud Digital Medicare

## 📋 Estado del Proyecto

**Última Actualización:** 5 de Noviembre, 2025

---

## ✅ Completado

### Módulo de Gestión de Citas
- [x] Backend API para citas (CRUD completo)
- [x] Frontend para visualización de citas
- [x] Sistema de autenticación JWT

### Módulo de Encuentros Clínicos
- [x] Backend: Iniciar encuentro
- [x] Backend: Triage
- [x] Backend: Otorgar acceso
- [x] Backend: Finalizar encuentro
- [x] Frontend: Página de detalle de encuentro
- [x] Frontend: Timer de duración de encuentro
- [x] Frontend: Botón para finalizar encuentro

### Módulo de Diagnósticos (Condiciones)
- [x] Backend API para condiciones
- [x] Frontend: Diálogo para agregar diagnósticos
- [x] Frontend: Dropdowns para estados clínicos
- [x] Frontend: Notificaciones toast
- [x] Frontend: Actualización optimista de UI

### Módulo de Observaciones
- [x] Backend API para observaciones
- [x] Backend: Campos separados para valor numérico y unidad
- [x] Frontend: Diálogo para agregar observaciones
- [x] Frontend: Dropdown para categorías
- [x] Frontend: Inputs separados para cantidad y unidad
- [x] Frontend: Actualización optimista de UI

### Módulo de Gestión de Pacientes (Consulta)
- [x] Backend: Endpoint para listar pacientes
- [x] Backend: Búsqueda de pacientes por nombre/documento
- [x] Backend: Endpoint para detalle de paciente con historial completo
- [x] Frontend: Página de lista de pacientes
- [x] Frontend: Barra de búsqueda
- [x] Frontend: Página de detalle de paciente
- [x] Frontend: Visualización de historial clínico completo
  - [x] Información demográfica
  - [x] Citas
  - [x] Diagnósticos
  - [x] Observaciones

---

## 🚧 En Progreso

### Módulo de Gestión de Pacientes (Creación)
- [ ] **Backend: API para Crear Pacientes**
  - [ ] Paso 1.1: Crear DTO (`create-patient.dto.ts`)
  - [ ] Paso 1.2: Actualizar servicio con método `create()`
  - [ ] Paso 1.3: Crear endpoint `POST /fhir/Patient`
  - [ ] Paso 1.4: Validar datos requeridos
  
- [ ] **Frontend: Interfaz de Creación**
  - [ ] Paso 2.1: Crear componente `AddPatientDialog`
  - [ ] Paso 2.2: Formulario con campos demográficos
  - [ ] Paso 2.3: Integrar en página de lista de pacientes
  - [ ] Paso 2.4: Implementar lógica de guardado
  - [ ] Paso 2.5: Notificaciones y manejo de errores

---

## 📦 Pendiente - Fase 1: Gestión de Medicamentos

### 1.1 Backend: Prescripciones
- [ ] **Paso 1: Crear módulo de medicamentos**
  - [ ] Ejecutar: `docker compose exec backend ./node_modules/.bin/nest g module medications --no-spec`
  - [ ] Ejecutar: `docker compose exec backend ./node_modules/.bin/nest g service medications --no-spec`
  - [ ] Ejecutar: `docker compose exec backend ./node_modules/.bin/nest g controller medications --no-spec`

- [ ] **Paso 2: Crear DTO para prescripciones**
  - [ ] Archivo: `apps/backend/src/medications/dto/create-prescription.dto.ts`
  - [ ] Campos: patientId, encounterId, practitionerId, medicationCode, medicationName, dosage, frequency, duration, instructions, status

- [ ] **Paso 3: Implementar servicio**
  - [ ] Método `create()` para prescripciones
  - [ ] Método `findByPatient()` para historial
  - [ ] Método `findByEncounter()` para consulta actual
  - [ ] Método `update()` para modificar estado

- [ ] **Paso 4: Implementar controlador**
  - [ ] `POST /fhir/MedicationRequest` - Crear prescripción
  - [ ] `GET /fhir/MedicationRequest` - Listar prescripciones
  - [ ] `GET /fhir/MedicationRequest/patient/:id` - Por paciente
  - [ ] `GET /fhir/MedicationRequest/:id` - Detalle
  - [ ] `PATCH /fhir/MedicationRequest/:id` - Actualizar

### 1.2 Frontend: Prescripciones
- [ ] **Paso 1: Componente de diálogo**
  - [ ] Crear `apps/web-admin/src/components/dashboard/add-prescription-dialog.tsx`
  - [ ] Formulario con campos de medicamento
  - [ ] Dropdown para medicamentos comunes
  - [ ] Inputs para dosificación y frecuencia
  - [ ] Integración con SWR

- [ ] **Paso 2: Integrar en página de encuentro**
  - [ ] Agregar botón "Prescribir Medicamento"
  - [ ] Mostrar lista de prescripciones activas
  - [ ] Tabla con detalles de medicamentos

- [ ] **Paso 3: Página de historial de medicamentos**
  - [ ] Crear `apps/web-admin/src/app/dashboard/patients/[id]/medications/page.tsx`
  - [ ] Vista de todas las prescripciones del paciente
  - [ ] Filtros por estado (activo, completado, cancelado)

### 1.3 Backend: Dispensación de Medicamentos
- [ ] **Paso 1: Crear DTO de dispensación**
  - [ ] Archivo: `apps/backend/src/medications/dto/create-dispensation.dto.ts`
  - [ ] Campos: prescriptionId, pharmacyId, dispensedBy, quantity, dispensedDate, notes

- [ ] **Paso 2: Ampliar servicio**
  - [ ] Método `dispense()` para registrar entrega
  - [ ] Método `findDispensations()` para historial
  - [ ] Validar contra prescripción original

- [ ] **Paso 3: Ampliar controlador**
  - [ ] `POST /fhir/MedicationDispense` - Registrar dispensación
  - [ ] `GET /fhir/MedicationDispense/prescription/:id` - Por prescripción
  - [ ] `GET /fhir/MedicationDispense` - Historial general

### 1.4 Frontend: Dispensación
- [ ] **Paso 1: Interfaz de farmacia**
  - [ ] Crear `apps/web-admin/src/app/dashboard/pharmacy/page.tsx`
  - [ ] Lista de prescripciones pendientes
  - [ ] Formulario de dispensación
  - [ ] Validación de cantidades

- [ ] **Paso 2: Tracking de medicamentos**
  - [ ] Vista de historial de dispensaciones
  - [ ] Estado de cada medicamento prescrito
  - [ ] Alertas de medicamentos no recogidos

### 1.5 Backend: Inventario de Medicamentos
- [ ] **Paso 1: Ampliar esquema Prisma**
  - [ ] Modelo `MedicationInventory`
  - [ ] Campos: medicationCode, name, quantity, reorderLevel, expirationDate, location
  - [ ] Ejecutar migración

- [ ] **Paso 2: Servicio de inventario**
  - [ ] Método `checkStock()` para disponibilidad
  - [ ] Método `updateStock()` para ajustes
  - [ ] Método `getLowStock()` para alertas
  - [ ] Método `getExpiring()` para vencimientos

- [ ] **Paso 3: Endpoints de inventario**
  - [ ] `GET /fhir/Medication/inventory` - Consultar stock
  - [ ] `POST /fhir/Medication/inventory` - Agregar medicamento
  - [ ] `PATCH /fhir/Medication/inventory/:id` - Actualizar cantidades
  - [ ] `GET /fhir/Medication/inventory/alerts` - Alertas de stock bajo

### 1.6 Frontend: Inventario
- [ ] **Paso 1: Dashboard de farmacia**
  - [ ] Vista de inventario completo
  - [ ] Tabla con búsqueda y filtros
  - [ ] Indicadores de stock bajo
  - [ ] Alertas de vencimientos próximos

- [ ] **Paso 2: Gestión de inventario**
  - [ ] Formulario para agregar medicamentos
  - [ ] Formulario para ajustar cantidades
  - [ ] Registro de entradas y salidas
  - [ ] Reportes de movimientos

### 1.7 Backend: Autorizaciones de Medicamentos
- [ ] **Paso 1: DTO de autorización**
  - [ ] Archivo: `apps/backend/src/medications/dto/create-authorization.dto.ts`
  - [ ] Campos: prescriptionId, requestedBy, reviewedBy, status, notes, validUntil

- [ ] **Paso 2: Flujo de aprobación**
  - [ ] Método `requestAuthorization()` para solicitar
  - [ ] Método `reviewAuthorization()` para aprobar/rechazar
  - [ ] Notificaciones a médico prescriptor

- [ ] **Paso 3: Endpoints de autorización**
  - [ ] `POST /fhir/MedicationAuthorization` - Solicitar
  - [ ] `PATCH /fhir/MedicationAuthorization/:id` - Aprobar/Rechazar
  - [ ] `GET /fhir/MedicationAuthorization` - Lista de pendientes

### 1.8 Frontend: Autorizaciones
- [ ] **Paso 1: Vista de autorizaciones pendientes**
  - [ ] Dashboard para revisores
  - [ ] Detalles de prescripción a autorizar
  - [ ] Botones de aprobar/rechazar

- [ ] **Paso 2: Notificaciones**
  - [ ] Alertas de autorizaciones pendientes
  - [ ] Notificación de respuestas
  - [ ] Historial de decisiones

---

## 📦 Pendiente - Fase 2: Integración Biométrica

### 2.1 Backend: API de Integración
- [ ] **Paso 1: Módulo de biometría**
  - [ ] Crear módulo `biometrics`
  - [ ] Servicio para comunicación con APIs externas
  - [ ] DTOs para registro y verificación

- [ ] **Paso 2: Registro biométrico**
  - [ ] Endpoint `POST /biometrics/register`
  - [ ] Almacenar referencia a ID biométrico
  - [ ] Vincular con paciente

- [ ] **Paso 3: Verificación biométrica**
  - [ ] Endpoint `POST /biometrics/verify`
  - [ ] Validar identidad del paciente
  - [ ] Retornar datos del paciente si es válido

- [ ] **Paso 4: Reconocimiento facial**
  - [ ] Endpoint `POST /biometrics/facial-recognition`
  - [ ] Integración con servicio externo
  - [ ] Manejo de fotos/imágenes

### 2.2 Frontend: Captura Biométrica
- [ ] **Paso 1: Componente de captura**
  - [ ] Interfaz para captura de huella
  - [ ] Interfaz para captura facial
  - [ ] Preview de imagen/datos

- [ ] **Paso 2: Integración en registro**
  - [ ] Agregar paso biométrico al crear paciente
  - [ ] Validación de calidad de captura
  - [ ] Reintento si falla

- [ ] **Paso 3: Verificación en check-in**
  - [ ] Pantalla de verificación biométrica
  - [ ] Auto-población de datos tras verificación exitosa
  - [ ] Manejo de casos de no-match

---

## 📦 Pendiente - Fase 3: Solución Integral de Salud

### 3.1 Portal del Paciente (Nueva App)
- [ ] **Paso 1: Inicializar proyecto Next.js**
  - [ ] Crear `apps/patient-portal`
  - [ ] Configurar autenticación
  - [ ] Diseño responsive

- [ ] **Paso 2: Funcionalidades del paciente**
  - [ ] Ver historial médico
  - [ ] Solicitar citas
  - [ ] Ver prescripciones activas
  - [ ] Descargar resultados de laboratorio
  - [ ] Chat con médico
  - [ ] Recordatorios de medicamentos

### 3.2 App Móvil (React Native)
- [ ] **Paso 1: Inicializar proyecto**
  - [ ] Setup con Expo/React Native
  - [ ] Configurar navegación

- [ ] **Paso 2: Funcionalidades móviles**
  - [ ] Autenticación biométrica local
  - [ ] Notificaciones push
  - [ ] Agenda de citas
  - [ ] Recordatorios de medicamentos
  - [ ] Scanner de códigos QR para check-in

### 3.3 Sistema de Telemedicina
- [ ] **Paso 1: Módulo de videollamadas**
  - [ ] Integración con WebRTC o Twilio
  - [ ] Sala de espera virtual
  - [ ] Grabación de consultas (opcional)

- [ ] **Paso 2: Chat en tiempo real**
  - [ ] WebSocket para mensajería
  - [ ] Notificaciones en tiempo real
  - [ ] Compartir archivos

### 3.4 Sistema de Laboratorio
- [ ] **Paso 1: Backend para resultados**
  - [ ] Módulo `laboratory`
  - [ ] API para cargar resultados
  - [ ] Vincular con encuentros

- [ ] **Paso 2: Frontend para lab**
  - [ ] Dashboard de laboratorio
  - [ ] Cargar resultados digitales
  - [ ] Vista de resultados pendientes

### 3.5 Sistema de Imágenes Diagnósticas
- [ ] **Paso 1: Integración DICOM**
  - [ ] Módulo para manejar imágenes médicas
  - [ ] Almacenamiento seguro
  - [ ] Viewer de imágenes

- [ ] **Paso 2: Ordenes de imágenes**
  - [ ] API para solicitar estudios
  - [ ] Workflow de aprobación
  - [ ] Notificaciones de resultados

### 3.6 Analytics y Reportes
- [ ] **Paso 1: Dashboard administrativo**
  - [ ] Métricas de atención
  - [ ] Tiempos de espera
  - [ ] Indicadores de calidad
  - [ ] Uso de recursos

- [ ] **Paso 2: Reportes epidemiológicos**
  - [ ] Agregación de datos
  - [ ] Visualizaciones
  - [ ] Exportación de reportes

### 3.7 Interoperabilidad
- [ ] **Paso 1: FHIR Completo**
  - [ ] Implementar todos los recursos FHIR necesarios
  - [ ] APIs de integración con otros sistemas
  - [ ] Mapeo de códigos estándar (SNOMED, LOINC)

- [ ] **Paso 2: HL7 Integration**
  - [ ] Parser de mensajes HL7
  - [ ] Integración con sistemas legacy
  - [ ] Transformación de datos

---

## 🎯 Objetivos de la Solución

### Problemas que Resuelve

1. **Fragmentación de Información**
   - ✓ Historial clínico único y centralizado
   - ✓ Acceso desde cualquier punto de atención
   - ✓ Estándar FHIR para interoperabilidad

2. **Tiempos de Espera**
   - ✓ Sistema de citas online
   - ✓ Check-in biométrico rápido
   - ✓ Triaje automatizado
   - ✓ Telemedicina para consultas simples

3. **Gestión de Medicamentos**
   - ✓ Prescripción electrónica
   - ✓ Verificación de disponibilidad en tiempo real
   - ✓ Dispensación controlada
   - ✓ Recordatorios para pacientes

4. **Eficiencia de Recursos**
   - ✓ Optimización de agendas
   - ✓ Reducción de papel
   - ✓ Automatización de procesos administrativos
   - ✓ Analytics para toma de decisiones

5. **Barreras Tecnológicas**
   - ✓ Interfaz intuitiva
   - ✓ Acceso móvil
   - ✓ Biometría para analfabetismo digital
   - ✓ Multi-idioma

---

## 🔧 Tecnologías Utilizadas

### Backend
- NestJS (Framework)
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Docker

### Frontend Web
- Next.js 14+ (App Router)
- React 18+
- TypeScript
- TailwindCSS
- Shadcn/ui
- SWR

### Integraciones Futuras
- WebRTC (Videollamadas)
- WebSocket (Chat)
- React Native (App móvil)
- APIs biométricas externas
- DICOM viewer
- HL7 parser

---

## 📝 Notas de Desarrollo

### Comandos Importantes

```bash
# Backend - Generar módulo
docker compose exec backend ./node_modules/.bin/nest g module [nombre] --no-spec

# Backend - Generar servicio
docker compose exec backend ./node_modules/.bin/nest g service [nombre] --no-spec

# Backend - Generar controlador
docker compose exec backend ./node_modules/.bin/nest g controller [nombre] --no-spec

# Prisma - Regenerar cliente
docker compose exec backend npx prisma generate

# Prisma - Crear migración
docker compose exec backend npx prisma migrate dev --name [nombre]

# Backend - Reiniciar
docker compose up -d --build backend

# Frontend - Agregar componente shadcn
pnpm dlx shadcn@latest add [componente] --cwd apps/web-admin
```

### Convenciones
- DTOs en carpeta `dto/`
- Nombres de archivos en kebab-case
- Interfaces y tipos en PascalCase
- Variables y funciones en camelCase
- Usar JwtAuthGuard en todos los endpoints protegidos
- Usar SWR para data fetching en frontend
- Implementar optimistic UI cuando sea posible
- Notificaciones con Sonner (toast)

---

## 🚀 Próximos Pasos Inmediatos

1. ✅ **Crear este documento de plan**
2. **Implementar creación de pacientes** (Backend + Frontend)
3. **Comenzar con prescripciones de medicamentos** (Fase 1.1)
4. **Continuar con el plan secuencialmente**

---

**Versión del Plan:** 1.0  
**Equipo:** Cascade AI + Sebastián  
**Proyecto:** Medicare - Sistema Integral de Salud Digital para Colombia
