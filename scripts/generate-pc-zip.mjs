/**
 * Script Node nativo para gerar o pacote ZIP auto-contido do sistema
 * sem dependências externas, usando as APIs nativas zlib e fs.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function calculateCrc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i]
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

export function buildZipBuffer(files) {
  const entries = []
  let currentOffset = 0
  const localFileChunks = []

  const now = new Date()
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f)
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f)

  for (const file of files) {
    const filename = file.relativePath.replace(/\\/g, '/')
    const isDir = filename.endsWith('/')
    const crc = isDir ? 0 : calculateCrc32(file.content)
    const uncompressedSize = isDir ? 0 : file.content.length

    let compressedData = isDir ? Buffer.alloc(0) : zlib.deflateRawSync(file.content, { level: 9 })
    let compressionMethod = 8

    if (!isDir && compressedData.length >= uncompressedSize) {
      compressedData = file.content
      compressionMethod = 0
    }
    const compressedSize = compressedData.length

    const nameBuf = Buffer.from(filename, 'utf-8')
    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(compressionMethod, 8)
    localHeader.writeUInt16LE(dosTime, 10)
    localHeader.writeUInt16LE(dosDate, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressedSize, 18)
    localHeader.writeUInt32LE(uncompressedSize, 22)
    localHeader.writeUInt16LE(nameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)

    const entry = {
      filename,
      buffer: file.content,
      isDir,
      crc,
      uncompressedSize,
      compressedSize,
      compressedData,
      offset: currentOffset,
    }
    entries.push(entry)

    const fullChunk = Buffer.concat([localHeader, nameBuf, compressedData])
    localFileChunks.push(fullChunk)
    currentOffset += fullChunk.length
  }

  const cdOffset = currentOffset
  const cdChunks = []

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.filename, 'utf-8')
    const cdHeader = Buffer.alloc(46)
    cdHeader.writeUInt32LE(0x02014b50, 0)
    cdHeader.writeUInt16LE(0x0314, 4)
    cdHeader.writeUInt16LE(20, 6)
    cdHeader.writeUInt16LE(0x0800, 8)
    const compressionMethod = entry.isDir || entry.compressedSize === entry.uncompressedSize ? 0 : 8
    cdHeader.writeUInt16LE(compressionMethod, 10)
    cdHeader.writeUInt16LE(dosTime, 12)
    cdHeader.writeUInt16LE(dosDate, 14)
    cdHeader.writeUInt32LE(entry.crc, 16)
    cdHeader.writeUInt32LE(entry.compressedSize, 20)
    cdHeader.writeUInt32LE(entry.uncompressedSize, 24)
    cdHeader.writeUInt16LE(nameBuf.length, 28)
    cdHeader.writeUInt16LE(0, 30)
    cdHeader.writeUInt16LE(0, 32)
    cdHeader.writeUInt16LE(0, 34)
    cdHeader.writeUInt16LE(0, 36)
    cdHeader.writeUInt32LE(entry.isDir ? 0x10 : 0x20, 38)
    cdHeader.writeUInt32LE(entry.offset, 42)

    cdChunks.push(Buffer.concat([cdHeader, nameBuf]))
  }

  const cdTotalBuf = Buffer.concat(cdChunks)
  const cdSize = cdTotalBuf.length

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(cdOffset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localFileChunks, cdTotalBuf, eocd])
}

/**
 * Converte um arquivo HTML produzido pelo Vite em um arquivo 100% auto-contido (inline),
 * embutindo CSS, scripts JS e convertendo URLs para relativas ou data-URIs,
 * permitindo que funcione perfeitamente via duplo clique em file:// sem bloqueios de CORS.
 */
