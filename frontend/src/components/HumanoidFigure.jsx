import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {
  buildPlexusLines,
  computeTorsoFrame,
  createHexGeometry,
  extractVertices,
  normalizeMeshVertices,
  placeOrganObject,
  sampleVertices,
} from './meshParticles'

const ORGAN_MODELS = {
  BRAIN: { url: '/models/organs/brain.glb', sampleCount: 900 },
  HEART: { url: '/models/organs/heart.glb', sampleCount: 650 },
  LUNGS: { url: '/models/organs/lungs.glb', sampleCount: 1200 },
  LIVER: { url: '/models/organs/liver.glb', sampleCount: 850 },
  STOMACH: { url: '/models/organs/stomach.glb', sampleCount: 650 },
  KIDNEYS: { url: '/models/organs/kidney.glb', sampleCount: 520, bilateral: true },
}

/**
 * Anatomical placement tables (deterministic, not derived from noisy particles).
 *  y  = vertical position as fraction of body height (0 = feet, 1 = head top)
 *  x  = lateral offset as fraction of torso half-width (+ = body's left side)
 *  z  = depth offset as fraction of torso half-depth (+ = front/anterior)
 *  w/h/d = organ size as fraction of total body height
 * Male and female differ in trunk length and width, so each has its own table.
 */
const ANATOMY = {
  // w/h/d are real organ bounding-box sizes as a fraction of body height
  // (body height ~= 180 cm). e.g. brain depth 0.095 -> ~17 cm (anatomically correct).
  // y/x are mapped from torso-relative anatomy (origin ≈ mid-abdomen, y+ toward head;
  // user x+ = anatomical right → code x = -user_x for center organs).
  MALE: {
    BRAIN:   { y: 0.960, x: 0.00,  z: 0.10, w: 0.080, h: 0.08, d: 0.095 },
    LUNGS:   { y: 0.7600, x: 0.00,  z: 0.06, w: 0.135, h: 0.173, d: 0.095 },
    HEART:   { y: 0.750, x: 0.50, z: 0.32, w: 0.08, h: 0.08, d: 0.08, rot: { z: 0.52, x: -0.35 } },
    LIVER:   { y: 0.62, x: -0.12, z: 0.28, w: 0.095, h: 0.095, d: 0.065, rot: { y: -0.18, z: 0.12 } },
    STOMACH: { y: 0.650, x: 0.08,  z: 0.24, w: 0.13, h: 0.4, d: 0.1, rot: { z: 0, y: 0 } },
    KIDNEYS: {
      y: 0.565, yLeft: 0.572, yRight: 0.556,
      x: 0.14, z: -0.42,
      w: 0.034, h: 0.066, d: 0.030,
      rotLeft:  { y: 0.45, z: -0.22, x: 0.15 },
      rotRight: { y: -0.45, z: 0.22, x: 0.15 },
    },
  },
  FEMALE: {
    BRAIN:   { y: 0.965, x: 0.00,  z: 0.10, w: 0.075, h: 0.055, d: 0.090 },
    LUNGS:   { y: 0.750, x: 0.00,  z: 0.10, w: 0.128, h: 0.165, d: 0.088 },
    HEART:   { y: 0.755, x: 0.05,  z: 0.36, w: 0.08, h: 0.08, d: 0.08, rot: { z: 0.52, x: -0.35 } },
    LIVER:   { y: 0.680, x: -0.12, z: 0.26, w: 0.130, h: 0.088, d: 0.060, rot: { y: -0.18, z: 0.12 } },
    STOMACH: { y: 0.7, x: 0.07,  z: 0.22, w: 0.14, h: 0.38, d: 0.1, rot: { z: 0, y: 0 } },
    KIDNEYS: {
      y: 0.568, yLeft: 0.575, yRight: 0.559,
      x: 0.13, z: -0.42,
      w: 0.032, h: 0.063, d: 0.028,
      rotLeft:  { y: 0.45, z: -0.22, x: 0.15 },
      rotRight: { y: -0.45, z: 0.22, x: 0.15 },
    },
  },
}

