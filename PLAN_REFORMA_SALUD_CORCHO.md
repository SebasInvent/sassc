# 🏥 Plan Medicare - Alineado con Reforma de Salud (Carolina Corcho)

## Visión General

Medicare será un sistema de información que implemente los pilares de la reforma a la salud propuesta por la Ministra Carolina Corcho, enfocándose en:

1. **Atención Primaria en Salud (APS)** - CAPs como eje central
2. **Sistema Único de Información** - Transparencia total
3. **Giro Directo** - ADRES → Prestadores (sin intermediarios)
4. **Prevención** - Equipos médicos territoriales
5. **Formalización** - Dignificación del trabajo en salud

---

## 📋 Fases de Implementación

### FASE 1: Fundamentos del Sistema (Actual - En Progreso)
**Objetivo**: Establecer la infraestructura base y autenticación segura

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Autenticación Biométrica | ✅ En progreso | Verificación facial obligatoria |
| Gestión de Usuarios | ✅ Completado | Roles y permisos |
| Base de Datos | ✅ Completado | PostgreSQL + Prisma |
| API Backend | ✅ Completado | NestJS |

**Pendiente Fase 1:**
- [ ] Completar flujo de verificación facial
- [ ] Registro facial de usuarios
- [ ] Integración con base de datos de rostros

---

### FASE 2: Centros de Atención Primaria (CAPs)
**Objetivo**: Implementar el modelo de atención primaria territorial

#### 2.1 Gestión de CAPs
```
Entidades:
- CAP (Centro de Atención Primaria)
  - id
  - nombre
  - ubicación (geolocalización)
  - municipio
  - departamento
  - zona (urbana/rural/dispersa)
  - población_asignada (máx 25,000 habitantes)
  - estado (activo/en_construcción/inactivo)
```

#### 2.2 Funciones del CAP según la Reforma
- [ ] **Afiliación** - Registro de pacientes al sistema
- [ ] **Historia Clínica Única** - Creación y gestión
- [ ] **Gestión del Riesgo** - Identificación de pacientes de alto riesgo
- [ ] **Remisiones** - Sistema de referencia a especialistas
- [ ] **Hospitalización** - Búsqueda de camas disponibles
- [ ] **Citas con Especialistas** - Agendamiento centralizado

#### 2.3 Cobertura Territorial
```
Meta: 1 CAP por cada 25,000 habitantes

Dashboard mostrará:
- Mapa de Colombia con CAPs
- Zonas sin cobertura (alertas rojas)
- Población cubierta vs descubierta
- Déficit de personal por zona
```

---

### FASE 3: Sistema Único de Información (SUI)
**Objetivo**: Centralizar toda la información de salud del país

#### 3.1 Historia Clínica Electrónica Unificada
```
Componentes:
- Datos demográficos del paciente
- Antecedentes médicos
- Alergias y condiciones crónicas
- Procedimientos realizados
- Medicamentos formulados
- Imágenes diagnósticas
- Resultados de laboratorio
- Remisiones y hospitalizaciones
```

#### 3.2 Interoperabilidad
- [ ] API pública para consulta ciudadana
- [ ] Integración con IPS (hospitales, clínicas, laboratorios)
- [ ] Blockchain para trazabilidad de transacciones
- [ ] Big Data para análisis epidemiológico

#### 3.3 Transparencia Total
```
Dashboard Público:
- Flujo de recursos en tiempo real
- Pagos a prestadores
- Tiempos de espera por procedimiento
- Disponibilidad de camas por región
- Inventario de medicamentos
```

---

### FASE 4: ADRES Potenciada - Giro Directo
**Objetivo**: Eliminar intermediación, pago directo a prestadores

#### 4.1 Fondos Regionales de Salud
```
Estructura:
- ADRES Nacional (bolsa central)
  └── Fondo Regional Caribe
  └── Fondo Regional Pacífico
  └── Fondo Regional Andina
  └── Fondo Regional Orinoquía
  └── Fondo Regional Amazonía
```

#### 4.2 Flujo de Recursos
```
Antes (Ley 100):
ADRES → EPS → IPS (hospitales)

Después (Reforma Corcho):
ADRES → Fondo Regional → IPS (hospitales)
         ↓
    Consejo Territorial
    (vigilancia ciudadana)
```

#### 4.3 Tarifario Único Nacional
- [ ] Catálogo de procedimientos con precios fijos
- [ ] Ajustes por zona (rural = tarifa mayor)
- [ ] Auditoría automática de facturación
- [ ] Alertas de sobrecostos

---

### FASE 5: Prevención y Equipos Territoriales
**Objetivo**: Llevar la salud a los hogares

#### 5.1 Equipos de Salud Territorial
```
Composición por equipo:
- 1 Médico general
- 2 Enfermeros
- 1 Promotor de salud
- 1 Auxiliar

Cobertura: 1 equipo por cada 5,000 habitantes en zonas rurales
```

#### 5.2 Visitas Domiciliarias
- [ ] Programación de visitas
- [ ] Geolocalización de hogares
- [ ] Registro de atenciones en terreno
- [ ] Identificación de riesgos (embarazos, crónicos, adultos mayores)

