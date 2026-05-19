# Build local y prueba del container del backend Maia.
#
# Uso desde la raíz del repo:
#   .\scripts\docker-local.ps1
#
# Lo que hace:
#   1. Verifica que data/maia-index.json existe (si no, corre `npm run ingest`).
#   2. `docker build` con tag local "maia:dev".
#   3. Arranca el container exponiendo 8080.
#   4. Hace un curl a /api/health para validar.
#
# Si querés mantener el container corriendo, salí del script con Ctrl+C
# cuando esté listo — el container seguirá vivo. Para pararlo:
#   docker stop maia-local

$ErrorActionPreference = "Stop"
$IMAGE_TAG = "maia:dev"
$CONTAINER_NAME = "maia-local"
$PORT = 8080

Write-Host "→ Maia · build local del backend en Docker" -ForegroundColor Cyan

# 1) Pre-condición: índice generado
if (-not (Test-Path "data/maia-index.json")) {
    Write-Host "⚠ data/maia-index.json no existe — corriendo 'npm run ingest'..." -ForegroundColor Yellow
    npm run ingest
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Ingest falló. Abortando." -ForegroundColor Red
        exit 1
    }
}

# 2) Pre-condición: Docker daemon
docker info --format '{{.ServerVersion}}' 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Docker daemon no está corriendo. Abrí Docker Desktop y volvé a intentar." -ForegroundColor Red
    exit 1
}

# 3) Build
Write-Host "`n→ docker build -t $IMAGE_TAG ." -ForegroundColor Cyan
docker build -t $IMAGE_TAG .
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build falló." -ForegroundColor Red
    exit 1
}

# 4) Limpiar container previo si quedó colgado
docker rm -f $CONTAINER_NAME 2>&1 | Out-Null

# 5) Pre-condición: .env.local con OPENAI_API_KEY
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠ No hay .env.local — el container arrancará sin OPENAI_API_KEY (modo fallback)." -ForegroundColor Yellow
    Write-Host "  Si querés probar con la key real, copiá .env.example a .env.local primero.`n" -ForegroundColor Yellow
    docker run -d --rm --name $CONTAINER_NAME -p "${PORT}:8080" $IMAGE_TAG
} else {
    Write-Host "`n→ docker run con --env-file .env.local en :$PORT" -ForegroundColor Cyan
    docker run -d --rm --name $CONTAINER_NAME -p "${PORT}:8080" --env-file .env.local $IMAGE_TAG
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Container no arrancó." -ForegroundColor Red
    exit 1
}

# 6) Health check — esperar a que el server bindee
Write-Host "`n→ Esperando boot del server (hasta 30s)..." -ForegroundColor Cyan
$ok = $false
for ($i = 0; $i -lt 15; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-RestMethod -Uri "http://localhost:$PORT/api/health" -TimeoutSec 2
        if ($r.ok) {
            $ok = $true
            break
        }
    } catch {
        # sigue esperando
    }
}

if (-not $ok) {
    Write-Host "✗ Health check no respondió. Logs del container:" -ForegroundColor Red
    docker logs $CONTAINER_NAME
    exit 1
}

Write-Host "`n✓ Container corriendo en http://localhost:$PORT" -ForegroundColor Green
Write-Host "  - GET  /api/health"
Write-Host "  - POST /api/maia"
Write-Host "`nLogs en vivo:    docker logs -f $CONTAINER_NAME"
Write-Host "Parar container: docker stop $CONTAINER_NAME"
Write-Host "Smoke test:      `$env:MAIA_URL='http://localhost:$PORT/api/maia'; npm run test:endpoint"
Write-Host ""

# Mostrar health response final
Write-Host "→ /api/health:" -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://localhost:$PORT/api/health" | ConvertTo-Json -Depth 5
