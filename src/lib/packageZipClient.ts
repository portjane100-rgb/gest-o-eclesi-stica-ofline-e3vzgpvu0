/**
 * Utilitário cliente para gerar o arquivo .ZIP do sistema local offline
 * no próprio navegador do usuário (sem depender de internet ou servidor).
 * Usa compressão ZIP padrão sem bibliotecas externas pesadas.
 */

export interface ZipFileInfo {
  relativePath: string
  content: string | Uint8Array
}

// CRC32 table para cálculo de integridade do ZIP
const makeCrcTable = () => {
  let c: number
  const crcTable: number[] = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    crcTable[n] = c
  }
  return crcTable
}
const CRC_TABLE = makeCrcTable()

function crc32(buf: Uint8Array): number {
  let crc = 0 ^ -1
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

/**
 * Construtor básico de ZIP Store (sem compressão proprietária ou Deflate puro)
 * 100% suportado nativamente pelo Windows Explorer, macOS Archive Utility e Linux.
 */
export function buildZipBlob(files: ZipFileInfo[]): Blob {
  const parts: BlobPart[] = []
  const centralDirParts: BlobPart[] = []
  let offset = 0

  const textEncoder = new TextEncoder()

  for (const file of files) {
    const filenameBytes = textEncoder.encode(file.relativePath)
    const contentBytes =
      typeof file.content === 'string' ? textEncoder.encode(file.content) : file.content
    const uncompressedSize = contentBytes.length
    const compressedSize = uncompressedSize
    const fileCrc = crc32(contentBytes)

    // Local file header (30 bytes + filename length)
    const localHeader = new ArrayBuffer(30 + filenameBytes.length)
    const view = new DataView(localHeader)

    view.setUint32(0, 0x04034b50, true) // Local file header signature
    view.setUint16(4, 20, true) // Version needed to extract (2.0)
    view.setUint16(6, 0x0800, true) // General purpose bit flag (UTF-8)
    view.setUint16(8, 0, true) // Compression method: 0 (store)
    view.setUint16(10, 0, true) // File last mod time
    view.setUint16(12, 0, true) // File last mod date
    view.setUint32(14, fileCrc, true) // CRC-32
    view.setUint32(18, compressedSize, true) // Compressed size
    view.setUint32(22, uncompressedSize, true) // Uncompressed size
    view.setUint16(26, filenameBytes.length, true) // File name length
    view.setUint16(28, 0, true) // Extra field length

    new Uint8Array(localHeader, 30).set(filenameBytes)

    parts.push(localHeader)
    parts.push(contentBytes.buffer as ArrayBuffer)

    // Central directory header (46 bytes + filename length)
    const cdHeader = new ArrayBuffer(46 + filenameBytes.length)
    const cdView = new DataView(cdHeader)

    cdView.setUint32(0, 0x02014b50, true) // Central directory header signature
    cdView.setUint16(4, 20, true) // Version made by
    cdView.setUint16(6, 20, true) // Version needed to extract
    cdView.setUint16(8, 0x0800, true) // General purpose bit flag (UTF-8)
    cdView.setUint16(10, 0, true) // Compression method: 0 (store)
    cdView.setUint16(12, 0, true) // File last mod time
    cdView.setUint16(14, 0, true) // File last mod date
    cdView.setUint32(16, fileCrc, true) // CRC-32
    cdView.setUint32(20, compressedSize, true) // Compressed size
    cdView.setUint32(24, uncompressedSize, true) // Uncompressed size
    cdView.setUint16(28, filenameBytes.length, true) // File name length
    cdView.setUint16(30, 0, true) // Extra field length
    cdView.setUint16(32, 0, true) // File comment length
    cdView.setUint16(34, 0, true) // Disk number start
    cdView.setUint16(36, 0, true) // Internal file attributes
    cdView.setUint32(38, 0, true) // External file attributes
    cdView.setUint32(42, offset, true) // Relative offset of local header

    new Uint8Array(cdHeader, 46).set(filenameBytes)
    centralDirParts.push(cdHeader)

    offset += localHeader.byteLength + contentBytes.length
  }
  // Central directory start offset
  const centralDirOffset = offset
  let centralDirSize = 0
  for (const cdp of centralDirParts) {
    if (cdp instanceof Uint8Array || cdp instanceof ArrayBuffer) {
      centralDirSize += cdp.byteLength
    }
    parts.push(cdp)
  }

  // End of central directory record (22 bytes)
  const eocd = new ArrayBuffer(22)
  const eocdView = new DataView(eocd)
  eocdView.setUint32(0, 0x06054b50, true) // EOCD signature
  eocdView.setUint16(4, 0, true) // Number of this disk
  eocdView.setUint16(6, 0, true) // Disk where central directory starts
  eocdView.setUint16(8, files.length, true) // Number of central directory records on this disk
  eocdView.setUint16(10, files.length, true) // Total number of central directory records
  eocdView.setUint32(12, centralDirSize, true) // Size of central directory
  eocdView.setUint32(16, centralDirOffset, true) // Offset of start of central directory
  eocdView.setUint16(20, 0, true) // Comment length

  parts.push(eocd)

  return new Blob(parts, { type: 'application/zip' })
}

/**
 * Monta os arquivos do pacote offline cliente e gera o Blob final
 */
export async function gerarPacoteZipNoCliente(
  onProgresso?: (mensagem: string, percentual: number) => void,
): Promise<Blob> {
  onProgresso?.('Preparando arquivos de inicialização...', 15)

  const abrirBat = `@echo off
chcp 65001 >nul
title Gestão Eclesiástica - Versão PC Offline
cls
echo ====================================================================
echo        GESTÃO ECLESIÁSTICA - VERSÃO LOCAL DESKTOP (100%% OFFLINE)
echo ====================================================================
echo.
echo Iniciando sistema local no navegador padrão...
echo.

set "HTML_FILE=%~dp0index.html"

REM 1. Tentar abrir no Google Chrome em modo aplicativo
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="file:///%HTML_FILE%"
    if %errorlevel% equ 0 goto :fim
  )
  if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app="file:///%HTML_FILE%"
    if %errorlevel% equ 0 goto :fim
  )
  if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --app="file:///%HTML_FILE%"
    if %errorlevel% equ 0 goto :fim
  )

  REM 2. Tentar Microsoft Edge
  if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="file:///%HTML_FILE%"
    if %errorlevel% equ 0 goto :fim
  )
  if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="file:///%HTML_FILE%"
    if %errorlevel% equ 0 goto :fim
  )
REM 3. Fallback: abre no navegador padrão do Windows
start "" "%HTML_FILE%"
exit /b 0
`

  const abrirCommand = `#!/bin/bash
DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
HTML_FILE="$DIR/index.html"

echo "===================================================================="
echo "       GESTÃO ECLESIÁSTICA - VERSÃO LOCAL DESKTOP (100% OFFLINE)"
echo "===================================================================="
echo ""
echo "Iniciando sistema local no navegador..."
echo ""

# 1. Tentar Chrome no Mac
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" --args --app="file://$HTML_FILE"
  exit 0
fi

# 2. Tentar Edge no Mac
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
4. No primeiro acesso: O sistema abre livre sem exigir senha pré-definida.
   Crie o seu próprio login e senha de Administrador Geral (Nome, Usuário e Senha).
   Nenhuma conta de revendedor fica gravada. Nas entradas seguintes, use o login criado.
5. Todos os dados ficam salvos no seu próprio PC de forma 100% segura.
`
  }

  onProgresso?.('Empacotando scripts e estilos da aplicação...', 40)

  let instalarBat = ''
  try {
    const res = await fetch('./INSTALAR.bat')
    if (res.ok) instalarBat = await res.text()
  } catch (_) {
    // fallback
  }

  // Coleta os scripts e estilos da página atual para inclusão com URLs relativas
  const files: ZipFileInfo[] = [
    { relativePath: 'Gestao_Eclesiastica_PC/ABRIR_SISTEMA.bat', content: abrirBat },
    { relativePath: 'Gestao_Eclesiastica_PC/ABRIR_SISTEMA.command', content: abrirCommand },
    { relativePath: 'Gestao_Eclesiastica_PC/LEIA-ME.txt', content: leiaMe },
  ]
  if (instalarBat) {
    files.push({ relativePath: 'Gestao_Eclesiastica_PC/INSTALAR.bat', content: instalarBat })
  }

  // Clonar o HTML atual e ajustar os caminhos para relativos e auto-contidos
  try {
    let htmlContent = document.documentElement.outerHTML

    // Remove referências a scripts de terceiros/dev que não fazem sentido em offline
    htmlContent = htmlContent.replace(/<script[^>]*src="[^"]*@vite\/client"[^>]*><\/script>/gi, '')
    htmlContent = htmlContent.replace(/<link[^>]+googleapis\.com[^>]*>/gi, '')
    htmlContent = htmlContent.replace(/<link[^>]+gstatic\.com[^>]*>/gi, '')

    // Converte caminhos absolutos / para relativos ./
    htmlContent = htmlContent.replace(/(href|src)=["']\/([^"']+)["']/g, '$1="./$2"')

    // Injeta scripts inline de estilos capturados do documento
    let inlineStyles = ''
    try {
      const styleSheets = Array.from(document.styleSheets)
      for (const sheet of styleSheets) {
        try {
          if (sheet.cssRules) {
            const rulesText = Array.from(sheet.cssRules)
              .map((r) => r.cssText)
              .join('\n')
            inlineStyles += `<style>\n${rulesText}\n</style>\n`
          }
        } catch (_) {
          // Possível bloqueio de CORS de estilos externos
        }
      }
    } catch (_) {
      // Ignora erro
    }

    if (inlineStyles) {
      htmlContent = htmlContent.replace('</head>', `${inlineStyles}\n</head>`)
    }

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
 * Resolve a URL absoluta ou relativa correta para um recurso estático em public/
 * levando em conta se está rodando em subcaminho, preview ou iframe.
 */
export function getStaticAssetUrl(filename: string): string {
  if (typeof window === 'undefined') return `/${filename}`
  // Respeita a base da página atual se houver base href ou caminho
  const base = document.baseURI || window.location.href
  try {
    return new URL(filename, base).href
  } catch {
    return `./${filename}`
  }
}

/**
 * Dispara o download de um arquivo estático ou URL direta.
 * Funciona de forma robusta dentro de iframes com atributos de download e fallback via window.open.
 */
export function dispararDownloadUrl(url: string, nomeArquivo: string): boolean {
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      if (a.parentNode) {
        document.body.removeChild(a)
      }
    }, 1000)
    return true
  } catch (err) {
    console.warn('Falha no clique da âncora direta:', err)
    try {
      window.open(url, '_blank')
      return true
    } catch {
      return false
    }
  }
}

/**
 * Dispara o download de um Blob no navegador com o nome especificado
 */
export function dispararDownloadBlob(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    if (a.parentNode) {
      document.body.removeChild(a)
    }
    URL.revokeObjectURL(url)
  }, 2000)
}
