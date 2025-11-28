# Sistema Integrado de Atención en Salud (SI-Salud)

Este es un monorepo que contiene la solución completa para el Sistema Integrado de Atención en Salud, incluyendo backend, panel web, aplicación móvil y kiosco.

## Estructura

- `/apps`: Contiene las aplicaciones principales.
  - `/backend`: Servicio backend (Node.js, NestJS).
  - `/web-admin`: Panel administrativo y clínico (Next.js).
  - `/mobile-patient`: App para pacientes (Flutter).
  - `/kiosk`: App para kiosco biométrico (Flutter).
- `/packages`: Contiene paquetes compartidos.
  - `/shared-types`: Interfaces y tipos de TypeScript (ej. DTOs, modelos FHIR) compartidos entre el backend y el frontend web.
  - `/ui-components`: Componentes de React compartidos.
- `/docs`: Documentación del proyecto (ADRs, diagramas C4).

## Prerrequisitos

- Node.js (v20+)
- pnpm
- Docker y Docker Compose
- Flutter SDK

## Primeros Pasos

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```

2. **Iniciar servicios (desarrollo):**
   ```bash
   pnpm dev
   ```
