/**
 * Capture README screenshots from the running dev server.
 * Usage: npm run dev (port 5173), then node docs/capture-screenshots.mjs
 */
import { execSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'screenshots')
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173'

const pages = [
  { name: 'home', path: '/', waitMs: 2500 },
  { name: 'login', path: '/login', waitMs: 2500 },
  { name: 'signup', path: '/signup', waitMs: 2500 },
  { name: 'echanneling', path: '/echanneling', waitMs: 2500 },
]

await mkdir(outDir, { recursive: true })

for (const target of pages) {
  const url = `${baseUrl}${target.path}`
  const output = path.join(outDir, `${target.name}.png`)
  console.log(`Capturing ${url}`)
  execSync(
    `npx --yes playwright@1.49.1 screenshot "${url}" "${output}" --wait-for-timeout ${target.waitMs}`,
    { stdio: 'inherit' },
  )
}

console.log(`Saved screenshots to ${outDir}`)
