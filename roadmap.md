SI-Salud: Roadmap y Arquitectura del Proyecto
1. Visión del Producto
SI-Salud es un sistema de gestión hospitalaria moderno, seguro y eficiente, diseñado para optimizar el flujo de pacientes desde la programación de citas hasta la atención clínica, garantizando la integridad y confidencialidad de la historia clínica a través de un control de acceso granular y auditoría completa.

2. Arquitectura General
Monorepo: Gestionado con pnpm para centralizar el código de todas las aplicaciones.
Backend: NestJS (Node.js/TypeScript), Prisma ORM, PostgreSQL.
Frontend (Admin): Next.js (React/TypeScript), TailwindCSS, shadcn/ui.
App Móvil (Paciente): Flutter.
Kiosco (Check-in): Flutter.
Contenerización: Docker y Docker Compose para un entorno de desarrollo y producción consistente.
CI/CD: GitHub Actions para linter, tests y builds automáticos.
3. Roadmap de Desarrollo
Fase 1: Infraestructura y Flujo de Citas (✅ Completado)
 Configuración del Monorepo: Estructura de carpetas y pnpm workspaces.
 Backend Base: Inicialización de NestJS, Docker, Prisma y conexión a BBDD.
 Modelos de Datos Iniciales: Definición de Patient, Practitioner, Organization, 
Appointment
, Encounter, AuditEvent en schema.prisma.
 Autenticación General: Implementación de POST /auth/login con JWT para médicos.
 Auditoría Global: Creación de AuditInterceptor para registrar todas las acciones.
 Script de Seeding: Creación de datos de demostración.
 Dashboard de Citas (v1):
 Página de login en el panel web.
 Tabla para visualizar citas obtenidas de la API.
 CI/CD Básico: Workflow en GitHub Actions para lint y build.
Fase 2: Control de Acceso y Seguridad del Paciente (✅ Completado)
 Flujo de Check-in:
 Endpoint POST /checkin/biometric para crear un Encounter.
 Endpoint POST /triage/{id} para asignar un médico.
 Acceso Granular a la Historia Clínica:
 Endpoint POST /encounter/{id}/grant para generar un token JWT de alcance limitado (scope: 'read:patient-data').
 Creación de 
ScopesGuard
 para proteger endpoints.
 Protección del endpoint GET /fhir/Patient/{id} con el 
ScopesGuard
.
Fase 3: Gestión de la Historia Clínica (Próximo Paso)
 Módulo de Observaciones (Observation):
 Añadir modelo Observation a schema.prisma (relacionado con Encounter).
 Crear endpoints CRUD para Observation (POST, GET por paciente/encuentro).
 Proteger endpoints con 
ScopesGuard
 y un nuevo scope write:patient-data.
 Validar que el patientId del token coincida con el de la observación.
 Módulo de Diagnósticos (Condition):
 Añadir modelo Condition a schema.prisma.
 Crear endpoints CRUD para Condition.
 Proteger y validar de forma similar a Observation.
 Visualización en el Dashboard:
 Crear una vista detallada del paciente en el panel web.
 Mostrar las observaciones y diagnósticos asociados a un encuentro.
Fase 4: Interacción del Usuario Final
 App del Paciente (Flutter):
 Pantalla de login (a definir: ¿email/pass, social, etc.?).
 Pantalla para ver y agendar citas (POST /fhir/Appointment).
 Kiosco de Check-in (Flutter):
 Interfaz para simular reconocimiento facial/huella.
 Llamada al endpoint POST /checkin/biometric.
Fase 5: Funcionalidades Administrativas y de Reportes
 Gestión de "No-Show":
 Endpoint POST /noshow/{appointmentId}.
 Indicador visual en el dashboard para citas perdidas.
 Generación de Resumen Clínico:
 Endpoint POST /summary/{encounterId}/generate para crear un PDF.
 Dashboard de Métricas:
 Gráficos para visualizar tiempos de espera, tasa de no-show, etc.