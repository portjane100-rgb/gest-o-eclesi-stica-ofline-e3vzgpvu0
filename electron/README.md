# Execução Desktop (Electron) — Gestão Eclesiástica ADTC

Este diretório contém os arquivos de configuração e inicialização do runtime Electron para a versão desktop local do aplicativo.

## Arquivos

- `electron/main.cjs`: Processo principal (Main Process) do Electron.
  - Carrega a janela principal (`BrowserWindow`) apontando para `dist/index.html`.
  - Configurações de segurança ativadas:
    - `contextIsolation: true`
    - `nodeIntegration: false`
    - `sandbox: true`
  - Resolução de janela com tamanho inicial 1440x900 (mínimo 1024x700).
  - Janela oculta até disparar `ready-to-show` para evitar flash em branco.
  - Encerramento apropriado ao fechar janelas (`window-all-closed`).

## Como rodar em desenvolvimento (com Node.js instalado)

```bash
npm run electron:dev
```
Isso compilará o frontend React via Vite (`npm run build`) e em seguida abrirá a janela do Electron carregando a aplicação compilada.

## Como gerar o instalador Setup.exe para Windows

No Windows:
```bash
npm run electron:build
```
Isso executará o `electron-builder --win nsis:x64` conforme definido em `electron-builder.yml`.

O instalador gerado será salvo no diretório:
`release/Gestão Eclesiástica ADTC-Setup-<versão>.exe`

## Persistência de Dados e Funcionamento Offline

- O sistema roda 100% offline via Chromium IndexedDB (`adtc_local_db`).
- No Electron, os bancos de dados IndexedDB e localStorage são mantidos dentro do diretório de perfil seguro do usuário (`userData` do Chromium):
  - No Windows: `%APPDATA%\Gestão Eclesiástica ADTC\`
- Esse diretório fica fora de `Program Files` e NÃO é sobrescrito nem apagado durante reinstalações ou atualizações do aplicativo via instalador NSIS.
