import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== RUNNING PACKAGING PIPELINE IN TEST PHASE ===')

// 1. Vite build (gera dist/)
console.log('[PIPELINE] Passo 1: Executando vite build...')
execSync('npx vite build', { stdio: 'inherit' })

// 2. Gerar ZIP
console.log('[PIPELINE] Passo 2: Executando gerador de ZIP...')
execSync('node scripts/generate-pc-zip.mjs', { stdio: 'inherit' })

// 3. Verificações
console.log('[PIPELINE] Passo 3: Verificando integridade e evidências...')
execSync('node scripts/check-zip.mjs', { stdio: 'inherit' })
execSync('node scripts/verify-zip-contents.mjs', { stdio: 'inherit' })
execSync('node scripts/inspect-zip-evidence.mjs', { stdio: 'inherit' })

// Garantir cópia das evidências e resumo para arquivo no repositório
if (fs.existsSync('public/zip-summary.json')) {
  fs.copyFileSync('public/zip-summary.json', 'scripts/evidence-output.json')
  console.log('[PIPELINE] Evidência gravada em scripts/evidence-output.json')
}

console.log('=== PIPELINE COMPLETED SUCCESSFULLY ===')
