/**
 * Writes frontend/vercel.json before Vercel build.
 * Set RENDER_API_URL in Vercel project env (e.g. https://healthid-api.onrender.com).
 * Do not use VERCEL_* — Vercel reserves that prefix for system variables.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const outPath = path.join(frontendRoot, 'vercel.json')

const raw = process.env.RENDER_API_URL || process.env.VERCEL_BACKEND_URL || ''
const backendBase = raw.replace(/\/$/, '')

if (!backendBase) {
  console.warn(
    '[ensure-vercel-config] RENDER_API_URL is not set. ' +
      'Using placeholder — update vercel.json or set env before deploy.'
  )
}

const base =
  backendBase || 'https://REPLACE_WITH_YOUR_RENDER_URL.onrender.com'

const config = {
  rewrites: [
    {
      source: '/api/:path*',
      destination: `${base}/api/:path*`,
    },
    {
      source: '/actuator/:path*',
      destination: `${base}/actuator/:path*`,
    },
    {
      source: '/((?!api/|actuator/|assets/|models/).*)',
      destination: '/index.html',
    },
  ],
}

fs.writeFileSync(outPath, `${JSON.stringify(config, null, 2)}\n`)
console.log(`[ensure-vercel-config] Wrote ${outPath} → backend ${base}`)
