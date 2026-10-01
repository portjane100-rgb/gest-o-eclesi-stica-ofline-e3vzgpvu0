@echo off
chcp 65001 >nul
REM Gestao Eclesiastica - Versao Local Desktop (100%% Offline)
REM Inicia o sistema em modo aplicativo dedicado (Edge/Chrome) ou no navegador padrao

set "SCRIPT_DIR=%~dp0"
set "HTML_FILE=%SCRIPT_DIR%index.html"

REM 1. Tentar abrir no Microsoft Edge em modo aplicativo
start "" msedge --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

REM 2. Tentar abrir no Google Chrome em modo aplicativo
start "" chrome --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

REM 3. Tentar abrir no Brave se disponivel
start "" brave --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

REM 4. Fallback: navegador padrao do Windows
start "" "%~dp0index.html"

:fim
exit
