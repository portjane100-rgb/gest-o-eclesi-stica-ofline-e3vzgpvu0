import fs from 'node:fs'
import path from 'node:path'

// Script para verificar o cabeçalho e ler as entradas do ZIP gerado
const zipPath = path.resolve('public/Gestao_Eclesiastica_Versao_PC.zip')
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
  console.error('EOCD não encontrado')
  process.exit(1)
}

const totalEntries = buf.readUInt16LE(eocdOffset + 10)
const cdSize = buf.readUInt32LE(eocdOffset + 12)
const cdOffset = buf.readUInt32LE(eocdOffset + 16)

console.log(`[ZIP VERIFY] Total de entradas no ZIP: ${totalEntries}`)
console.log(
  `[ZIP VERIFY] Tamanho do arquivo: ${buf.length} bytes (${(buf.length / (1024 * 1024)).toFixed(2)} MB)`,
)

let p = cdOffset
const filenames = []
for (let i = 0; i < totalEntries; i++) {
  const sig = buf.readUInt32LE(p)
  if (sig !== 0x02014b50) break
  const nameLen = buf.readUInt16LE(p + 28)
  const extraLen = buf.readUInt16LE(p + 30)
  const commentLen = buf.readUInt16LE(p + 32)
  const name = buf.toString('utf-8', p + 46, p + 46 + nameLen)
  filenames.push(name)
  p += 46 + nameLen + extraLen + commentLen
}

console.log('[ZIP VERIFY] Entradas principais encontradas:')
filenames
  .filter((f) => !f.includes('/assets/') || f.endsWith('index.html'))
  .forEach((f) => console.log(' - ' + f))

// Garantir que os arquivos obrigatórios estão presentes
const required = [
  'Gestao_Eclesiastica_PC/index.html',
  'Gestao_Eclesiastica_PC/ABRIR_SISTEMA.bat',
  'Gestao_Eclesiastica_PC/INSTALAR.bat',
  'Gestao_Eclesiastica_PC/ABRIR_SISTEMA.command',
  'Gestao_Eclesiastica_PC/LEIA-ME.txt',
  'Gestao_Eclesiastica_PC/favicon.ico',
]

const missing = required.filter((r) => !filenames.includes(r))
if (missing.length > 0) {
  console.error('[ZIP VERIFY] Faltando arquivos no pacote:', missing)
  process.exit(1)
} else {
  console.log('[ZIP VERIFY] Todos os arquivos obrigatórios estão presentes com sucesso!')
}