function anatomicalAnchor(a, torso, side = 'center') {
  const H = torso.height
  const xSign = side === 'right' ? -1 : 1
  const xFrac = side === 'center' ? a.x : Math.abs(a.x) * xSign
  const yFrac =
    side === 'left' && a.yLeft != null ? a.yLeft
    : side === 'right' && a.yRight != null ? a.yRight
    : a.y
  return new THREE.Vector3(
    torso.centerX + xFrac * torso.halfWidth,
    torso.minY + yFrac * H,
    torso.centerZ + a.z * torso.halfDepth
  )
}

function anatomicalSize(a, H) {
  return { x: a.w * H, y: a.h * H, z: a.d * H }
}

function getOrganPlacements(organ, config, anatomy, torso) {
  const a = anatomy[organ]
  if (!a) return []
  const H = torso.height
  const size = anatomicalSize(a, H)

  if (organ === 'KIDNEYS' && config.bilateral) {
    return [
      { anchor: anatomicalAnchor(a, torso, 'left'), size, rot: a.rotLeft || a.rot },
      { anchor: anatomicalAnchor(a, torso, 'right'), size, rot: a.rotRight || a.rot },
    ]
  }

  return [{ anchor: anatomicalAnchor(a, torso, 'center'), size, rot: a.rot }]
}

const MODELS = {
  MALE: { url: '/models/FinalBaseMesh.obj', label: 'FinalBaseMesh.obj' },
  FEMALE: { url: '/models/FemaleBaseMesh.obj', label: 'FemaleBaseMesh.obj' },
}

const ORGAN_SYSTEMS = {
  BRAIN: 'Central Nervous System',
  HEART: 'Cardiovascular System',
  LUNGS: 'Respiratory System',
  LIVER: 'Digestive System',
  STOMACH: 'Digestive System',
  KIDNEYS: 'Urinary System',
  INTESTINES: 'Digestive System',
  SKIN_LIMBS: 'Integumentary System'
}

/**
 * Anatomical organ material palette — color + emissive glow per organ.
 * Particle/hex materials blend emissive at ~15% for visibility through the body shell.
 */
const ORGAN_MATERIAL_COLORS = {
  HEART: { color: '#C0392B', emissive: '#6B1A14' },
  LUNGS: { color: '#E8A598', emissive: '#7A3A30' },
  LIVER: { color: '#8B2500', emissive: '#4A1200' },
  STOMACH: { color: '#C47A3A', emissive: '#6B3A10' },
  KIDNEYS: { color: '#A0522D', emissive: '#502010' },
  SMALL_INTESTINE: { color: '#D4956A', emissive: '#7A3E20' },
  LARGE_INTESTINE: { color: '#B06040', emissive: '#5C2A10' },
  BLADDER: { color: '#D4C46A', emissive: '#6E5E20' },
  PANCREAS: { color: '#C8A882', emissive: '#6A4E28' },
  SPLEEN: { color: '#7B3F6E', emissive: '#3D1A38' },
  BRAIN: { color: '#a84dff', emissive: '#5a28a8' },
  SKIN_LIMBS: { color: '#33d399', emissive: '#1a6e56' },
}

const ORGAN_COLOR_ALIASES = {
  INTESTINES: 'SMALL_INTESTINE',
}

function resolveOrganColorKey(organ) {
  return ORGAN_COLOR_ALIASES[organ] || organ
}

function hexToNumber(hex) {
  return parseInt(hex.replace('#', ''), 16)
}

function getOrganMaterialRGB(organ, emissiveStrength = 0.15) {
  const key = resolveOrganColorKey(organ)
  const cfg = ORGAN_MATERIAL_COLORS[key]
  if (!cfg) return { r: 0.12, g: 0.35, b: 0.24 }
  const color = new THREE.Color(cfg.color)
  const emissive = new THREE.Color(cfg.emissive)
  return {
    r: Math.min(1, color.r + emissive.r * emissiveStrength),
    g: Math.min(1, color.g + emissive.g * emissiveStrength),
    b: Math.min(1, color.b + emissive.b * emissiveStrength),
  }
}

function getOrganHexNumber(organ) {
  const { r, g, b } = getOrganMaterialRGB(organ, 0.15)
  return new THREE.Color(r, g, b).getHex()
}

const ORGAN_COLORS = {
  ...Object.fromEntries(
    Object.entries(ORGAN_MATERIAL_COLORS).map(([k, v]) => [k, v.color])
  ),
  INTESTINES: ORGAN_MATERIAL_COLORS.SMALL_INTESTINE.color,
}

