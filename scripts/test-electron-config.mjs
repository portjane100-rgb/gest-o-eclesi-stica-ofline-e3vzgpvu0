/**
 * Script de teste para validação de electron/main.cjs e electron-builder.yml
 */
import fs from 'node:fs'
import path from 'node:path'

console.log('=== TESTANDO ESTRUTURA ELECTRON ===')

// 1. Validar electron/main.cjs
const mainPath = path.resolve('electron/main.cjs')
if (!fs.existsSync(mainPath)) {
  console.error('ERRO: electron/main.cjs não existe!')
  process.exit(1)
}
const mainContent = fs.readFileSync(mainPath, 'utf-8')
console.log('[OK] electron/main.cjs existe (' + mainContent.length + ' bytes)')

// Validar que main.cjs usa as configurações de segurança exigidas
if (!mainContent.includes('contextIsolation: true')) {
  console.error('ERRO: contextIsolation deve ser true em main.cjs')
  process.exit(1)
}
if (!mainContent.includes('nodeIntegration: false')) {
  console.error('ERRO: nodeIntegration deve ser false em main.cjs')
  process.exit(1)
}
if (!mainContent.includes('sandbox: true')) {
  console.error('ERRO: sandbox deve ser true em main.cjs')
  process.exit(1)
}
if (!mainContent.includes("path.join(__dirname, '..', 'dist', 'index.html')")) {
  console.error('ERRO: caminho para dist/index.html não configurado como esperado')
  process.exit(1)
}
console.log('[OK] electron/main.cjs contém todas as boas práticas e caminho para dist/index.html')

// 2. Validar electron-builder.yml
const builderPath = path.resolve('electron-builder.yml')
if (!fs.existsSync(builderPath)) {
  console.error('ERRO: electron-builder.yml não existe!')
  process.exit(1)
}
const builderContent = fs.readFileSync(builderPath, 'utf-8')
console.log('[OK] electron-builder.yml existe (' + builderContent.length + ' bytes)')

if (!builderContent.includes('appId: com.adtc.gestaoeclesiastica')) {
  console.error('ERRO: appId incorreto em electron-builder.yml')
  process.exit(1)
}
if (!builderContent.includes('target: nsis')) {
  console.error('ERRO: target nsis ausente em electron-builder.yml')
  process.exit(1)
}
if (!builderContent.includes('main: electron/main.cjs')) {
  console.error('ERRO: extraMetadata.main ausente em electron-builder.yml')
  process.exit(1)
}
console.log('[OK] electron-builder.yml configurado corretamente com NSIS x64 e main.cjs')

// 3. Validar package.json
const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
if (pkgJson.main !== 'electron/main.cjs') {
  console.error('ERRO: package.json "main" não aponta para electron/main.cjs')
  process.exit(1)
}
if (!pkgJson.scripts['electron:dev'] || !pkgJson.scripts['electron:build']) {
  console.error('ERRO: scripts electron:dev e electron:build devem existir em package.json')
  process.exit(1)
}
if (!pkgJson.devDependencies['electron'] || !pkgJson.devDependencies['electron-builder']) {
  console.error('ERRO: devDependencies deve conter electron e electron-builder')
  process.exit(1)
}
console.log('[OK] package.json contém "main", scripts e devDependencies corretos')

// 4. Validar dist/index.html
const distIndexPath = path.resolve('dist/index.html')
if (fs.existsSync(distIndexPath)) {
  console.log('[OK] dist/index.html existe e está pronto para o Electron carregar')
} else {
  console.log('[INFO] dist/index.html ainda não compilado (será gerado pelo build)')
}

console.log('=== TESTES ELECTRON CONCLUÍDOS COM SUCESSO ===')
