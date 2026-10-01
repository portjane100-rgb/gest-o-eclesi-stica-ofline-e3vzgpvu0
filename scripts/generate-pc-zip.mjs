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

  let sourceDir = distDir
  if (!fs.existsSync(distDir) || fs.readdirSync(distDir).length === 0) {
    console.log('[ZIP BUILDER] dist/ ainda não existe, empacotando arquivos de public/...')
    sourceDir = publicDir
  }

  const arquivos = coletarArquivos(sourceDir)
  if (arquivos.length === 0) {
    console.warn('[ZIP BUILDER] Nenhum arquivo para empacotar.')
    return
  }

  const pastaRaiz = 'Gestao_Eclesiastica_PC/'
  const arquivosNoZip = arquivos.map((a) => ({
    relativePath: pastaRaiz + a.relativePath,
    content: a.content,
  }))

  const zipBuf = buildZipBuffer(arquivosNoZip)

  // Salvar em public/ (para que o Vite copie para dist durante o build ou sirva em dev)
  const targetPublic = path.join(publicDir, zipName)
  fs.writeFileSync(targetPublic, zipBuf)
  console.log(
    `[ZIP BUILDER] Criado com sucesso em: ${targetPublic} (${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB)`,
  )

  if (fs.existsSync(distDir)) {
    const targetDist = path.join(distDir, zipName)
    fs.writeFileSync(targetDist, zipBuf)
    console.log(`[ZIP BUILDER] Copiado também para dist: ${targetDist}`)
  }
}

// Executar se chamado diretamente
gerarPacoteZip()
