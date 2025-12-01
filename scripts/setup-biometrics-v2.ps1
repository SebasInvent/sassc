# SASSC Biometric V2 Setup Script
# Run from project root: .\scripts\setup-biometrics-v2.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SASSC Biometric V2 Setup" -ForegroundColor Cyan
Write-Host "  InsightFace + Mediapipe" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "apps/backend") -or -not (Test-Path "apps/web-admin")) {
    Write-Host "ERROR: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Install frontend dependencies
Write-Host "[1/5] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "apps/web-admin"
pnpm add @mediapipe/tasks-vision onnxruntime-web
Set-Location "../.."

# Step 2: Install backend dependencies
Write-Host "[2/5] Installing backend dependencies..." -ForegroundColor Yellow
Set-Location "apps/backend"
pnpm add @aws-sdk/client-rekognition
Set-Location "../.."

# Step 3: Generate Prisma client
Write-Host "[3/5] Generating Prisma client..." -ForegroundColor Yellow
Set-Location "apps/backend"
npx prisma generate
Set-Location "../.."

# Step 4: Push database changes
Write-Host "[4/5] Pushing database changes..." -ForegroundColor Yellow
Set-Location "apps/backend"
npx prisma db push
Set-Location "../.."

# Step 5: Create models directory
Write-Host "[5/5] Creating models directory..." -ForegroundColor Yellow
$modelsDir = "apps/web-admin/public/models"
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir -Force | Out-Null
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Download ArcFace ONNX model and place in public/models/"
Write-Host "2. Configure AWS credentials in Railway (backend)"
Write-Host "3. Run: pnpm dev"
Write-Host ""
Write-Host "Model download:" -ForegroundColor Yellow
Write-Host "  https://huggingface.co/nickmuchi/mobilefacenet-arcface-onnx"
Write-Host ""
