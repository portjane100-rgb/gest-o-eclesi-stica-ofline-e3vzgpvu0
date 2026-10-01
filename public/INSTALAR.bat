@echo off
chcp 65001 >nul
REM ========================================================
REM       GESTAO ECLESIASTICA - INSTALADOR PARA WINDOWS
REM ========================================================
REM Copia os arquivos do sistema para C:\GestaoEclesiastica
REM e cria atalhos na Area de Trabalho e no Menu Iniciar.

set "SOURCE_DIR=%~dp0"
set "DEST_DIR=C:\GestaoEclesiastica"

echo Instalando o Sistema de Gestao Eclesiastica...
echo Destino: %DEST_DIR%
echo.

if not exist "%DEST_DIR%" (
  mkdir "%DEST_DIR%"
)

REM Copiar todos os arquivos e subdiretorios
xcopy "%SOURCE_DIR%*" "%DEST_DIR%\" /E /I /Y /Q

REM Criar atalhos via PowerShell
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
  "$sStart.Save();"

echo.
echo ========================================================
echo       INSTALACAO CONCLUIDA COM SUCESSO!
echo ========================================================
echo Atalhos criados na sua Area de Trabalho e Menu Iniciar.
echo Iniciando o sistema agora...
echo.

start "" "%DEST_DIR%\ABRIR_SISTEMA.bat"
exit
