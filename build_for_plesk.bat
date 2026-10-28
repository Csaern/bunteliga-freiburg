@echo off
setlocal
cd /d "%~dp0"
title Bunte Liga Freiburg - Plesk Build

if exist "%LOCALAPPDATA%\Programs\nodejs" (
    set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build_for_plesk.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [FEHLER] Der Build ist fehlgeschlagen. Bitte pruefe die Fehlermeldung oben.
    echo.
)

pause
