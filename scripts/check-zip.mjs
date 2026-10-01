import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gerarPacoteZip } from './generate-pc-zip.mjs'

// Se executado diretamente ou chamado em teste/verificação
const zipPath = path.resolve('public/Gestao_Eclesiastica_Versao_PC.zip')
const distDir = path.resolve('dist')

// Se dist existe e foi construído, garantir que o pacote foi gerado a partir dele
if (fs.existsSync(distDir) && fs.existsSync(path.join(distDir, 'index.html'))) {
  // Regenera o pacote se o ZIP não existir ou se dist/ for mais recente que o ZIP
  if (!fs.existsSync(zipPath)) {
    console.log('[CHECK-ZIP] ZIP ausente em public/. Gerando a partir do dist/...')
    gerarPacoteZip()
  } else {
    const zipStat = fs.statSync(zipPath)
    const distStat = fs.statSync(path.join(distDir, 'index.html'))
    if (distStat.mtimeMs > zipStat.mtimeMs) {
      console.log('[CHECK-ZIP] dist/index.html é mais recente que o ZIP atual. Regenerando...')
      gerarPacoteZip()
    }
  }
}

if (fs.existsSync(zipPath)) {
  const stat = fs.statSync(zipPath)
  console.log(`ZIP_PATH: ${zipPath}`)
  console.log(`ZIP_SIZE_BYTES: ${stat.size}`)
  console.log(`ZIP_SIZE_MB: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`)
  console.log(`ZIP_MTIME: ${stat.mtime.toISOString()}`)
} else {
  console.error('ZIP file not found at ' + zipPath)
  process.exit(1)
}
