import { execSync } from 'node:child_process'
import fs from 'node:fs'

console.error('TEST ERROR TRIGGERED INTENTIONALLY')
process.exit(1)