export function buildStandaloneHtml(distDir) {
  const indexPath = path.join(distDir, 'index.html')
  if (!fs.existsSync(indexPath)) return null

  let html = fs.readFileSync(indexPath, 'utf-8')

  // 1. Embutir arquivos CSS (<link rel="stylesheet" ... href="/assets/...">)
  const cssLinkRegex =
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>|<link[^>]+href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi
  html = html.replace(cssLinkRegex, (match, href1, href2) => {
    const rawHref = (href1 || href2 || '').trim()
    const cleanHref = rawHref.replace(/^\.?\//, '')
    const fullCssPath = path.join(distDir, cleanHref)
    if (fs.existsSync(fullCssPath)) {
      let cssContent = fs.readFileSync(fullCssPath, 'utf-8')
      // Embutir fontes ou imagens referenciadas no CSS se existirem localmente
      cssContent = cssContent.replace(/url\((['"]?)(\/?[^'")]+)\1\)/g, (uMatch, q, assetUrl) => {
        if (
          assetUrl.startsWith('data:') ||
          assetUrl.startsWith('http://') ||
          assetUrl.startsWith('https://')
        ) {
          return uMatch
        }
        const cleanAsset = assetUrl.replace(/^\.?\//, '')
        const fullAssetPath = path.join(distDir, cleanAsset)
        if (fs.existsSync(fullAssetPath)) {
          const ext = path.extname(cleanAsset).toLowerCase()
          let mime = 'application/octet-stream'
          if (ext === '.woff2') mime = 'font/woff2'
          else if (ext === '.woff') mime = 'font/woff'
          else if (ext === '.ttf') mime = 'font/ttf'
          else if (ext === '.svg') mime = 'image/svg+xml'
          else if (ext === '.png') mime = 'image/png'
          else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg'
          const b64 = fs.readFileSync(fullAssetPath).toString('base64')
          return `url("data:${mime};base64,${b64}")`
        }
        return `url("./${cleanAsset}")`
      })
      return `<style>/* Inlined ${cleanHref} */\n${cssContent}</style>`
    }
    return match
  })

  // 2. Embutir scripts JavaScript (<script type="module" ... src="/assets/...">)
  const scriptRegex = /<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/gi
  html = html.replace(scriptRegex, (match, before, src, after) => {
    if (src.includes('goskip.dev') || src.startsWith('http')) {
      return match
    }
    const cleanSrc = src.replace(/^\.?\//, '')
    const fullJsPath = path.join(distDir, cleanSrc)
    if (fs.existsSync(fullJsPath)) {
      let jsContent = fs.readFileSync(fullJsPath, 'utf-8')
      // Converter referências a /assets/ ou import.meta em caminhos relativos
      jsContent = jsContent.replace(/["']\/assets\/([^"']+)["']/g, '"./assets/$1"')
      return `<script type="module">\n/* Inlined ${cleanSrc} */\n${jsContent}\n</script>`
    }
    return match
  })

  // 3. Embutir favicon / logos se existirem como data URIs para que não haja falha de 404 em file://
  const iconRegex = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/gi
  html = html.replace(iconRegex, (match, iconHref) => {
    const cleanIcon = iconHref.replace(/^\.?\//, '')
    const fullIconPath = path.join(distDir, cleanIcon)
    if (fs.existsSync(fullIconPath)) {
      const ext = path.extname(cleanIcon).toLowerCase()
      const mime = ext === '.png' ? 'image/png' : ext === '.svg' ? 'image/svg+xml' : 'image/x-icon'
      const b64 = fs.readFileSync(fullIconPath).toString('base64')
      return `<link rel="icon" type="${mime}" href="data:${mime};base64,${b64}" />`
    }
    return match
  })

  // 4. Garantir caminhos estáticos relativos (./ em vez de /)
  html = html.replace(/(href|src)=["']\/([^"']+)["']/g, '$1="./$2"')

  // 5. Injetar a flag global window.__ADTC_OFFLINE_ONLY__ = true e polyfill/fallback de segurança para file:// no topo do head
  const headStartTag = '<head>'
  const fileProtocolPatch = `<head>
    <script>
      // Gestão Eclesiástica - Versão PC 100% Offline (blindagem à nuvem)
      window.__ADTC_OFFLINE_ONLY__ = true;
      if (window.location.protocol === 'file:') {
        console.log('Gestão Eclesiástica: Executando em modo 100% Offline (file://)');
      }    </script>`
  html = html.replace(headStartTag, fileProtocolPatch)

  return html
}

export function coletarArquivos(dir, baseDir = dir) {
  const results = []
  if (!fs.existsSync(dir)) return results

  const items = fs.readdirSync(dir, { withFileTypes: true })
  for (const item of items) {
    const fullPath = path.join(dir, item.name)
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/')

    if (item.name.endsWith('.map') || item.name.endsWith('.zip')) {
      continue
    }

    if (item.isDirectory()) {
      results.push(...coletarArquivos(fullPath, baseDir))
    } else {
      results.push({
        relativePath: relPath,
        content: fs.readFileSync(fullPath),
      })
    }
  }

  return results
}

export function gerarPacoteZip() {
  const zipName = 'Gestao_Eclesiastica_Versao_PC.zip'
  const cwd = process.cwd()
  const distDir = path.resolve(cwd, 'dist')
  const publicDir = path.resolve(cwd, 'public')

  console.log(`[ZIP BUILDER] Verificando arquivos para empacotar em ${zipName}...`)

  // FASE 0: Falhar alto se dist/ não existir ou estiver vazio.
  // NUNCA empacotar public/ (código-fonte cru) como fallback silencioso!
  if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
    console.error('ERRO: dist/ não existe ou está vazio. Execute o build antes de gerar o pacote.')
    process.exit(1)
  }

  const distIndexHtml = path.join(distDir, 'index.html')
  if (!fs.existsSync(distIndexHtml)) {
    console.error(
      'ERRO: Arquivo obrigatório ausente: index.html no diretório dist/. Execute o build antes de gerar o pacote.',
    )
    process.exit(1)
  }

  console.log(`[ZIP BUILDER] Usando diretório de build: ${distDir}`)

  // 1. Corrigir dist/index.html para caminhos relativos (./ em vez de /) se o build tiver gerado caminhos absolutos
  // Isso garante que tanto o Electron quanto o pacote standalone resolvam todos os assets locais em file://
  try {
    let distHtmlRaw = fs.readFileSync(distIndexHtml, 'utf-8')
    const patchedDistHtml = distHtmlRaw.replace(
      /(href|src)=["']\/assets\/([^"']+)["']/g,
      '$1="./assets/$2"',
    )
    if (patchedDistHtml !== distHtmlRaw) {
      fs.writeFileSync(distIndexHtml, patchedDistHtml, 'utf-8')
      console.log(
        '[ZIP BUILDER] dist/index.html ajustado para caminhos relativos de assets (./assets/...)',
      )
    }
  } catch (err) {
    console.warn('[ZIP BUILDER] Aviso ao ajustar caminhos relativos em dist/index.html:', err)
  }

  // 2. Gerar o index.html auto-contido / standalone
  console.log(
    '[ZIP BUILDER] Gerando index.html auto-contido (inline JS/CSS) para execução em file://...',
  )
  const standaloneHtml = buildStandaloneHtml(distDir)
  if (!standaloneHtml || standaloneHtml.length < 500) {
    console.error('ERRO: Falha ao compor o index.html auto-contido a partir do dist/.')
    process.exit(1)
  }

  const arquivos = coletarArquivos(distDir)
  if (arquivos.length === 0) {
    console.error('ERRO: dist/ não contém nenhum arquivo para empacotar.')
    process.exit(1)
  }

  // Arquivos auxiliares obrigatórios na raiz do pacote
  const arquivosObrigatorios = ['index.html', 'ABRIR_SISTEMA.bat', 'INSTALAR.bat', 'LEIA-ME.txt']

  // Arquivos opcionais recomendados se presentes
  const arquivosRecomendados = ['ABRIR_SISTEMA.command', 'favicon.ico']

  for (const arq of [...arquivosObrigatorios, ...arquivosRecomendados]) {
    if (arq === 'index.html') continue
    const arqPublic = path.join(publicDir, arq)
    const arqDist = path.join(distDir, arq)

    if (fs.existsSync(arqPublic)) {
      if (!arquivos.some((a) => a.relativePath === arq)) {
        arquivos.push({
          relativePath: arq,
          content: fs.readFileSync(arqPublic),
        })
      }
    } else if (fs.existsSync(arqDist)) {
      if (!arquivos.some((a) => a.relativePath === arq)) {
        arquivos.push({
          relativePath: arq,
          content: fs.readFileSync(arqDist),
        })
      }
    } else if (arquivosObrigatorios.includes(arq)) {
      console.error(
        `ERRO: Arquivo obrigatório ausente: ${arq}. Verifique a pasta public/ ou dist/.`,
      )
      process.exit(1)
    }
  }

  const pastaRaiz = 'Gestao_Eclesiastica_PC/'
  const arquivosNoZip = arquivos.map((a) => {
    // Se for o index.html, substitui pelo conteúdo inlined auto-contido
    if (a.relativePath === 'index.html' || a.relativePath === './index.html') {
      return {
        relativePath: pastaRaiz + 'index.html',
        content: Buffer.from(standaloneHtml, 'utf-8'),
      }
    }
    return {
      relativePath: pastaRaiz + a.relativePath,
      content: a.content,
    }
  })

  // Se por algum motivo o index.html não estava na lista, adiciona explicitamente
  if (!arquivosNoZip.some((a) => a.relativePath === pastaRaiz + 'index.html')) {
    arquivosNoZip.push({
      relativePath: pastaRaiz + 'index.html',
      content: Buffer.from(standaloneHtml, 'utf-8'),
    })
  }

  // Validar se todos os arquivos obrigatórios estão presentes no pacote final
  for (const arq of arquivosObrigatorios) {
    const esperado = pastaRaiz + arq
    if (!arquivosNoZip.some((a) => a.relativePath === esperado)) {
      console.error(`ERRO: Arquivo obrigatório ausente no pacote final: ${arq}`)
      process.exit(1)
    }
  }

  // Validar explicitamente o conteúdo de INSTALAR.bat no pacote
  const instalarEntry = arquivosNoZip.find((a) => a.relativePath === pastaRaiz + 'INSTALAR.bat')
  if (!instalarEntry) {
    console.error('ERRO: INSTALAR.bat ausente no pacote final!')
    process.exit(1)
  }
  const instalarContent = instalarEntry.content.toString('utf-8')
  if (instalarContent.includes('C:\\GestaoEclesiastica')) {
    console.error('ERRO: INSTALAR.bat ainda contém referência a C:\\GestaoEclesiastica!')
    process.exit(1)
  }
  if (!instalarContent.includes('%LOCALAPPDATA%\\GestaoEclesiastica')) {
    console.error(
      'ERRO: INSTALAR.bat não contém o destino esperado %LOCALAPPDATA%\\GestaoEclesiastica!',
    )
    process.exit(1)
  }
  if (!instalarContent.includes('[OK] Arquivos copiados') || !instalarContent.includes('[OK]')) {
    console.error('ERRO: INSTALAR.bat não contém as mensagens de confirmação [OK]!')
    process.exit(1)
  }

  // Gravar arquivo de metadados do pacote (versão do app e timestamp)
  let packageVersion = '0.0.33'
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve(cwd, 'package.json'), 'utf-8'))
    if (pkgJson.version) packageVersion = pkgJson.version
  } catch {
    /* ignore */
  }

  const infoPacote = JSON.stringify(
    {
      app: 'Gestão Eclesiástica',
      version: packageVersion,
      buildTimestamp: new Date().toISOString(),
      offlineOnly: true,
      filesCount: arquivosNoZip.length,
    },
    null,
    2,
  )
  arquivosNoZip.push({
    relativePath: pastaRaiz + 'versao-pacote.json',
    content: Buffer.from(infoPacote, 'utf-8'),
  })

  const zipBuf = buildZipBuffer(arquivosNoZip)

  // Salvar em public/ (para que o Vite copie para dist durante o build ou sirva em dev)
  const targetPublic = path.join(publicDir, zipName)
  fs.writeFileSync(targetPublic, zipBuf)
  const statPublic = fs.statSync(targetPublic)

  const summary = {
    zipPath: targetPublic,
    sizeBytes: statPublic.size,
    sizeMB: (statPublic.size / (1024 * 1024)).toFixed(2) + ' MB',
    mtime: statPublic.mtime.toISOString(),
    totalFiles: arquivosNoZip.length,
    rootFiles: arquivosNoZip
      .filter((a) => {
        const parts = a.relativePath.split('/')
        return parts.length === 2 && parts[1] !== ''
      })
      .map((a) => ({
        name: a.relativePath.replace(pastaRaiz, ''),
        bytes: a.content.length,
      })),
  }

  // Salvar resumo json legível em public para inspeção direta
  fs.writeFileSync(
    path.join(publicDir, 'zip-summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8',
  )

  console.log(
    `[ZIP BUILDER] Criado e gravado com sucesso em: ${targetPublic} (${statPublic.size} bytes / ${(statPublic.size / (1024 * 1024)).toFixed(2)} MB)`,
  )

  if (fs.existsSync(distDir)) {
    const targetDist = path.join(distDir, zipName)
    fs.writeFileSync(targetDist, zipBuf)
    fs.writeFileSync(
      path.join(distDir, 'zip-summary.json'),
      JSON.stringify(summary, null, 2),
      'utf-8',
    )
    console.log(`[ZIP BUILDER] Copiado também para dist: ${targetDist}`)
  }

  // Imprimir lista detalhada de arquivos empacotados com tamanhos para conferência
  console.log('\n[ZIP BUILDER] Resumo dos arquivos empacotados no ZIP:')
  arquivosNoZip.sort((a, b) => a.relativePath.localeCompare(b.relativePath))
  for (const a of arquivosNoZip) {
    const bytes = a.content.length
    const kb = (bytes / 1024).toFixed(1)
    console.log(`  - ${a.relativePath} (${bytes} bytes / ${kb} KB)`)
  }
  console.log(`[ZIP BUILDER] Total de arquivos empacotados: ${arquivosNoZip.length}\n`)
}

// Executar se chamado diretamente
gerarPacoteZip()
