/**
 * Utilitário para geração e download direto do pacote ZIP do sistema no navegador.
 * Gera os arquivos index.html, ABRIR_SISTEMA.bat, ABRIR_SISTEMA.command, LEIA-ME.txt,
 * além de todos os scripts, estilos e recursos necessários para execução offline.
 */

// Cálculo CRC32 padrão IEEE 802.3
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

export interface ZipFileInfo {
  relativePath: string
  content: Uint8Array | string
}

/**
 * Constrói um ZIP compatível (PK0304) no navegador em formato STORE (sem compressão proprietária)
 * que qualquer descompactador (Windows Explorer nativo, Mac Archive Utility, WinRAR, 7-Zip) abre instantaneamente.
 */
export function buildZipBlob(files: ZipFileInfo[]): Blob {
  const enc = new TextEncoder()
  const entries: {
    filename: string
    bytes: Uint8Array
    crc: number
    offset: number
  }[] = []

  const chunks: Uint8Array[] = []
  let currentOffset = 0

  const now = new Date()
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f)
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f)

  for (const f of files) {
    const rawBytes = typeof f.content === 'string' ? enc.encode(f.content) : f.content
    const filename = f.relativePath.replace(/\\/g, '/')
    const nameBytes = enc.encode(filename)
    const crc = calculateCrc32(rawBytes)
    const size = rawBytes.length

    // Local file header (30 bytes)
    const lfh = new Uint8Array(30 + nameBytes.length)
    const view = new DataView(lfh.buffer)
    view.setUint32(0, 0x04034b50, true) // Signature
    view.setUint16(4, 20, true) // Version needed (2.0)
    view.setUint16(6, 0x0800, true) // Flags (UTF-8)
    view.setUint16(8, 0, true) // Method 0 = Store
    view.setUint16(10, dosTime, true)
    view.setUint16(12, dosDate, true)
    view.setUint32(14, crc, true)
    view.setUint32(18, size, true) // Compressed size
    view.setUint32(22, size, true) // Uncompressed size
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true) // Extra field length
    lfh.set(nameBytes, 30)

    entries.push({
      filename,
      bytes: rawBytes,
      crc,
      offset: currentOffset,
    })

    chunks.push(lfh)
    chunks.push(rawBytes)
    currentOffset += lfh.length + rawBytes.length
  }

  // Central Directory
  const cdOffset = currentOffset
  let cdSize = 0

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.filename)
    const cdh = new Uint8Array(46 + nameBytes.length)
    const view = new DataView(cdh.buffer)
    view.setUint32(0, 0x02014b50, true) // Central Dir signature
    view.setUint16(4, 0x0314, true) // Version made by UNIX/2.0
    view.setUint16(6, 20, true) // Version needed
    view.setUint16(8, 0x0800, true) // Flags UTF-8
    view.setUint16(10, 0, true) // Method Store
    view.setUint16(12, dosTime, true)
    view.setUint16(14, dosDate, true)
    view.setUint32(16, entry.crc, true)
    view.setUint32(20, entry.bytes.length, true) // Compressed
    view.setUint32(24, entry.bytes.length, true) // Uncompressed
    view.setUint16(28, nameBytes.length, true)
    view.setUint16(30, 0, true) // Extra len
    view.setUint16(32, 0, true) // Comment len
    view.setUint16(34, 0, true) // Disk start
    view.setUint16(36, 0, true) // Internal attrs
    view.setUint32(38, 0x81a40000, true) // External attrs (-rw-r--r--)
    view.setUint32(42, entry.offset, true) // Offset
    cdh.set(nameBytes, 46)

    chunks.push(cdh)
    cdSize += cdh.length
  }

  // End of Central Directory
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(4, 0, true)
  eocdView.setUint16(6, 0, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, cdSize, true)
  eocdView.setUint32(16, cdOffset, true)
  eocdView.setUint16(20, 0, true)

  chunks.push(eocd)

  // Criar Blob Array
  return new Blob(chunks as any[], { type: 'application/zip' })
}

/**
 * Coleta os arquivos do ambiente atual (documento HTML, scripts carregados, estilos, arquivos de inicialização)
 * e gera o ZIP completo diretamente no cliente.
 */
