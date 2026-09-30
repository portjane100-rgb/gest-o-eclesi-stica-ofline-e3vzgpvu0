@echo off
chcp 65001 >nul
title Gestao Eclesiastica - Versao Local Desktop

echo ========================================================
echo       GESTAO ECLESIASTICA - VERSAO LOCAL (OFFLINE)
echo ========================================================
echo.
echo Iniciando o sistema no seu navegador...
echo.

set "SCRIPT_DIR=%~dp0"
set "HTML_FILE=%SCRIPT_DIR%index.html"

:: 1. Tentar abrir no Microsoft Edge em modo aplicativo
start "" msedge --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 2. Tentar abrir no Google Chrome em modo aplicativo
start "" chrome --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 3. Fallback: navegador padrao do sistema
start "" "%HTML_FILE%"

:fim
exit
