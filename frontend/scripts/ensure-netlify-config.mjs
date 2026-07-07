/**
 * Writes frontend/public/_redirects before Netlify build.
 * Set NETLIFY_BACKEND_URL in Netlify project env (e.g. https://healthid-api.onrender.com).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const outPath = path.join(frontendRoot, 'public', '_redirects')

const raw = process.env.NETLIFY_BACKEND_URL || process.env.RENDER_API_URL || ''
const backendBase = raw.replace(/\/$/, '')

if (!backendBase) {
  console.warn(
    '[ensure-netlify-config] NETLIFY_BACKEND_URL is not set. ' +
      'Using placeholder — update _redirects or set env before deploy.'
  )
}

const base =
  backendBase || 'https://REPLACE_WITH_YOUR_RENDER_URL.onrender.com'

const redirects = [
  `/api/*  ${base}/api/:splat  200!`,
  `/actuator/*  ${base}/actuator/:splat  200!`,
  '/*  /index.html  200',
].join('\n')

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, `${redirects}\n`)
console.log(`[ensure-netlify-config] Wrote ${outPath} → backend ${base}`)
