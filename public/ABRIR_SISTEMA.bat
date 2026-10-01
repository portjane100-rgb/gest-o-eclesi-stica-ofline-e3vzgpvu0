@echo off
chcp 65001 >nul
title Gestão Eclesiástica - Versão Local Desktop (100%% Offline)

echo ========================================================
echo       GESTÃO ECLESIÁSTICA — VERSÃO LOCAL DESKTOP
echo ========================================================
echo.
echo Iniciando o sistema no seu computador...
echo Modo 100%% offline ativado com banco local seguro.
echo.

set "SCRIPT_DIR=%~dp0"
set "HTML_FILE=%SCRIPT_DIR%index.html"

:: 1. Tentar abrir no Microsoft Edge em modo aplicativo dedicado (janela limpa sem abas)
start "" msedge --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 2. Tentar abrir no Google Chrome em modo aplicativo dedicado
start "" chrome --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 3. Tentar abrir no Brave se disponível
start "" brave --app="file:///%HTML_FILE:\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 4. Fallback: navegador padrão do Windows
start "" "%HTML_FILE%"

:fim
exit
