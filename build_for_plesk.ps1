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

# 1. Pruefen ob npm vorhanden ist (inkl. lokaler Node-Installation in AppData)
$localNode = "$env:LOCALAPPDATA\Programs\nodejs"
if ((Test-Path "$localNode\npm.cmd") -and ($env:Path -notlike "*$localNode*")) {
    $env:Path = "$localNode;$env:Path"
}

$hasNpm = Get-Command npm -ErrorAction SilentlyContinue

if ($hasNpm) {
    # 1. Frontend-Abhaengigkeiten installieren
    Write-Host "[1/4] Frontend-Abhaengigkeiten pruefen (Website)..." -ForegroundColor Yellow
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
} else {
    Write-Host "[HINWEIS] 'npm' ist auf diesem Rechner nicht im PATH gefunden worden." -ForegroundColor Cyan
    $backendPublic = "$rootDir\Backend\public"
    if (Test-Path "$backendPublic\index.html") {
        Write-Host "[INFO] Verwende bereits vorhandenen Frontend-Build in Backend\public..." -ForegroundColor Green
    } else {
        Write-Host "[FEHLER] Kein Frontend-Build in Backend\public und kein npm verfuegbar." -ForegroundColor Red
        Write-Host "Bitte installiere Node.js (https://nodejs.org/) oder baue die Website." -ForegroundColor Red
        exit 1
    }
}

# 4. Fertiges deploy_plesk.zip schnüren (Linux-kompatibel mit Vorwaerts-Slashes)
Write-Host "[4/4] Erstelle deploy_plesk.zip fuer den Upload..." -ForegroundColor Yellow
$zipPath = "$rootDir\deploy_plesk.zip"
$backendDir = "$rootDir\Backend"

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)

# Ausschlüsse: uploads (bleibt auf Server!), node_modules, logs, .env, firebase.json
$exclude = @('node_modules', 'uploads', 'logs', '.env', 'firebase.json')

Get-ChildItem -Path $backendDir -Recurse | Where-Object {
    if ($_.PSIsContainer) { return $false }
    $rel = $_.FullName.Substring($backendDir.Length + 1)
    $firstPart = $rel.Split([IO.Path]::DirectorySeparatorChar)[0]
    return ($firstPart -notin $exclude)
} | ForEach-Object {
    $relPath = $_.FullName.Substring($backendDir.Length + 1).Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relPath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}

$zip.Dispose()

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
