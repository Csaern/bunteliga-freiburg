# ========================================================
# Bunte Liga Freiburg - Automatisches Plesk Build-Skript
# ========================================================
$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $rootDir) { $rootDir = Get-Location }
Set-Location $rootDir

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "     Bunte Liga - Plesk Build Script      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Frontend-Abhängigkeiten installieren
Write-Host "[1/4] Frontend-Abhängigkeiten prüfen (Website)..." -ForegroundColor Yellow
Set-Location "$rootDir\Website"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FEHLER] npm install im Website-Ordner fehlgeschlagen." -ForegroundColor Red
    exit 1
}

# 2. Frontend bauen
Write-Host "[2/4] Baue Frontend (React Production Build)..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FEHLER] npm run build fehlgeschlagen." -ForegroundColor Red
    exit 1
}
Set-Location $rootDir

# 3. Build ins Backend kopieren
Write-Host "[3/4] Kopiere Build-Dateien nach Backend\public..." -ForegroundColor Yellow
$backendPublic = "$rootDir\Backend\public"
if (Test-Path $backendPublic) {
    Remove-Item -Recurse -Force $backendPublic
}
New-Item -ItemType Directory -Path $backendPublic | Out-Null
Copy-Item -Path "$rootDir\Website\build\*" -Destination $backendPublic -Recurse -Force

# 4. Fertiges deploy_plesk.zip schnüren
Write-Host "[4/4] Erstelle deploy_plesk.zip für den Upload..." -ForegroundColor Yellow
$zipPath = "$rootDir\deploy_plesk.zip"
$staging = "$rootDir\temp_staging"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

New-Item -ItemType Directory -Path $staging | Out-Null

# Ausschlüsse: uploads (bleibt auf Server!), node_modules, logs, .env, firebase.json
$exclude = @('node_modules', 'uploads', 'logs', '.env', 'firebase.json')
Get-ChildItem -Path "$rootDir\Backend" | Where-Object { $_.Name -notin $exclude } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $staging -Recurse -Force
}

Compress-Archive -Path "$staging\*" -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $staging

$zipSizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ERFOLG! Bereit für Plesk:" -ForegroundColor Green
Write-Host "  -> deploy_plesk.zip ($zipSizeMb MB)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "So einfach geht der Upload:"
Write-Host "  1. In Plesk zum Dateimanager deiner Domain gehen (Ordner /httpdocs)."
Write-Host "  2. 'deploy_plesk.zip' hochladen und per Klick auf 'Dateien extrahieren' entpacken."
Write-Host "     (Der uploads-Ordner mit Team-Logos auf dem Server bleibt unberührt!)"
Write-Host "  3. Im Plesk Node.js-Dashboard 'NPM Install' anklicken (falls neue Pakete da sind)."
Write-Host "  4. Auf 'App neu starten' klicken."
Write-Host ""
