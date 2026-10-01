@echo off
chcp 65001 >nul
title Instalacao - Gestao Eclesiastica

echo ========================================
echo      GESTAO ECLESIASTICA
echo      Instalacao
echo ========================================
echo.

set "SOURCE_DIR=%~dp0"

REM --------------------------------------------------------
REM 1. Deteccao de execucao direta de dentro do ZIP / ambiente inadequado
REM --------------------------------------------------------
echo %SOURCE_DIR% | findstr /i "Temp Temp\ WinRAR 7z" >nul
if %errorlevel% equ 0 (
  echo [ERRO] Parece que o instalador esta sendo executado diretamente de dentro do arquivo ZIP.
  echo Primeiro extraia a pasta completa e execute o INSTALAR.bat novamente.
  echo.
  pause
  exit /b 1
)

if not exist "%SOURCE_DIR%index.html" (
  echo [ERRO] Arquivos essenciais nao foram encontrados na pasta de origem.
  echo Primeiro extraia a pasta completa e execute o INSTALAR.bat novamente.
  echo Origem verificada: %SOURCE_DIR%
  echo.
  pause
  exit /b 1
)

if not exist "%SOURCE_DIR%ABRIR_SISTEMA.bat" (
  echo [ERRO] ABRIR_SISTEMA.bat nao foi encontrado na pasta de origem.
  echo Primeiro extraia a pasta completa e execute o INSTALAR.bat novamente.
  echo Origem verificada: %SOURCE_DIR%
  echo.
  pause
  exit /b 1
)

REM --------------------------------------------------------
REM 2. Definir destino em %%LOCALAPPDATA%%\GestaoEclesiastica
REM --------------------------------------------------------
if "%LOCALAPPDATA%"=="" (
  set "DEST_DIR=%USERPROFILE%\AppData\Local\GestaoEclesiastica"
) else (
  set "DEST_DIR=%LOCALAPPDATA%\GestaoEclesiastica"
)

echo Destino: %DEST_DIR%
echo.

REM Criar o diretorio de destino
if not exist "%DEST_DIR%" (
  mkdir "%DEST_DIR%" 2>nul
)

if not exist "%DEST_DIR%" (
  echo [ERRO] Nao foi possivel criar a pasta de destino.
  echo Local esperado: %DEST_DIR%
  echo A instalacao nao foi concluida. Nenhum atalho foi criado.
  echo.
  pause
  exit /b 1
)

REM --------------------------------------------------------
REM 3. Copiar arquivos e tratar explicitamente codigos xcopy
REM    Codigos do xcopy:
REM    0 = Arquivos copiados com sucesso
REM    1 = Nao foram encontrados arquivos para copiar
REM    2 = Cancelado pelo usuario (Ctrl+C)
REM    4 = Erro de inicializacao / memoria insuficiente / parametro invalido
REM    5 = Erro de gravacao em disco / acesso negado
REM --------------------------------------------------------
echo Copiando arquivos...
xcopy "%SOURCE_DIR%*" "%DEST_DIR%\" /E /I /Y /Q >nul 2>nul
set "XCOPY_ERR=%errorlevel%"

if "%XCOPY_ERR%"=="0" goto :copia_ok
if "%XCOPY_ERR%"=="1" (
  echo [ERRO] Codigo xcopy 1: Nao foram encontrados arquivos para copiar na origem.
  goto :copia_falhou
)
if "%XCOPY_ERR%"=="2" (
  echo [ERRO] Codigo xcopy 2: Copia cancelada pelo usuario.
  goto :copia_falhou
)
if "%XCOPY_ERR%"=="4" (
  echo [ERRO] Codigo xcopy 4: Erro de inicializacao ou espaco/memoria insuficiente.
  goto :copia_falhou
)
if "%XCOPY_ERR%"=="5" (
  echo [ERRO] Codigo xcopy 5: Erro de gravacao em disco ou permissao negada.
  goto :copia_falhou
)
echo [ERRO] Erro desconhecido durante a copia dos arquivos (codigo: %XCOPY_ERR%).

:copia_falhou
echo A instalacao nao foi concluida. Nenhum atalho foi criado.
echo Local esperado: %DEST_DIR%
echo.
pause
exit /b 1

:copia_ok
echo [OK] Arquivos copiados

REM --------------------------------------------------------
REM 4. Verificacao fisica e integridade minima dos arquivos
REM    Obrigatorios: index.html, favicon.ico, ABRIR_SISTEMA.bat
REM --------------------------------------------------------
if not exist "%DEST_DIR%\index.html" (
  echo [ERRO] index.html nao foi encontrado. A instalacao nao foi concluida. Nenhum atalho foi criado. Local esperado: %DEST_DIR%\index.html
  echo.
  pause
  exit /b 1
)
echo [OK] index.html encontrado

if not exist "%DEST_DIR%\ABRIR_SISTEMA.bat" (
  echo [ERRO] ABRIR_SISTEMA.bat nao foi encontrado. A instalacao nao foi concluida. Nenhum atalho foi criado. Local esperado: %DEST_DIR%\ABRIR_SISTEMA.bat
  echo.
  pause
  exit /b 1
)

if not exist "%DEST_DIR%\favicon.ico" (
  echo [ERRO] favicon.ico nao foi encontrado. A instalacao nao foi concluida. Nenhum atalho foi criado. Local esperado: %DEST_DIR%\favicon.ico
  echo.
  pause
  exit /b 1
)

echo [OK] Sistema instalado

REM --------------------------------------------------------
REM 5. Criar atalhos na Area de Trabalho e Menu Iniciar
REM --------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$sDesktop = $ws.CreateShortcut(\"$desktop\Gestao Eclesiastica.lnk\"); " ^
  "$sDesktop.TargetPath = '%DEST_DIR%\ABRIR_SISTEMA.bat'; " ^
  "$sDesktop.WorkingDirectory = '%DEST_DIR%'; " ^
  "$sDesktop.Description = 'Gestao Eclesiastica - Sistema Offline'; " ^
  "if (Test-Path '%DEST_DIR%\favicon.ico') { $sDesktop.IconLocation = '%DEST_DIR%\favicon.ico'; } " ^
  "$sDesktop.Save(); " ^
  "$programs = [Environment]::GetFolderPath('Programs'); " ^
  "$sStart = $ws.CreateShortcut(\"$programs\Gestao Eclesiastica.lnk\"); " ^
  "$sStart.TargetPath = '%DEST_DIR%\ABRIR_SISTEMA.bat'; " ^
  "$sStart.WorkingDirectory = '%DEST_DIR%'; " ^
  "$sStart.Description = 'Gestao Eclesiastica - Sistema Offline'; " ^
  "if (Test-Path '%DEST_DIR%\favicon.ico') { $sStart.IconLocation = '%DEST_DIR%\favicon.ico'; } " ^
  "$sStart.Save();" >nul 2>nul

echo [OK] Atalho criado
echo.
echo ========================================
echo      Instalacao concluida!
echo ========================================
echo Pressione qualquer tecla para abrir o sistema.
pause >nul

start "" "%DEST_DIR%\ABRIR_SISTEMA.bat"
exit /b 0