#### 5.3 Programas de Prevención
```
- Control prenatal
- Vacunación
- Detección temprana de cáncer
- Control de hipertensión y diabetes
- Salud mental comunitaria
- Nutrición infantil
```

---

### FASE 6: Gestión de Medicamentos
**Objetivo**: Garantizar acceso a medicamentos

#### 6.1 Cadena de Suministro
```
Flujo:
Laboratorios → Operador Logístico Nacional → CAPs → Pacientes
```

#### 6.2 Módulos
- [ ] Inventario centralizado de medicamentos
- [ ] Alertas de desabastecimiento
- [ ] Trazabilidad de lotes
- [ ] Dispensación electrónica
- [ ] Control de medicamentos de alto costo

---

### FASE 7: Talento Humano en Salud
**Objetivo**: Formalización y distribución equitativa

#### 7.1 Registro Nacional de Profesionales
```
Datos:
- Identificación
- Especialidad
- Ubicación actual
- Tipo de contrato
- Salario
- Carga laboral
```

#### 7.2 Indicadores Críticos
```
Metas OMS:
- Médicos: 36 por cada 10,000 hab (actual: 23)
- Enfermería: 88 por cada 10,000 hab (actual: 14)

Dashboard mostrará:
- Déficit por departamento
- Zonas críticas (rojo)
- Incentivos para zonas apartadas
```

#### 7.3 Formalización Laboral
- [ ] Seguimiento de contratos
- [ ] Alertas de prestación de servicios > 6 meses
- [ ] Cálculo de prestaciones adeudadas

---

### FASE 8: Vigilancia y Control (Anti-Corrupción)
**Objetivo**: Prevenir la corrupción que ha plagado el sistema

#### 8.1 Alertas Automáticas
```
Detectar:
- Facturación de pacientes fantasma
- Sobrecostos en medicamentos (>20% del precio regulado)
- Procedimientos duplicados
- Pagos a IPS inexistentes
- Concentración anormal de recursos
```

#### 8.2 Auditoría Ciudadana
- [ ] Portal público de consulta
- [ ] Denuncias anónimas
- [ ] Seguimiento a investigaciones
- [ ] Ranking de transparencia por entidad

#### 8.3 Integración con Supersalud
- [ ] Reportes automáticos de anomalías
- [ ] Historial de sanciones
- [ ] Estado de liquidaciones de EPS

---

## 🎯 Prioridades Inmediatas (Sprint Actual)

### Esta Semana:
1. ✅ Verificación facial funcionando
2. ⏳ Completar flujo de login biométrico
3. 📋 Diseñar modelo de datos para CAPs
4. 📋 Dashboard de cobertura territorial

### Próxima Semana:
1. Módulo de afiliación a CAPs
2. Historia clínica electrónica básica
3. Sistema de remisiones
4. Mapa de cobertura nacional

---

## 📊 Métricas de Éxito

| Indicador | Meta | Actual |
|-----------|------|--------|
| Cobertura de afiliación | 100% | - |
| Tiempo promedio cita general | < 3 días | - |
| Tiempo promedio cita especialista | < 15 días | - |
| Gasto de bolsillo | < 10% | 15% |
| Tutelas por mes | < 1,000 | 17,000 |
| Deuda del sistema | $0 | $16B |

---

## 🔧 Stack Tecnológico

```
Frontend:
- Next.js 14 (React)
- TailwindCSS
- shadcn/ui
- face-api.js (biometría)
- Mapbox/Leaflet (mapas)

Backend:
- NestJS
- Prisma ORM
- PostgreSQL
- Redis (cache)
- Bull (colas)

Infraestructura:
- Docker
- Kubernetes (producción)
- AWS/Azure

Seguridad:
- Verificación facial obligatoria
- JWT + Refresh tokens
- Auditoría de accesos
- Encriptación de datos sensibles
```

---

## 📝 Notas Importantes

### Riesgos Identificados (del análisis de La Pulla):
1. **Transición traumática** - Migrar pacientes sin perder continuidad
2. **Capacidad de ADRES** - Solo tiene experiencia girando cheques
3. **Influencia política** - Fondos regionales pueden ser capturados
4. **Nueva EPS sobrecargada** - 11 millones de pacientes de EPS liquidadas
5. **Déficit de especialistas** - La reforma no lo soluciona

### Mitigaciones en Medicare:
1. Sistema de alertas para detectar problemas en transición
2. Automatización máxima para reducir burocracia
3. Transparencia total para vigilancia ciudadana
4. Distribución inteligente de carga entre CAPs
5. Incentivos visibles para zonas apartadas

---

## 👥 Equipo Necesario

- Product Owner (define prioridades)
- 2 Desarrolladores Frontend
- 2 Desarrolladores Backend
- 1 DBA / DevOps
- 1 Especialista en Salud (dominio)
- 1 UX Designer
- 1 QA

---

*Documento vivo - Actualizar según avance del proyecto y cambios en la reforma*

**Última actualización**: Noviembre 2025
