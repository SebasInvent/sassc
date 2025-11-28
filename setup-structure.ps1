#!/usr/bin/env pwsh
# Script para crear la estructura completa del proyecto Medicare
# Ejecutar desde la raíz del proyecto: .\setup-structure.ps1

Write-Host "🚀 Iniciando creación de estructura del proyecto Medicare..." -ForegroundColor Green

# ============================================
# BACKEND - Crear módulos con NestJS CLI
# ============================================

Write-Host "`n📦 Creando módulos del backend..." -ForegroundColor Cyan

# Módulo de Medications
Write-Host "  → Módulo Medications..."
docker compose exec backend ./node_modules/.bin/nest g module medications --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g service medications --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g controller medications --no-spec 2>$null

# Módulo de Biometrics
Write-Host "  → Módulo Biometrics..."
docker compose exec backend ./node_modules/.bin/nest g module biometrics --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g service biometrics --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g controller biometrics --no-spec 2>$null

# Módulo de Laboratory
Write-Host "  → Módulo Laboratory..."
docker compose exec backend ./node_modules/.bin/nest g module laboratory --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g service laboratory --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g controller laboratory --no-spec 2>$null

# Módulo de Imaging
Write-Host "  → Módulo Imaging..."
docker compose exec backend ./node_modules/.bin/nest g module imaging --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g service imaging --no-spec 2>$null
docker compose exec backend ./node_modules/.bin/nest g controller imaging --no-spec 2>$null

# ============================================
# BACKEND - Crear carpetas para DTOs
# ============================================

Write-Host "`n📁 Creando carpetas para DTOs..." -ForegroundColor Cyan

$dtoDirs = @(
    "apps/backend/src/patients/dto",
    "apps/backend/src/medications/dto",
    "apps/backend/src/biometrics/dto",
    "apps/backend/src/laboratory/dto",
    "apps/backend/src/imaging/dto"
)

foreach ($dir in $dtoDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Creado: $dir" -ForegroundColor Green
    }
}

# ============================================
# BACKEND - Crear archivos DTO vacíos
# ============================================

Write-Host "`n📄 Creando archivos DTO..." -ForegroundColor Cyan

$dtoFiles = @(
    # Patients
    "apps/backend/src/patients/dto/create-patient.dto.ts",
    "apps/backend/src/patients/dto/update-patient.dto.ts",
    
    # Medications
    "apps/backend/src/medications/dto/create-prescription.dto.ts",
    "apps/backend/src/medications/dto/update-prescription.dto.ts",
    "apps/backend/src/medications/dto/create-dispensation.dto.ts",
    "apps/backend/src/medications/dto/create-authorization.dto.ts",
    "apps/backend/src/medications/dto/create-inventory.dto.ts",
    "apps/backend/src/medications/dto/update-inventory.dto.ts",
    
    # Biometrics
    "apps/backend/src/biometrics/dto/register-biometric.dto.ts",
    "apps/backend/src/biometrics/dto/verify-biometric.dto.ts",
    "apps/backend/src/biometrics/dto/facial-recognition.dto.ts",
    
    # Laboratory
    "apps/backend/src/laboratory/dto/create-lab-order.dto.ts",
    "apps/backend/src/laboratory/dto/create-lab-result.dto.ts",
    "apps/backend/src/laboratory/dto/update-lab-result.dto.ts",
    
    # Imaging
    "apps/backend/src/imaging/dto/create-imaging-order.dto.ts",
    "apps/backend/src/imaging/dto/create-imaging-result.dto.ts"
)

foreach ($file in $dtoFiles) {
    if (-not (Test-Path $file)) {
        $content = "// TODO: Implement DTO`nexport class $([System.IO.Path]::GetFileNameWithoutExtension($file).Split('-') | ForEach-Object { (Get-Culture).TextInfo.ToTitleCase($_) } | Join-String) {}`n"
        New-Item -ItemType File -Path $file -Force | Out-Null
        Set-Content -Path $file -Value $content
        Write-Host "  ✓ Creado: $file" -ForegroundColor Green
    }
}

# ============================================
# FRONTEND - Crear carpetas para componentes
# ============================================

Write-Host "`n📁 Creando carpetas frontend..." -ForegroundColor Cyan

$frontendDirs = @(
    "apps/web-admin/src/components/dashboard",
    "apps/web-admin/src/app/dashboard/patients",
    "apps/web-admin/src/app/dashboard/pharmacy",
    "apps/web-admin/src/app/dashboard/laboratory",
    "apps/web-admin/src/app/dashboard/imaging",
    "apps/web-admin/src/app/dashboard/analytics"
)