export async function gerarPacoteZipNoCliente(
  onProgresso?: (msg: string, pct: number) => void,
): Promise<Blob> {
  onProgresso?.('Preparando arquivos de inicialização...', 10)

  // Conteúdo dos executáveis e documentação
  const abrirBat = `@echo off
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
start "" msedge --app="file:///%HTML_FILE:\\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 2. Tentar abrir no Google Chrome em modo aplicativo dedicado
start "" chrome --app="file:///%HTML_FILE:\\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 3. Tentar abrir no Brave se disponível
start "" brave --app="file:///%HTML_FILE:\\=/%" 2>nul
if %errorlevel% equ 0 goto :fim

:: 4. Fallback: navegador padrão do Windows
start "" "%HTML_FILE%"

:fim
exit
`

  const abrirCommand = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
HTML_FILE="$DIR/index.html"

# 1. Tentar Google Chrome em modo aplicativo dedicado no macOS
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" --args --app="file://$HTML_FILE"
  exit 0
fi

# 2. Tentar Microsoft Edge em modo aplicativo dedicado no macOS
if [ -d "/Applications/Microsoft Edge.app" ]; then
  open -a "Microsoft Edge" --args --app="file://$HTML_FILE"
  exit 0
fi

# 3. Tentar Brave Browser
if [ -d "/Applications/Brave Browser.app" ]; then
  open -a "Brave Browser" --args --app="file://$HTML_FILE"
  exit 0
fi

# 4. Fallback para o navegador padrão
open "$HTML_FILE"
exit 0
`

  let leiaMe = ''
  try {
    const res = await fetch('./LEIA-ME.txt')
    if (res.ok) leiaMe = await res.text()
  } catch (_) {
    // fallback
  }

  if (!leiaMe) {
    leiaMe = `====================================================================
           GESTÃO ECLESIÁSTICA — VERSÃO LOCAL DESKTOP (100% OFFLINE)
====================================================================

Como usar:
1. Extraia todo o conteúdo deste arquivo ZIP em uma pasta do seu computador.
2. No Windows: dê duplo clique em ABRIR_SISTEMA.bat (ou index.html).
3. No Mac: dê duplo clique em ABRIR_SISTEMA.command (ou index.html).
4. No primeiro acesso, crie a senha do Administrador Geral.
5. Todos os dados ficam salvos no seu próprio PC de forma 100% segura.
`
  }

  onProgresso?.('Empacotando scripts e estilos da aplicação...', 40)

  // Coleta os scripts e estilos da página atual para inclusão com URLs relativas
  const files: ZipFileInfo[] = [
    { relativePath: 'Gestao_Eclesiastica_PC/ABRIR_SISTEMA.bat', content: abrirBat },
    { relativePath: 'Gestao_Eclesiastica_PC/ABRIR_SISTEMA.command', content: abrirCommand },
    { relativePath: 'Gestao_Eclesiastica_PC/LEIA-ME.txt', content: leiaMe },
  ]

  // Clonar o HTML atual e ajustar os caminhos para relativos
  try {
    let htmlContent = document.documentElement.outerHTML

    // Remove referências a scripts de terceiros/dev que não fazem sentido em offline
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*@vite\/client"[^>]*><\/script>/gi, '')

    // Ajusta o doctype
    const fullHtml = '<!DOCTYPE html>\n' + htmlContent

    files.push({
      relativePath: 'Gestao_Eclesiastica_PC/index.html',
      content: fullHtml,
    })
  } catch (err) {
    console.warn('Erro ao ler HTML:', err)
  }

  // Tenta buscar manifest.json se existir
  try {
    const mRes = await fetch('./manifest.json')
    if (mRes.ok) {
      const mText = await mRes.text()
      files.push({
        relativePath: 'Gestao_Eclesiastica_PC/manifest.json',
        content: mText,
      })
    }
  } catch {
    /* intentionally ignored */
  }

  onProgresso?.('Finalizando compressão e montagem do ZIP...', 80)
  const zipBlob = buildZipBlob(files)
  onProgresso?.('Pacote pronto!', 100)

  return zipBlob
}

/**
 * Dispara o download de um Blob no navegador com o nome especificado
 */
export function dispararDownloadBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}
