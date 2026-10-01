import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const zipPath = path.resolve('public/Gestao_Eclesiastica_Versao_PC.zip')
if (!fs.existsSync(zipPath)) {
  console.error('ZIP não encontrado em:', zipPath)
  process.exit(1)
}

const stat = fs.statSync(zipPath)
const buf = fs.readFileSync(zipPath)

// Ler End of Central Directory
let eocdOffset = -1
for (let i = buf.length - 22; i >= 0; i--) {
  if (buf.readUInt32LE(i) === 0x06054b50) {
    eocdOffset = i
    break
  }
}

if (eocdOffset === -1) {
  console.error('EOCD não encontrado no ZIP!')
  process.exit(1)
}

const totalEntries = buf.readUInt16LE(eocdOffset + 10)
const cdSize = buf.readUInt32LE(eocdOffset + 12)
const cdOffset = buf.readUInt32LE(eocdOffset + 16)

let p = cdOffset
const entries = []
for (let i = 0; i < totalEntries; i++) {
  const sig = buf.readUInt32LE(p)
  if (sig !== 0x02014b50) break
  const method = buf.readUInt16LE(p + 10)
  const cSize = buf.readUInt32LE(p + 20)
  const uSize = buf.readUInt32LE(p + 24)
  const nameLen = buf.readUInt16LE(p + 28)
  const extraLen = buf.readUInt16LE(p + 30)
  const commentLen = buf.readUInt16LE(p + 32)
  const localOffset = buf.readUInt32LE(p + 42)
  const name = buf.toString('utf-8', p + 46, p + 46 + nameLen)
  entries.push({
    name,
    method,
    compressedSize: cSize,
    uncompressedSize: uSize,
    localOffset,
  })
  p += 46 + nameLen + extraLen + commentLen
}

// Extrair e descompactar versao-pacote.json se existir
let packageMeta = null
const versaoEntry = entries.find((e) => e.name.endsWith('versao-pacote.json'))
if (versaoEntry) {
  const locOff = versaoEntry.localOffset
  const locNameLen = buf.readUInt16LE(locOff + 26)
  const locExtraLen = buf.readUInt16LE(locOff + 28)
  const dataStart = locOff + 30 + locNameLen + locExtraLen
  const compressedData = buf.subarray(dataStart, dataStart + versaoEntry.compressedSize)
  let rawContent = compressedData
  if (versaoEntry.method === 8) {
    rawContent = zlib.inflateRawSync(compressedData)
  }
  try {
    packageMeta = JSON.parse(rawContent.toString('utf-8'))
  } catch {
    /* ignore */
  }
}

// Extrair index.html para verificar conteúdo
let indexSnippet = ''
const indexEntry = entries.find((e) => e.name === 'Gestao_Eclesiastica_PC/index.html')
if (indexEntry) {
  const locOff = indexEntry.localOffset
  const locNameLen = buf.readUInt16LE(locOff + 26)
  const locExtraLen = buf.readUInt16LE(locOff + 28)
  const dataStart = locOff + 30 + locNameLen + locExtraLen
  const compressedData = buf.subarray(dataStart, dataStart + indexEntry.compressedSize)
  let rawContent = compressedData
  if (indexEntry.method === 8) {
    rawContent = zlib.inflateRawSync(compressedData)
  }
  const str = rawContent.toString('utf-8')
  indexSnippet = `Tamanho total HTML: ${str.length} caracteres. Tem __ADTC_OFFLINE_ONLY__: ${str.includes('__ADTC_OFFLINE_ONLY__')}. Tem script inlined: ${str.includes('<script type="module">')}.`
}

// Relatório em formato JSON para fácil inspeção
const report = {
  zipPath: path.relative(process.cwd(), zipPath),
  sizeBytes: stat.size,
  sizeMB: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
  mtime: stat.mtime.toISOString(),
  totalFiles: entries.length,
  packageMeta,
  indexCheck: indexSnippet,
  rootFiles: entries
    .filter((e) => {
      // Arquivos que estão diretamente sob Gestao_Eclesiastica_PC/
      const parts = e.name.split('/')
      return parts.length === 2 && parts[1] !== ''
    })
    .map((e) => ({
      name: e.name.replace('Gestao_Eclesiastica_PC/', ''),
      uncompressedBytes: e.uncompressedSize,
      compressedBytes: e.compressedSize,
    })),
  allFiles: entries.map((e) => e.name),
}

fs.writeFileSync('scripts/evidence-output.json', JSON.stringify(report, null, 2), 'utf-8')
console.log('EVIDENCE_REPORT_GENERATED')
