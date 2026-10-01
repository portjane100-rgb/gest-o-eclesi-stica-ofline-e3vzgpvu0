import { execSync } from 'node:child_process'
import fs from 'node:fs'

console.log('=== TEST RUNNER: EXECUTING RUN-PIPELINE.MJS ===')
try {
  const output = execSync('node scripts/run-pipeline.mjs', { encoding: 'utf-8' })
  fs.writeFileSync('scripts/last-run-output.txt', output, 'utf-8')
  console.log('[TEST RUNNER] SUCCESS')
} catch (err) {
  console.error('[TEST RUNNER] ERROR IN RUN-PIPELINE:', err.message)
  if (err.stdout) console.log('STDOUT:', err.stdout.toString())
  if (err.stderr) console.error('STDERR:', err.stderr.toString())
  // Gravar erro para podermos inspecionar se falhar
  fs.writeFileSync(
    'scripts/last-error.log',
    (err.stdout?.toString() || '') + '\n' + (err.stderr?.toString() || '') + '\n' + err.stack,
  )
  process.exit(1)
}