const ORGAN_LIGHT_COLORS = {
  ...Object.fromEntries(
    Object.entries(ORGAN_MATERIAL_COLORS).map(([k, v]) => [k, hexToNumber(v.emissive)])
  ),
  INTESTINES: hexToNumber(ORGAN_MATERIAL_COLORS.SMALL_INTESTINE.emissive),
}

const CALLOUT_POSITIONS = {
  BRAIN: { top: '10%', left: '56%', lineDirection: 'left' },
  HEART: { top: '28%', left: '56%', lineDirection: 'left' },
  LUNGS: { top: '26%', right: '56%', lineDirection: 'right' },
  LIVER: { top: '40%', right: '56%', lineDirection: 'right' },
  STOMACH: { top: '40%', left: '56%', lineDirection: 'left' },
  KIDNEYS: { top: '50%', left: '56%', lineDirection: 'left' },
  INTESTINES: { top: '58%', right: '56%', lineDirection: 'right' },
  SKIN_LIMBS: { top: '74%', left: '56%', lineDirection: 'left' }
}

function resolveModelKey(gender) {
  const value = String(gender ?? 'MALE').trim().toUpperCase()
  return value === 'FEMALE' ? 'FEMALE' : 'MALE'
}

export default function HumanoidFigure({ gender = 'MALE', onRegionClick, onRegionHover, activeRegion = null }) {
  const mountRef = useRef(null)
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const [hoveredRegion, setHoveredRegion] = useState(null)
  const hoveredRegionRef = useRef(null)
  const modelKey = resolveModelKey(gender)
  const modelMeta = MODELS[modelKey]
  const isHomepage = window.location.pathname === '/'
  const modelUrl = isHomepage ? '/models/EmptyMesh.obj' : modelMeta.url

  useEffect(() => {
    if (onRegionHover) {
      onRegionHover(hoveredRegion)
    }
  }, [hoveredRegion, onRegionHover])

  useEffect(() => {
    const container = mountRef.current
    if (!container || isHomepage) return

    let disposed = false
    let frame
    const width = container.clientWidth
    const height = container.clientHeight

    setLoadState('loading')
    setLoadError(null)

    /* ── Scene ─────────────────────────────────────────── */
    const scene = new THREE.Scene()
    // scene.background = new THREE.Color(0x060e0a)
    scene.fog = new THREE.FogExp2(0x060e0a, 0.04)

    /* ── Camera – pulled back for full head-to-toe view ── */
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100)
    camera.position.set(0, 0.05, 6.4)
    camera.lookAt(0, 0.1, 0)

    /* ── Renderer ──────────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    container.appendChild(renderer.domElement)

    /* ── Lighting – enhanced for organ glow ────────────── */
    scene.add(new THREE.AmbientLight(0x34d399, 0.2))
    const keyLight = new THREE.DirectionalLight(0x5eead4, 0.7)
    keyLight.position.set(2, 4, 5)
    scene.add(keyLight)
    const rimLight = new THREE.DirectionalLight(0x10b981, 0.35)
    rimLight.position.set(-3, 2, -2)
    scene.add(rimLight)
    const backLight = new THREE.DirectionalLight(0x064e3b, 0.2)
    backLight.position.set(0, -1, -4)
    scene.add(backLight)

    const humanoid = new THREE.Group()
    scene.add(humanoid)


    /* ── Raycaster & interaction state ─────────────────── */
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 0.07
    const mouse = new THREE.Vector2(-10, -10)
    const clock = new THREE.Clock()
    const hoverRaycastInterval = 1000 / 60

    let originals = []
    let organs = []
    let particleGeo = null
    let particlePoints = null
    let hexMeshes = []
    let organLights = []
    let organGlassMeshes = []
    let cachedBox = null
    let lastHoverRaycastAt = 0
    let mouseMovedSinceLastRaycast = false
    let cursorState = 'default'
    let isPageVisible = document.visibilityState === 'visible'
    const disposables = []

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      mouseMovedSinceLastRaycast = true
    }
    container.addEventListener('mousemove', onMouseMove)

    const onVisibilityChange = () => {
      isPageVisible = document.visibilityState === 'visible'
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    /* ── Organ spatial classifier (unchanged) ──────────── */
    const getOrganFromPoint = (point, box) => {
      if (!box) return 'SKIN_LIMBS'
      const center = box.getCenter(new THREE.Vector3())
      const relY = (point.y - box.min.y) / (box.max.y - box.min.y)
      const relX = (point.x - center.x) / (box.max.x - box.min.x + 0.001)
      const relZ = (point.z - box.min.z) / (box.max.z - box.min.z + 0.001)

      if (relY >= 0.82) {
        if (Math.abs(relX) < 0.18) return 'BRAIN'
      }
      if (relY >= 0.63 && relY < 0.81) {
        if (Math.abs(relX) < 0.28) {
          if (relY >= 0.63 && relY < 0.735 && relX > -0.12 && relX < 0.06 && relZ >= 0.48) {
            return 'HEART'
          }
          return 'LUNGS'
        }
      }
      if (relY >= 0.51 && relY < 0.64) {
        if (Math.abs(relX) < 0.24) {
          if (relZ < 0.38 && Math.abs(relX) > 0.05 && Math.abs(relX) < 0.22) {
            return 'KIDNEYS'
          }
          if (relX <= -0.02) {
            return 'LIVER'
          }
          return 'STOMACH'
        }
      }
      if (relY >= 0.37 && relY < 0.52) {
        if (Math.abs(relX) < 0.22) {
          if (relZ < 0.38 && Math.abs(relX) > 0.05 && relY >= 0.47) {
            return 'KIDNEYS'
          }
          return 'INTESTINES'
        }
      }
      return 'SKIN_LIMBS'
    }

    /* ── Click handler (unchanged) ─────────────────────── */
    const pickOrganAtMouse = () => {
      raycaster.setFromCamera(mouse, camera)
      if (organGlassMeshes.length) {
        const groups = organGlassMeshes.map((entry) => entry.group)
        const meshHits = raycaster.intersectObjects(groups, true)
        if (meshHits.length) {
          let node = meshHits[0].object
          while (node) {
            if (node.userData?.organ) return node.userData.organ
            node = node.parent
          }
        }
      }
      if (particlePoints) {
        const pointsHit = raycaster.intersectObject(particlePoints, false)[0]
        if (pointsHit) return organs[pointsHit.index]
      }
      return null
    }

    const onCanvasClick = (e) => {
      if (!particlePoints && organGlassMeshes.length === 0) return

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      const organ = pickOrganAtMouse()
      if (organ && onRegionClick) {
        onRegionClick(organ)
      }
    }
    container.addEventListener('click', onCanvasClick)

    /* ── Animation loop ────────────────────────────────── */
    const animate = () => {
      frame = requestAnimationFrame(animate)
      if (!isPageVisible) return
      const t = clock.getElapsedTime()
      const now = performance.now()

      // Continuous rotation
      humanoid.rotation.y = t * 0.22

      if (particlePoints || organGlassMeshes.length) {
        const shouldRaycast =
          mouseMovedSinceLastRaycast || now - lastHoverRaycastAt >= hoverRaycastInterval

        if (shouldRaycast) {
          lastHoverRaycastAt = now
          mouseMovedSinceLastRaycast = false
          const organ = pickOrganAtMouse()

          if (organ) {
            if (cursorState !== 'pointer') {
              renderer.domElement.style.cursor = 'pointer'
              cursorState = 'pointer'
            }
            if (hoveredRegionRef.current !== organ) {
              hoveredRegionRef.current = organ
              setHoveredRegion(organ)
            }
          } else {
            if (cursorState !== 'default') {
              renderer.domElement.style.cursor = 'default'
              cursorState = 'default'
            }
            if (hoveredRegionRef.current !== null) {
              hoveredRegionRef.current = null
              setHoveredRegion(null)
            }
          }
        }

        // Glass organ hover glow
        const currentTargetRegion = hoveredRegionRef.current || activeRegion
        for (let i = 0, len = organGlassMeshes.length; i < len; i++) {
          const { organ, material } = organGlassMeshes[i]
          const isTarget = organ === currentTargetRegion
          const targetOpacity = isTarget ? (organ === 'HEART' ? 0.78 : 0.62) : (organ === 'HEART' ? 0.58 : 0.38)
          const targetHover = isTarget ? 1.0 : 0.0
          material.uniforms.uOpacity.value = THREE.MathUtils.lerp(
            material.uniforms.uOpacity.value,
            targetOpacity,
            0.12
          )
          material.uniforms.uHover.value = THREE.MathUtils.lerp(
            material.uniforms.uHover.value,
            targetHover,
            0.12
          )
        }

        // Per-organ glow light pulsing
        for (let i = 0, len = organLights.length; i < len; i++) {
          const { light, baseIntensity, speed, organ } = organLights[i]
          const isHovered = hoveredRegionRef.current === organ || activeRegion === organ
          const targetIntensity = isHovered ? baseIntensity * 3.8 : baseIntensity
          
          const pulseSpeed = isHovered ? speed * 2.5 : speed
          const pulseAmount = isHovered ? baseIntensity * 0.8 : baseIntensity * 0.3
          const currentTarget = targetIntensity + Math.sin(t * pulseSpeed) * pulseAmount
          
          light.intensity = THREE.MathUtils.lerp(light.intensity, currentTarget, 0.15)
        }

        // Animate hex meshes based on hover/active organ
        for (let i = 0, len = hexMeshes.length; i < len; i++) {
          const { mesh, organ } = hexMeshes[i]
          const isTarget = organ === currentTargetRegion
          
          const targetScale = isTarget ? (1.35 + Math.sin(t * 8) * 0.15) : 1.0
          const targetOpacity = isTarget ? 0.35 : 0.12
          
          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.15))
          mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, targetOpacity, 0.15)
          mesh.lookAt(camera.position)
        }

        // Skin particle animation (body shell only — organs are glass meshes)
        const posAttr = particleGeo?.getAttribute('position')
        const colorAttr = particleGeo?.getAttribute('color')
        if (posAttr && colorAttr && originals.length) {
          let posNeedsUpdate = false
          let colorNeedsUpdate = false
          const isSkinTarget = currentTargetRegion === 'SKIN_LIMBS'
          for (let i = 0; i < originals.length; i++) {
            const orig = originals[i]
            
            // Position
            const currX = posAttr.getX(i)
            const currY = posAttr.getY(i)
            const currZ = posAttr.getZ(i)
            
            let targetX = orig.x
            let targetY = orig.y
            let targetZ = orig.z
            
            if (isSkinTarget) {
              const expand = 1.07 + Math.sin(t * 14 + i) * 0.02
              targetX = orig.x * expand
              targetY = orig.y * expand
              targetZ = orig.z * expand
            }
            
            if (Math.abs(currX - targetX) > 0.001 || Math.abs(currY - targetY) > 0.001 || Math.abs(currZ - targetZ) > 0.001) {
              posAttr.setX(i, THREE.MathUtils.lerp(currX, targetX, 0.22))
              posAttr.setY(i, THREE.MathUtils.lerp(currY, targetY, 0.22))
              posAttr.setZ(i, THREE.MathUtils.lerp(currZ, targetZ, 0.22))
              posNeedsUpdate = true
            }
            
            // Color Vibrancy
            const currR = colorAttr.getX(i)
            const currG = colorAttr.getY(i)
            const currB = colorAttr.getZ(i)
            
            const base = getOrganMaterialRGB('SKIN_LIMBS')
            let targetR = base.r
            let targetG = base.g
            let targetB = base.b
            
            if (isSkinTarget) {
              const pulse = Math.sin(t * 16 + i) * 0.04
              targetR = Math.min(1, base.r * 1.28 + pulse)
              targetG = Math.min(1, base.g * 1.28 + pulse)
              targetB = Math.min(1, base.b * 1.28 + pulse)
            }
            
            if (Math.abs(currR - targetR) > 0.01 || Math.abs(currG - targetG) > 0.01 || Math.abs(currB - targetB) > 0.01) {
              colorAttr.setXYZ(i,
                THREE.MathUtils.lerp(currR, targetR, 0.22),
                THREE.MathUtils.lerp(currG, targetG, 0.22),
                THREE.MathUtils.lerp(currB, targetB, 0.22)
              )
              colorNeedsUpdate = true
            }
          }
          if (posNeedsUpdate) {
            posAttr.needsUpdate = true
          }
          if (colorNeedsUpdate) {
            colorAttr.needsUpdate = true
          }
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const buildParticleCloud = (points, organTags) => {
      originals = points.map((p) => p.clone())
      organs = organTags

      const positions = new Float32Array(points.length * 3)
      const colors = new Float32Array(points.length * 3)
      const c = new THREE.Color()
      const box = new THREE.Box3().setFromPoints(points)
      cachedBox = box

      points.forEach((p, i) => {
        positions[i * 3] = p.x
        positions[i * 3 + 1] = p.y
        positions[i * 3 + 2] = p.z

        const organ = organTags[i]
        const rgb = getOrganMaterialRGB('SKIN_LIMBS')
        c.setRGB(rgb.r, rgb.g, rgb.b)

        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
      })

      particleGeo = new THREE.BufferGeometry()
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      disposables.push(particleGeo)

      const pointsMat = new THREE.PointsMaterial({
        size: 0.026,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: true,
        sizeAttenuation: true,
      })
      particlePoints = new THREE.Points(particleGeo, pointsMat)
      particlePoints.renderOrder = 2
      disposables.push(pointsMat)
      humanoid.add(particlePoints)

      const plexusGeo = new THREE.BufferGeometry()
      plexusGeo.setAttribute('position', new THREE.Float32BufferAttribute(buildPlexusLines(points), 3))
      disposables.push(plexusGeo)
      const plexusMat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.08 })
      disposables.push(plexusMat)
      humanoid.add(new THREE.LineSegments(plexusGeo, plexusMat))

      const hexGeo = createHexGeometry(0.016)
      disposables.push(hexGeo)
      const hexStep = Math.max(1, Math.floor(points.length / 600))
      for (let i = 0; i < points.length; i += hexStep) {
        const mesh = new THREE.Mesh(hexGeo, new THREE.MeshBasicMaterial({
          color: getOrganHexNumber('SKIN_LIMBS'),
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }))
        mesh.renderOrder = 0
        mesh.position.copy(points[i])
        mesh.lookAt(camera.position)
        humanoid.add(mesh)
        hexMeshes.push({ mesh, organ: 'SKIN_LIMBS' })
      }
    }

    const setupOrganLights = (meshEntries) => {
      const organCenters = {}
      meshEntries.forEach(({ organ, center }) => {
        if (!organCenters[organ]) organCenters[organ] = []
        organCenters[organ].push(center)
      })

      organLights = Object.entries(organCenters).map(([organ, centers]) => {
        const center = new THREE.Vector3()
        centers.forEach((c) => center.add(c))
        center.divideScalar(centers.length)
        const color = ORGAN_LIGHT_COLORS[organ] || 0x5eead4
        const intensity = organ === 'HEART' ? 1.6 : 0.7
        const distance = organ === 'HEART' ? 2.5 : 1.8
        const light = new THREE.PointLight(color, intensity, distance)
        light.position.copy(center)
        humanoid.add(light)
        return {
          light,
          baseIntensity: intensity,
          speed: organ === 'HEART' ? 2.2 : (1.0 + Math.random() * 0.8),
          organ,
        }
      })
    }

    const createOrganGlassMaterial = (organ) => {
      const key = resolveOrganColorKey(organ)
      const cfg = ORGAN_MATERIAL_COLORS[key] || ORGAN_MATERIAL_COLORS.SKIN_LIMBS
      const isHeart = organ === 'HEART'
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(cfg.color) },
          uRimColor: { value: new THREE.Color(cfg.emissive) },
          uOpacity: { value: isHeart ? 0.58 : 0.38 },
          uHover: { value: 0.0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec3 uRimColor;
          uniform float uOpacity;
          uniform float uHover;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float fres = pow(1.0 - abs(dot(vNormal, vView)), 2.4);
            vec3 col = mix(uColor, uRimColor, fres + uHover * 0.35);
            float alpha = clamp(uOpacity + fres * 0.45 + uHover * 0.2, 0.0, 0.92);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      disposables.push(mat)
      return mat
    }

    const loadOrganGlassMeshes = async (bodyPoints, bodyBox) => {
      const torso = computeTorsoFrame(bodyPoints, bodyBox)
      const anatomy = ANATOMY[modelKey] || ANATOMY.MALE
      const gltfLoader = new GLTFLoader()
      const materialByOrgan = {}
      const entries = []

      await Promise.all(
        Object.entries(ORGAN_MODELS).map(async ([organ, config]) => {
          try {
            const gltf = await gltfLoader.loadAsync(config.url)
            const placements = getOrganPlacements(organ, config, anatomy, torso)
            if (!placements.length) return

            if (!materialByOrgan[organ]) {
              materialByOrgan[organ] = createOrganGlassMaterial(organ)
            }
            const glassMat = materialByOrgan[organ]

            placements.forEach(({ anchor, size, rot }) => {
              const group = placeOrganObject(gltf.scene.clone(true), anchor, size, rot)
              group.userData.organ = organ
              const meshRenderOrder = organ === 'HEART' ? 4 : organ === 'LUNGS' ? 2 : 3
              group.traverse((child) => {
                if (child.isMesh) {
                  child.material = glassMat
                  child.renderOrder = meshRenderOrder
                }
              })
              humanoid.add(group)
              entries.push({ group, organ, material: glassMat, center: anchor.clone() })
            })

            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                child.geometry?.dispose()
                if (child.material) {
                  if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
                  else child.material.dispose()
                }
              }
            })
          } catch (err) {
            console.warn(`Failed to load organ model ${organ}:`, err)
          }
        })
      )

      organGlassMeshes = entries
      return entries
    }

    /* ── Translucent body shell (membrane skin) ─────────── */
    const buildBodyShell = (object, rawVerts) => {
      const box = new THREE.Box3().setFromPoints(rawVerts)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const scale = 3.6 / (size.y || 1)

      // Group reproduces the same normalization used for the particle cloud,
      // so the shell aligns perfectly with the organs/particles.
      const shellGroup = new THREE.Group()
      shellGroup.scale.setScalar(scale)
      shellGroup.position.set(-center.x * scale, -center.y * scale, -center.z * scale)

      const shellMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0x14b88a) },
          uRimColor: { value: new THREE.Color(0xa7f3d0) },
          uOpacity: { value: 0.1 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            vNormal = normalize(normalMatrix * normal);
            vView = normalize(-mvPosition.xyz);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform vec3 uRimColor;
          uniform float uOpacity;
          varying vec3 vNormal;
          varying vec3 vView;
          void main() {
            float fres = pow(1.0 - abs(dot(vNormal, vView)), 2.6);
            vec3 col = mix(uColor, uRimColor, fres);
            float alpha = clamp(uOpacity + fres * 0.55, 0.0, 0.85);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      disposables.push(shellMat)

      const wireMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        wireframe: true,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      disposables.push(wireMat)

      object.traverse((child) => {
        if (child.isMesh && child.geometry) {
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
            else child.material.dispose()
          }
          const geo = child.geometry
          if (!geo.attributes.normal) geo.computeVertexNormals()
          disposables.push(geo)

          const shellMesh = new THREE.Mesh(geo, shellMat)
          shellMesh.matrixAutoUpdate = false
          shellMesh.matrix.copy(child.matrixWorld)
          shellMesh.renderOrder = -1
          shellGroup.add(shellMesh)

          const wireMesh = new THREE.Mesh(geo, wireMat)
          wireMesh.matrixAutoUpdate = false
          wireMesh.matrix.copy(child.matrixWorld)
          wireMesh.renderOrder = -1
          shellGroup.add(wireMesh)
        }
      })

      humanoid.add(shellGroup)
    }

    /* ── OBJ model loading ─────────────────────────────── */
    const loader = new OBJLoader()
    loader.load(
      modelUrl,
      async (object) => {
        if (disposed) return

        const rawVerts = extractVertices(object)

        // Build the translucent shell from the source mesh (keeps geometry alive)
        buildBodyShell(object, rawVerts)

        const normalized = normalizeMeshVertices(rawVerts, 3.6)
        const bodySample = sampleVertices(normalized, 3800)
        const bodyBox = new THREE.Box3().setFromPoints(bodySample)

        const bodyPoints = bodySample.map((p) => p.clone())
        const bodyOrganTags = bodySample.map((p) => getOrganFromPoint(p, bodyBox))
        const skinPoints = []
        const skinTags = []
        bodySample.forEach((p, i) => {
          if (bodyOrganTags[i] === 'SKIN_LIMBS') {
            skinPoints.push(p)
            skinTags.push('SKIN_LIMBS')
          }
        })

        const organMeshEntries = await loadOrganGlassMeshes(bodyPoints, bodyBox)
        if (disposed) return

        setupOrganLights(organMeshEntries)

        if (skinPoints.length === 0) {
          setLoadError('Failed to build particle cloud')
          setLoadState('error')
          return
        }

        buildParticleCloud(skinPoints, skinTags)
        setLoadState('ready')
      },
      undefined,
      (err) => {
        if (!disposed) {
          setLoadError('Failed to load 3D model')
          setLoadState('error')
          console.error(err)
        }
      }
    )

    /* ── Resize Observer ───────────────────────────────── */
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return
      const { width: w, height: h } = entries[0].contentRect
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    })
    resizeObserver.observe(container)

    /* ── Cleanup ───────────────────────────────────────── */
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('click', onCanvasClick)
      hexMeshes.forEach(({ mesh }) => mesh.material?.dispose())
      organGlassMeshes.forEach(({ group }) => {
        group.traverse((child) => {
          if (child.isMesh) child.geometry?.dispose()
        })
      })
      organGlassMeshes = []
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [modelKey, modelUrl])

  if (isHomepage) return null

  /* ── Callout state ───────────────────────────────────── */
  const displayRegion = hoveredRegion || activeRegion
  const isCalloutActive = displayRegion !== null
  const calloutColor = ORGAN_COLORS[displayRegion] || '#33d399'
  const calloutSystem = ORGAN_SYSTEMS[displayRegion] || 'Integumentary System'
  const calloutPos = CALLOUT_POSITIONS[displayRegion]
  const displayLabel = displayRegion === 'SKIN_LIMBS' ? 'SKIN & LIMBS' : displayRegion

  return (
    <div 
      className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10" 
      style={{ 
        background: 'rgba(12, 26, 20, 0.15)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 0 12px rgba(255, 255, 255, 0.03)'
      }}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {/* Minimal corner HUD indicators */}
      <div className="absolute top-3.5 left-4 pointer-events-none select-none z-10">
        <div className="text-[9px] text-accent2/50 font-mono tracking-widest">BIOMETRIC SCAN</div>
        <div className="text-[8px] text-white/30 font-mono mt-0.5">{modelMeta.label} · {modelKey}</div>
      </div>
      <div className="absolute top-3.5 right-4 pointer-events-none select-none text-right z-10">
        <div className="text-[8px] text-accent2/40 font-mono">PARTICLE SCAN: ACTIVE</div>
      </div>

      {/* ══ LOADING / ERROR ══ */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-accent2/60 text-sm z-30">
          Loading {modelKey === 'FEMALE' ? 'female' : 'male'} scan mesh...
        </div>
      )}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm z-30">
          {loadError}
        </div>
      )}

      {/* ══ BOTTOM: TARGET AREA ══ */}
      <div className="absolute bottom-14 left-2.5 pointer-events-none select-none z-10">
        <div className="text-[9px] text-accent2/60 font-mono tracking-widest mb-1 uppercase">TARGET AREA</div>
        <div className="text-base font-mono text-white/90 tracking-wider uppercase font-semibold">
          {hoveredRegion === 'SKIN_LIMBS' ? 'SKIN & LIMBS' : (activeRegion === 'SKIN_LIMBS' ? 'SKIN & LIMBS' : (hoveredRegion || activeRegion || 'FULL BODY'))}
        </div>
        {activeRegion && (
          <div className="text-[8px] text-accent2 font-mono mt-0.5 animate-pulse">
            FILTER LOCKED
          </div>
        )}
      </div>

      {/* ══ BOTTOM: FOOTER LABEL ══ */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none text-center z-10">
        <div className="text-[7px] text-accent2/40 font-mono tracking-[0.18em] mb-0.5">
          CLICK ORGAN REGIONS TO SCAN & DIAGNOSE
        </div>
        <div className="text-[8px] text-accent2/30 font-mono tracking-[0.25em]">HOLOGRAPHIC PARTICLE HUMANOID</div>
      </div>
    </div>
  )
}
