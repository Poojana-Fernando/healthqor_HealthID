const TIER = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' }

let cachedTier = null

function probeGpu() {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl', { powerPreference: 'low-power' }) ||
      canvas.getContext('experimental-webgl')
    if (!gl) return { integrated: true, discrete: false }

    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)).toLowerCase()
      : ''

    const integrated = /intel|uhd|iris|hd graphics|microsoft basic|swiftshader|llvmpipe|mesa/.test(renderer)
    const discrete = /nvidia|geforce|rtx|gtx|radeon|\brx\b|apple m\d|apple gpu/.test(renderer)
    return { integrated: integrated && !discrete, discrete }
  } catch {
    return { integrated: true, discrete: false }
  }
}

/** Score device capability once; cached for the session. */
export function getPerformanceTier() {
  if (cachedTier) return cachedTier
  if (typeof window === 'undefined') return TIER.MEDIUM

  let score = 1
  const cores = navigator.hardwareConcurrency || 4
  const memory = navigator.deviceMemory || 4
  const dpr = window.devicePixelRatio || 1
  const gpu = probeGpu()

  if (cores >= 8) score += 2
  else if (cores >= 6) score += 1
  else if (cores <= 4) score -= 1

  if (memory >= 8) score += 2
  else if (memory >= 6) score += 1
  else if (memory <= 4) score -= 2

  if (dpr >= 2) score -= 1
  if (gpu.integrated) score -= 3
  if (gpu.discrete) score += 2
  if (window.innerWidth <= 768) score -= 1

  if (score <= -1) cachedTier = TIER.LOW
  else if (score <= 2) cachedTier = TIER.MEDIUM
  else cachedTier = TIER.HIGH

  return cachedTier
}

const HUMANOID_QUALITY = {
  low: {
    pixelRatioCap: 1,
    antialias: false,
    powerPreference: 'default',
    bodyParticles: 1800,
    hexDivisor: 240,
    plexusLinks: 360,
    targetFps: 30,
  },
  medium: {
    pixelRatioCap: 1.25,
    antialias: true,
    powerPreference: 'default',
    bodyParticles: 2800,
    hexDivisor: 420,
    plexusLinks: 650,
    targetFps: 45,
  },
  high: {
    pixelRatioCap: 1.5,
    antialias: true,
    powerPreference: 'high-performance',
    bodyParticles: 3800,
    hexDivisor: 600,
    plexusLinks: 1000,
    targetFps: 60,
  },
}

export function getHumanoidQuality() {
  return HUMANOID_QUALITY[getPerformanceTier()] || HUMANOID_QUALITY.medium
}

/** Tag <html> with the tier so CSS can adapt if needed. Never removes content. */
export function initPerformanceMode() {
  if (typeof document === 'undefined') return getPerformanceTier()
  const tier = getPerformanceTier()
  document.documentElement.classList.add(`perf-${tier}`)
  return tier
}

export { TIER }
