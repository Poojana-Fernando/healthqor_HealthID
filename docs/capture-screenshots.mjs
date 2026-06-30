/**
 * Capture README screenshots from the running dev server.
 * Usage: npm run dev (port 5173), then node docs/capture-screenshots.mjs
 *
 * Uses ?screenshot=1 so LiveBackground skips the video layer (headless browsers
 * paint <video> as white). The gradient fallback matches the app theme.
 */
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'screenshots')
const baseUrl = process.env.SCREENSHOT_BASE_URL || 'http://localhost:5173'

const pages = [
  { name: 'home', path: '/?screenshot=1', waitMs: 2000 },
  { name: 'login', path: '/login?screenshot=1', waitMs: 1500 },
  { name: 'signup', path: '/signup?screenshot=1', waitMs: 1500 },
  { name: 'echanneling', path: '/echanneling?screenshot=1', waitMs: 2000 },
]

mkdirSync(outDir, { recursive: true })

for (const target of pages) {
  const url = `${baseUrl}${target.path}`
  const output = path.join(outDir, `${target.name}.png`)
  console.log(`Capturing ${url}`)
  execSync(
    `npx --yes playwright@1.49.1 screenshot "${url}" "${output}" --viewport-size=1440,900 --wait-for-timeout ${target.waitMs}`,
    { stdio: 'inherit' },
  )
}

console.log(`Saved screenshots to ${outDir}`)
