#!/bin/bash

# ═══════════════════════════════════════════════════════════
# SASSC - Script de preparación para despliegue
# ═══════════════════════════════════════════════════════════

echo "🚀 Preparando SASSC para despliegue..."

# 1. Verificar que estamos en la raíz del proyecto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

# 2. Instalar dependencias
echo "📦 Instalando dependencias..."
pnpm install

# 3. Generar cliente Prisma
echo "🔧 Generando cliente Prisma..."
cd apps/backend
npx prisma generate
cd ../..

# 4. Build del backend
echo "🏗️ Construyendo backend..."
pnpm --filter backend build

# 5. Build del frontend
echo "🏗️ Construyendo frontend..."
pnpm --filter web-admin build

echo ""
echo "✅ ¡Proyecto listo para despliegue!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Sube el código a GitHub"
echo "   2. Conecta Railway con tu repositorio"
echo "   3. Agrega PostgreSQL en Railway"
echo "   4. Configura las variables de entorno"
echo "   5. Conecta Vercel con tu repositorio"
echo ""
echo "📖 Lee DEPLOY.md para instrucciones detalladas"