foreach ($dir in $frontendDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Creado: $dir" -ForegroundColor Green
    }
}

# ============================================
# FRONTEND - Crear componentes de diálogos
# ============================================

Write-Host "`n📄 Creando componentes de diálogos..." -ForegroundColor Cyan

$dialogComponents = @(
    "apps/web-admin/src/components/dashboard/add-patient-dialog.tsx",
    "apps/web-admin/src/components/dashboard/add-prescription-dialog.tsx",
    "apps/web-admin/src/components/dashboard/dispense-medication-dialog.tsx",
    "apps/web-admin/src/components/dashboard/authorize-medication-dialog.tsx",
    "apps/web-admin/src/components/dashboard/add-lab-order-dialog.tsx",
    "apps/web-admin/src/components/dashboard/add-lab-result-dialog.tsx",
    "apps/web-admin/src/components/dashboard/add-imaging-order-dialog.tsx",
    "apps/web-admin/src/components/dashboard/biometric-capture.tsx"
)

$dialogTemplate = @'
"use client";

// TODO: Implement component
export function ComponentName() {
  return (
    <div>
      <p>Component to be implemented</p>
    </div>
  );
}
'@

foreach ($file in $dialogComponents) {
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file -Force | Out-Null
        Set-Content -Path $file -Value $dialogTemplate
        Write-Host "  ✓ Creado: $file" -ForegroundColor Green
    }
}

# ============================================
# FRONTEND - Crear páginas
# ============================================

Write-Host "`n📄 Creando páginas frontend..." -ForegroundColor Cyan

$pages = @(
    "apps/web-admin/src/app/dashboard/pharmacy/page.tsx",
    "apps/web-admin/src/app/dashboard/pharmacy/inventory/page.tsx",
    "apps/web-admin/src/app/dashboard/pharmacy/authorizations/page.tsx",
    "apps/web-admin/src/app/dashboard/laboratory/page.tsx",
    "apps/web-admin/src/app/dashboard/laboratory/results/page.tsx",
    "apps/web-admin/src/app/dashboard/imaging/page.tsx",
    "apps/web-admin/src/app/dashboard/imaging/studies/page.tsx",
    "apps/web-admin/src/app/dashboard/analytics/page.tsx"
)

$pageTemplate = @'
"use client";

// TODO: Implement page
export default function Page() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Page Title</h1>
      <p>Page content to be implemented</p>
    </div>
  );
}
'@

foreach ($file in $pages) {
    $dir = Split-Path -Parent $file
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    if (-not (Test-Path $file)) {
        New-Item -ItemType File -Path $file -Force | Out-Null
        Set-Content -Path $file -Value $pageTemplate
        Write-Host "  ✓ Creado: $file" -ForegroundColor Green
    }
}

# ============================================
# Crear archivo de progreso
# ============================================

Write-Host "`n📝 Creando archivo de progreso..." -ForegroundColor Cyan

$progressFile = "PROGRESS.md"
$progressContent = @"
# 📊 Progreso del Proyecto Medicare

**Última Actualización:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

## Estructura Creada

✅ Módulos backend generados
✅ Carpetas DTO creadas
✅ Archivos DTO inicializados
✅ Componentes frontend estructurados
✅ Páginas frontend creadas

## Próximos Pasos

1. Implementar DTOs con validaciones
2. Implementar servicios backend
3. Implementar controladores backend
4. Actualizar schema.prisma con nuevos modelos
5. Crear migraciones de base de datos
6. Implementar componentes frontend
7. Implementar páginas frontend
8. Testing e2e

Ver **PLAN.md** para el plan completo.
"@

Set-Content -Path $progressFile -Value $progressContent
Write-Host "  ✓ Creado: $progressFile" -ForegroundColor Green

# ============================================
# Resumen
# ============================================

Write-Host "`n✨ ¡Estructura del proyecto creada exitosamente!" -ForegroundColor Green
Write-Host "`n📋 Resumen:" -ForegroundColor Yellow
Write-Host "  → Módulos backend: medications, biometrics, laboratory, imaging"
Write-Host "  → DTOs creados: patients, medications, biometrics, laboratory, imaging"
Write-Host "  → Componentes: 8 diálogos listos"
Write-Host "  → Páginas: pharmacy, laboratory, imaging, analytics"
Write-Host "`n📖 Consulta PLAN.md para seguir el roadmap completo"
Write-Host "📊 Consulta PROGRESS.md para tracking detallado"
Write-Host "`n🚀 Siguiente paso: Implementar create-patient.dto.ts (ver PLAN.md línea 58)"
