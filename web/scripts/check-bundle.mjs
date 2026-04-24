import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const assetsDir = join(process.cwd(), 'dist', 'assets')
const jsFiles = readdirSync(assetsDir).filter((file) => file.endsWith('.js'))

if (!jsFiles.length) {
  console.error('No built JavaScript assets found in dist/assets.')
  process.exit(1)
}

const chunks = jsFiles.map((file) => ({
  file,
  sizeBytes: statSync(join(assetsDir, file)).size,
}))
const maxAllowedBytes = 600 * 1024
const oversize = chunks.filter((chunk) => chunk.sizeBytes > maxAllowedBytes)

console.log(JSON.stringify({
  maxAllowedBytes,
  chunks,
  oversize,
}, null, 2))

if (oversize.length) {
  console.error(`Bundle policy failed: ${oversize.map((chunk) => chunk.file).join(', ')} exceed ${maxAllowedBytes} bytes.`)
  process.exit(1)
}
