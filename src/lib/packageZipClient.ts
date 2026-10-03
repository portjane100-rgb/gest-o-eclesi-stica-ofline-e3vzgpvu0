/**
 * Utilitário cliente para gerar o arquivo .ZIP do sistema local offline
 * no próprio navegador do usuário (sem depender de arquivos pré-empacotados no servidor).
 * Usa compressão ZIP padrão sem bibliotecas externas pesadas e funciona tanto no browser
 * quanto em ambientes Node/teste que suportam fetch e Blob.
 */

export interface ZipFileInfo {
  relativePath: string
  content: string | Uint8Array
}

export interface ClientZipValidationResult {
  valido: boolean
  erros: string[]
  avisos: string[]
  totalArquivos: number
  tamanhoBytes: number
  arquivos: { nome: string; tamanho: number }[]
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

export function crc32(buf: Uint8Array): number {
  let crc = 0 ^ -1
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

/**
 * Construtor de ZIP Store (método 0)
 * 100% suportado nativamente pelo Windows Explorer (Extrair Tudo), macOS e Linux.
 */
export function buildZipBlob(files: ZipFileInfo[]): Blob {
  const parts: BlobPart[] = []
  const centralDirParts: BlobPart[] = []
  let offset = 0

  const textEncoder = new TextEncoder()

  for (const file of files) {
    const filename = file.relativePath.replace(/\\/g, '/')
    const filenameBytes = textEncoder.encode(filename)
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
 * Converte Uint8Array em Base64 de forma compatível com Browser e Node
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const globalObj =
    typeof globalThis !== 'undefined'
      ? (globalThis as unknown as {
          Buffer?: { from: (b: Uint8Array) => { toString: (enc: string) => string } }
        })
      : undefined
  if (globalObj?.Buffer) {
    return globalObj.Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Infere o MIME type a partir da extensão
 */
function getMimeTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.woff2':
      return 'font/woff2'
    case '.woff':
      return 'font/woff'
    case '.ttf':
      return 'font/ttf'
    case '.svg':
      return 'image/svg+xml'
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.ico':
      return 'image/x-icon'
    case '.webp':
      return 'image/webp'
    case '.json':
      return 'application/json'
    case '.css':
      return 'text/css'
    case '.js':
      return 'application/javascript'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Realiza fetch de um recurso com validação de status HTTP
 */
async function fetchResource(
  url: string,
  asBinary: boolean = false,
): Promise<{ ok: boolean; status: number; text?: string; bytes?: Uint8Array; error?: string }> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `HTTP ${res.status} ${res.statusText}`,
      }
    }
    if (asBinary) {
      const buffer = await res.arrayBuffer()
      return {
        ok: true,
        status: res.status,
        bytes: new Uint8Array(buffer),
      }
    }
    const text = await res.text()
    return {
      ok: true,
      status: res.status,
      text,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err?.message || 'Erro de conexão ou CORS ao baixar recurso',
    }
  }
}

/**
 * Resolve caminhos de CSS referenciados em url(...) embutindo como data-URI
 */
async function inlineCssAssets(
  cssText: string,
  cssBaseUrl: string,
  onAssetWarning?: (msg: string) => void,
): Promise<string> {
  const urlRegex = /url\((['"]?)(\/?[^'")]+)\1\)/g
  const matches = Array.from(cssText.matchAll(urlRegex))

  let processed = cssText

  for (const match of matches) {
    const fullMatch = match[0]
    const rawAsset = (match[2] || '').trim()

    if (
      !rawAsset ||
      rawAsset.startsWith('data:') ||
      rawAsset.startsWith('http://') ||
      rawAsset.startsWith('https://')
    ) {
      continue
    }

    try {
      const resolvedAssetUrl = new URL(rawAsset, cssBaseUrl).href
      const ext =
        rawAsset
          .split('?')[0]
          .split('#')[0]
          .match(/\.[^.]+$/)?.[0] || ''
      const mime = getMimeTypeFromExt(ext)

      const assetRes = await fetchResource(resolvedAssetUrl, true)
      if (assetRes.ok && assetRes.bytes) {
        const b64 = uint8ArrayToBase64(assetRes.bytes)
        const dataUri = `url("data:${mime};base64,${b64}")`
        processed = processed.replace(fullMatch, dataUri)
      } else {
        onAssetWarning?.(`Aviso: Recurso de CSS não baixado (${rawAsset}): ${assetRes.error}`)
      }
    } catch (err: any) {
      onAssetWarning?.(`Aviso: Falha ao processar URL em CSS (${rawAsset}): ${err?.message}`)
    }
  }

  return processed
}

export interface StandaloneHtmlResult {
  html: string
  assetsEmpacotados: { caminho: string; bytes: number }[]
  recursosComErro: { recurso: string; erro: string }[]
}

/**
 * Constrói o HTML autônomo (standalone) reproduzindo e estendendo a lógica
 * de `scripts/generate-pc-zip.mjs` no navegador.
 */
export async function buildStandaloneHtmlFromUrl(
  baseUrl: string,
  onProgresso?: (msg: string, pct: number) => void,
): Promise<StandaloneHtmlResult> {
  const assetsEmpacotados: { caminho: string; bytes: number }[] = []
  const recursosComErro: { recurso: string; erro: string }[] = []

  // 1. Baixar o index.html publicado
  const indexUrl = new URL('./index.html', baseUrl).href
  onProgresso?.('Baixando index.html publicado...', 10)

  const indexRes = await fetchResource(indexUrl, false)
  if (!indexRes.ok || !indexRes.text) {
    recursosComErro.push({
      recurso: 'index.html',
      erro: `Falha ao carregar index.html: ${indexRes.error}`,
    })
    throw new Error(`Falha ao obter index.html publicado (${indexRes.error})`)
  }

  let html = indexRes.text

  // 2. Localizar arquivos CSS referenciados no index.html
  onProgresso?.('Localizando e baixando folhas de estilo CSS...', 25)
  const cssLinkRegex =
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi
  const cssMatches = Array.from(html.matchAll(cssLinkRegex))

  for (const match of cssMatches) {
    const fullTag = match[0]
    const rawHref = (match[1] || match[2] || '').trim()

    if (!rawHref || rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
      // Ignorar CDNs externas se houver
      continue
    }

    const cssUrl = new URL(rawHref, baseUrl).href
    const cleanHref = rawHref.replace(/^\.?\//, '')
    onProgresso?.(`Baixando estilo: ${cleanHref}...`, 30)

    const cssRes = await fetchResource(cssUrl, false)
    if (!cssRes.ok || !cssRes.text) {
      recursosComErro.push({
        recurso: cleanHref,
        erro: `Falha ao carregar CSS essencial ${cleanHref}: ${cssRes.error}`,
      })
      continue
    }

    // Embutir recursos internos do CSS (fontes, SVGs) se existirem
    const inlinedCss = await inlineCssAssets(cssRes.text, cssUrl, (msg) => {
      console.warn(msg)
    })

    const styleTag = `<style>/* Inlined ${cleanHref} */\n${inlinedCss}\n</style>`
    html = html.replace(fullTag, styleTag)
    assetsEmpacotados.push({
      caminho: cleanHref,
      bytes: new TextEncoder().encode(inlinedCss).length,
    })
  }

  // 3. Localizar e embutir scripts JavaScript do bundle
  onProgresso?.('Localizando e embutindo scripts JavaScript...', 45)
  const scriptRegex = /<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi
  const scriptMatches = Array.from(html.matchAll(scriptRegex))

  for (const match of scriptMatches) {
    const fullTag = match[0]
    const rawSrc = match[2]?.trim() || ''

    if (
      !rawSrc ||
      rawSrc.includes('goskip.dev') ||
      rawSrc.startsWith('http://') ||
      rawSrc.startsWith('https://')
    ) {
      continue
    }

    const jsUrl = new URL(rawSrc, baseUrl).href
    const cleanSrc = rawSrc.replace(/^\.?\//, '')
    onProgresso?.(`Baixando script: ${cleanSrc}...`, 55)

    const jsRes = await fetchResource(jsUrl, false)
    if (!jsRes.ok || !jsRes.text) {
      recursosComErro.push({
        recurso: cleanSrc,
        erro: `Falha ao carregar script JS essencial ${cleanSrc}: ${jsRes.error}`,
      })
      continue
    }

    let jsContent = jsRes.text
    // Converter referências a /assets/ em caminhos relativos
    jsContent = jsContent.replace(/["']\/assets\/([^"']+)["']/g, '"./assets/$1"')

    const inlinedScript = `<script type="module">\n/* Inlined ${cleanSrc} */\n${jsContent}\n</script>`
    html = html.replace(fullTag, inlinedScript)
    assetsEmpacotados.push({ caminho: cleanSrc, bytes: new TextEncoder().encode(jsContent).length })
  }

  // 4. Embutir favicon / ícones referenciados
  onProgresso?.('Embutindo ícones e favicon...', 65)
  const iconRegex = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi
  const iconMatches = Array.from(html.matchAll(iconRegex))

  for (const match of iconMatches) {
    const fullTag = match[0]
    const rawHref = match[1]?.trim() || ''

    if (!rawHref || rawHref.startsWith('data:') || rawHref.startsWith('http')) {
      continue
    }

    const iconUrl = new URL(rawHref, baseUrl).href
    const cleanIcon = rawHref.replace(/^\.?\//, '')
    const iconRes = await fetchResource(iconUrl, true)

    if (iconRes.ok && iconRes.bytes) {
      const ext = cleanIcon.match(/\.[^.]+$/)?.[0] || '.ico'
      const mime = getMimeTypeFromExt(ext)
      const b64 = uint8ArrayToBase64(iconRes.bytes)
      const replacedTag = `<link rel="icon" type="${mime}" href="data:${mime};base64,${b64}" />`
      html = html.replace(fullTag, replacedTag)
      assetsEmpacotados.push({ caminho: cleanIcon, bytes: iconRes.bytes.length })
    }
  }

  // 5. Garantir caminhos estáticos relativos (./ em vez de /)
  html = html.replace(/(href|src)=["']\/([^"']+)["']/g, '$1="./$2"')

  // 6. Injetar window.__ADTC_OFFLINE_ONLY__ = true e polyfill para file://
  const headStartTag = '<head>'
  const fileProtocolPatch = `<head>
    <script>
      // Gestão Eclesiástica - Versão PC 100% Offline (blindagem à nuvem)
      window.__ADTC_OFFLINE_ONLY__ = true;
      if (window.location.protocol === 'file:') {
        console.log('Gestão Eclesiástica: Executando em modo 100% Offline (file://)');
      }    </script>`

  if (html.includes(headStartTag)) {
    html = html.replace(headStartTag, fileProtocolPatch)
  } else {
    html = fileProtocolPatch + '\n' + html
  }

  return {
    html,
    assetsEmpacotados,
    recursosComErro,
  }
}

/**
 * Valida o arquivo ZIP gerado e suas entradas
 */
export function validarPacoteZipGerado(
  files: ZipFileInfo[],
  zipBlob: Blob,
): ClientZipValidationResult {
  const erros: string[] = []
  const avisos: string[] = []
  const pastaRaiz = 'Gestao_Eclesiastica_PC/'

  // 1. Arquivo ZIP existe e tamanho > 0
  if (!zipBlob || zipBlob.size <= 0) {
    erros.push('O arquivo ZIP gerado está vazio (tamanho 0 bytes).')
  }

  // 2. Validar presença de index.html
  const indexEntry = files.find(
    (f) => f.relativePath === pastaRaiz + 'index.html' || f.relativePath === 'index.html',
  )
  if (!indexEntry) {
    erros.push('index.html não foi encontrado dentro do pacote.')
  } else {
    const contentStr =
      typeof indexEntry.content === 'string'
        ? indexEntry.content
        : new TextDecoder('utf-8').decode(indexEntry.content)

    if (contentStr.length < 500) {
      erros.push('index.html é pequeno demais, sugerindo arquivo corrompido ou incompleto.')
    }

    if (!contentStr.includes('window.__ADTC_OFFLINE_ONLY__ = true')) {
      erros.push('index.html não contém a injeção obrigatória window.__ADTC_OFFLINE_ONLY__ = true.')
    }

    // Verificar se ainda há scripts apontando para /src/main.tsx sem bundle
    if (contentStr.includes('src="/src/main.tsx"') || contentStr.includes("src='/src/main.tsx'")) {
      avisos.push(
        'index.html parece referenciar /src/main.tsx cru. Certifique-se de usar a versão de build compilada.',
      )
    }
  }

  // 3. Validar arquivos de apoio obrigatórios
  const arquivosObrigatorios = [
    pastaRaiz + 'ABRIR_SISTEMA.bat',
    pastaRaiz + 'INSTALAR.bat',
    pastaRaiz + 'LEIA-ME.txt',
    pastaRaiz + 'favicon.ico',
  ]

  for (const obrigatorio of arquivosObrigatorios) {
    const nomeCurto = obrigatorio.replace(pastaRaiz, '')
    const entry = files.find((f) => f.relativePath === obrigatorio)
    if (!entry) {
      erros.push(`Arquivo de apoio obrigatório ausente no pacote: ${nomeCurto}`)
    } else {
      const len = typeof entry.content === 'string' ? entry.content.length : entry.content.length
      if (len === 0) {
        erros.push(`Arquivo obrigatório ${nomeCurto} está com tamanho 0.`)
      }
    }
  }

  // 4. Validar o conteúdo do INSTALAR.bat
  const instalarEntry = files.find((f) => f.relativePath === pastaRaiz + 'INSTALAR.bat')
  if (instalarEntry) {
    const instalarStr =
      typeof instalarEntry.content === 'string'
        ? instalarEntry.content
        : new TextDecoder('utf-8').decode(instalarEntry.content)

    if (instalarStr.includes('C:\\GestaoEclesiastica')) {
      erros.push('INSTALAR.bat contém referência incorreta a C:\\GestaoEclesiastica.')
    }
    if (!instalarStr.includes('%LOCALAPPDATA%\\GestaoEclesiastica')) {
      erros.push(
        'INSTALAR.bat não contém o caminho de destino esperado %LOCALAPPDATA%\\GestaoEclesiastica.',
      )
    }
    if (!instalarStr.includes('[OK] Arquivos copiados') || !instalarStr.includes('[OK]')) {
      erros.push('INSTALAR.bat não contém as mensagens de confirmação [OK] esperadas.')
    }
  }

  const arquivosList = files.map((f) => ({
    nome: f.relativePath,
    tamanho: typeof f.content === 'string' ? f.content.length : f.content.length,
  }))

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    totalArquivos: files.length,
    tamanhoBytes: zipBlob ? zipBlob.size : 0,
    arquivos: arquivosList,
  }
}

/**
 * Monta os arquivos do pacote offline cliente e gera o Blob final autônomo
 */
export async function gerarPacoteZipNoCliente(
  onProgresso?: (mensagem: string, percentual: number) => void,
): Promise<{ blob: Blob; validacao: ClientZipValidationResult }> {
  const pastaRaiz = 'Gestao_Eclesiastica_PC/'
  const base =
    typeof window !== 'undefined' ? document.baseURI || window.location.href : 'http://localhost/'

  onProgresso?.('Iniciando análise dos arquivos da aplicação...', 5)

  // 1. Obter e processar o index.html com inlining de CSS, scripts e fontes
  const standaloneResult = await buildStandaloneHtmlFromUrl(base, onProgresso)

  if (standaloneResult.recursosComErro.length > 0) {
    const listaErros = standaloneResult.recursosComErro
      .map((r) => `${r.recurso}: ${r.erro}`)
      .join('; ')
    throw new Error(
      `Falha ao baixar recursos essenciais do sistema: ${listaErros}. O ZIP não foi gerado.`,
    )
  }

  // 2. Baixar arquivos de apoio diretamente do site público
  onProgresso?.('Baixando scripts de instalação e arquivos de suporte...', 70)

  const arquivosApoio = [
    { nome: 'INSTALAR.bat', obrigatorio: true, binario: false },
    { nome: 'ABRIR_SISTEMA.bat', obrigatorio: true, binario: false },
    { nome: 'ABRIR_SISTEMA.command', obrigatorio: false, binario: false },
    { nome: 'LEIA-ME.txt', obrigatorio: true, binario: false },
    { nome: 'favicon.ico', obrigatorio: true, binario: true },
    { nome: 'manifest.json', obrigatorio: false, binario: false },
  ]

  const files: ZipFileInfo[] = [
    {
      relativePath: pastaRaiz + 'index.html',
      content: standaloneResult.html,
    },
  ]

  for (const item of arquivosApoio) {
    const itemUrl = new URL(`./${item.nome}`, base).href
    onProgresso?.(`Baixando ${item.nome}...`, 75)

    const res = await fetchResource(itemUrl, item.binario)
    if (!res.ok) {
      if (item.obrigatorio) {
        throw new Error(
          `Não foi possível baixar o arquivo de apoio obrigatório '${item.nome}' (${res.error}). O pacote não pode ser gerado incompleto.`,
        )
      }
      continue
    }

    const content = item.binario ? res.bytes! : res.text!
    files.push({
      relativePath: pastaRaiz + item.nome,
      content,
    })
  }

  // 3. Adicionar versao-pacote.json com metadados
  const metaPacote = JSON.stringify(
    {
      app: 'Gestão Eclesiástica',
      version: '0.0.60',
      buildTimestamp: new Date().toISOString(),
      offlineOnly: true,
      geradoNoCliente: true,
      arquivosTotal: files.length + 1,
    },
    null,
    2,
  )
  files.push({
    relativePath: pastaRaiz + 'versao-pacote.json',
    content: metaPacote,
  })

  // 4. Construir o ZIP Blob
  onProgresso?.('Compactando arquivos no formato ZIP autônomo...', 88)
  const zipBlob = buildZipBlob(files)

  // 5. Validar o ZIP antes de liberar
  onProgresso?.('Executando validação de integridade do pacote...', 95)
  const validacao = validarPacoteZipGerado(files, zipBlob)

  if (!validacao.valido) {
    const msg = validacao.erros.join('; ')
    throw new Error(`Validação do pacote falhou: ${msg}`)
  }

  onProgresso?.('Pacote gerado e verificado com sucesso!', 100)
  return { blob: zipBlob, validacao }
}

/**
 * Resolve a URL absoluta ou relativa para um recurso
 */
export function getStaticAssetUrl(filename: string): string {
  if (typeof window === 'undefined') return `/${filename}`
  const base = document.baseURI || window.location.href
  try {
    return new URL(filename, base).href
  } catch {
    return `./${filename}`
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
  }, 3000)
}
