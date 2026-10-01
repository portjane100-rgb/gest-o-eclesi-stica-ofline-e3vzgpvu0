import fs from 'node:fs'
import path from 'node:path'

const zipPath = path.resolve('public/Gestao_Eclesiastica_Versao_PC.zip')
if (fs.existsSync(zipPath)) {
  const stat = fs.statSync(zipPath)
  console.log(`ZIP_SIZE_BYTES: ${stat.size}`)
  console.log(`ZIP_SIZE_MB: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`)
} else {
  console.error('ZIP file not found at ' + zipPath)
  process.exit(1)
}
