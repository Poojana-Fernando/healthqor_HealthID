import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import {
  buildPlexusLines,
  createHexGeometry,
  extractVertices,
  normalizeMeshVertices,
  sampleVertices,
} from './meshParticles'

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

const ORGAN_COLORS = {
  BRAIN: '#b280ff',
  HEART: '#ff3355',
  LUNGS: '#33b2ff',
  LIVER: '#ff9933',
  STOMACH: '#ff66b2',
  KIDNEYS: '#33ff99',
  INTESTINES: '#eeee33',
  SKIN_LIMBS: '#33d399'
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

const ORGAN_LIGHT_COLORS = {
  BRAIN: 0xb280ff,
  HEART: 0xff3355,
  LUNGS: 0x33b2ff,
  LIVER: 0xff9933,
  STOMACH: 0xff66b2,
  KIDNEYS: 0x33ff99,
  INTESTINES: 0xeeee33,
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

  useEffect(() => {
    if (onRegionHover) {
      onRegionHover(hoveredRegion)
    }
  }, [hoveredRegion, onRegionHover])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let disposed = false
    let frame
    const width = container.clientWidth
    const height = container.clientHeight

    setLoadState('loading')
    setLoadError(null)

    /* ── Scene ─────────────────────────────────────────── */
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060e0a)
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

    /* ── Holographic Scan Platform ─────────────────────── */
    const pedestal = new THREE.Group()
    pedestal.position.y = -1.95

    // Grid floor plane
    const gridGeo = new THREE.PlaneGeometry(3.2, 3.2, 24, 24)
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.04,
      wireframe: true,
      side: THREE.DoubleSide,
    })
    const gridMesh = new THREE.Mesh(gridGeo, gridMat)
    gridMesh.rotation.x = -Math.PI / 2
    gridMesh.position.y = 0.005
    pedestal.add(gridMesh)

    // Platform base
    pedestal.add(new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.2, 0.03, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x060e0a,
        metalness: 0.9,
        roughness: 0.2,
        transparent: true,
        opacity: 0.8,
      })
    ))

    // Concentric scan rings
    const ringRadii = [0.35, 0.5, 0.65, 0.8, 0.95, 1.1, 1.25]
    const rings = ringRadii.map((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.006, 80),
        new THREE.MeshBasicMaterial({
          color: i < 3 ? 0x5eead4 : 0x34d399,
          transparent: true,
          opacity: 0.28 - i * 0.03,
          side: THREE.DoubleSide,
        })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.02 + i * 0.002
      ring.userData.speed = 0.12 + i * 0.06
      ring.userData.dir = i % 2 === 0 ? 1 : -1
      pedestal.add(ring)
      return ring
    })

    scene.add(pedestal)

    /* ── Raycaster & interaction state ─────────────────── */
    const raycaster = new THREE.Raycaster()
    raycaster.params.Points.threshold = 0.15
    const mouse = new THREE.Vector2(-10, -10)
    const clock = new THREE.Clock()
    const hoverRaycastInterval = 1000 / 30

    let originals = []
    let particleGeo = null
    let particlePoints = null
    let hexMeshes = []
    let organLights = []
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

      if (relY >= 0.86) {
        if (Math.abs(relX) < 0.16) return 'BRAIN'
      }
      if (relY >= 0.64 && relY < 0.82) {
        if (Math.abs(relX) < 0.25) {
          if (relY >= 0.64 && relY < 0.74 && relX > -0.06 && relX < 0.1 && relZ >= 0.5) {
            return 'HEART'
          }
          return 'LUNGS'
        }
      }
      if (relY >= 0.52 && relY < 0.64) {
        if (Math.abs(relX) < 0.22) {
          if (relZ < 0.35 && Math.abs(relX) > 0.06 && Math.abs(relX) < 0.2) {
            return 'KIDNEYS'
          }
          if (relX <= 0.0) {
            return 'LIVER'
          }
          return 'STOMACH'
        }
      }
      if (relY >= 0.38 && relY < 0.52) {
        if (Math.abs(relX) < 0.2) {
          if (relZ < 0.35 && Math.abs(relX) > 0.06 && relY >= 0.48) {
            return 'KIDNEYS'
          }
          return 'INTESTINES'
        }
      }
      return 'SKIN_LIMBS'
    }

    /* ── Click handler (unchanged) ─────────────────────── */
    const onCanvasClick = (e) => {
      if (!particlePoints || !originals.length) return

      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)
      const pointsHit = raycaster.intersectObject(particlePoints, false)[0]

      if (pointsHit) {
        const pointIndex = pointsHit.index
        const point = originals[pointIndex]
        if (point) {
          const organ = getOrganFromPoint(point, cachedBox)
          if (onRegionClick) {
            onRegionClick(organ)
          }
        }
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

      if (particlePoints && originals.length) {
        const shouldRaycast =
          mouseMovedSinceLastRaycast || now - lastHoverRaycastAt >= hoverRaycastInterval

        if (shouldRaycast) {
          lastHoverRaycastAt = now
          mouseMovedSinceLastRaycast = false
          raycaster.setFromCamera(mouse, camera)
          const pointsHit = raycaster.intersectObject(particlePoints, false)[0]

          if (pointsHit) {
            if (cursorState !== 'pointer') {
              renderer.domElement.style.cursor = 'pointer'
              cursorState = 'pointer'
            }
            const point = originals[pointsHit.index]
            if (point) {
              const organ = getOrganFromPoint(point, cachedBox)
              if (hoveredRegionRef.current !== organ) {
                hoveredRegionRef.current = organ
                setHoveredRegion(organ)
              }
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

        // Per-organ glow light pulsing
        for (let i = 0, len = organLights.length; i < len; i++) {
          const { light, baseIntensity, speed } = organLights[i]
          light.intensity = baseIntensity + Math.sin(t * speed) * (baseIntensity * 0.3)
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    /* ── OBJ model loading ─────────────────────────────── */
    const loader = new OBJLoader()
    loader.load(
      modelMeta.url,
      (object) => {
        if (disposed) return

        const rawVerts = extractVertices(object)
        object.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose()
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
              else child.material.dispose()
            }
          }
        })

        const normalized = normalizeMeshVertices(rawVerts, 3.6)
        const points = sampleVertices(normalized, 3800)

        originals = points.map((p) => p.clone())

        const positions = new Float32Array(points.length * 3)
        const colors = new Float32Array(points.length * 3)
        const c = new THREE.Color()
        const box = new THREE.Box3().setFromPoints(points)
        const organs = points.map((p) => getOrganFromPoint(p, box))
        cachedBox = box

        /* Colour assignment: dim body, vivid organs */
        points.forEach((p, i) => {
          positions[i * 3] = p.x
          positions[i * 3 + 1] = p.y
          positions[i * 3 + 2] = p.z
          
          const organ = organs[i]
          switch (organ) {
            case 'BRAIN':
              c.setRGB(0.7, 0.3, 0.9)
              break
            case 'HEART':
              c.setRGB(1.0, 0.15, 0.3)
              break
            case 'LUNGS':
              c.setRGB(0.2, 0.6, 1.0)
              break
            case 'LIVER':
              c.setRGB(1.0, 0.5, 0.1)
              break
            case 'STOMACH':
              c.setRGB(1.0, 0.4, 0.7)
              break
            case 'KIDNEYS':
              c.setRGB(0.1, 0.8, 0.4)
              break
            case 'INTESTINES':
              c.setRGB(0.9, 0.8, 0.1)
              break
            default:
              // Dim translucent body outline
              c.setRGB(0.12, 0.35, 0.24)
          }
          
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
          opacity: 0.88,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })
        particlePoints = new THREE.Points(particleGeo, pointsMat)
        disposables.push(pointsMat)
        humanoid.add(particlePoints)

        /* Plexus network lines */
        const plexusGeo = new THREE.BufferGeometry()
        plexusGeo.setAttribute('position', new THREE.Float32BufferAttribute(buildPlexusLines(points), 3))
        disposables.push(plexusGeo)
        const plexusMat = new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.08 })
        disposables.push(plexusMat)
        humanoid.add(new THREE.LineSegments(plexusGeo, plexusMat))

        /* Hex overlays */
        const hexGeo = createHexGeometry(0.016)
        disposables.push(hexGeo)
        const hexStep = Math.max(1, Math.floor(points.length / 600))
        for (let i = 0; i < points.length; i += hexStep) {
          const organ = organs[i]
          let hexColor = 0x5eead4
          if (organ === 'BRAIN') hexColor = 0xb280ff
          else if (organ === 'HEART') hexColor = 0xff3355
          else if (organ === 'LUNGS') hexColor = 0x33b2ff
          else if (organ === 'LIVER') hexColor = 0xff9933
          else if (organ === 'STOMACH') hexColor = 0xff66b2
          else if (organ === 'KIDNEYS') hexColor = 0x33ff99
          else if (organ === 'INTESTINES') hexColor = 0xeeee33

          const mesh = new THREE.Mesh(hexGeo, new THREE.MeshBasicMaterial({
            color: hexColor,
            transparent: true,
            opacity: organ === 'SKIN_LIMBS' ? 0.2 : 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }))
          mesh.position.copy(points[i])
          mesh.lookAt(camera.position)
          humanoid.add(mesh)
          hexMeshes.push({ mesh })
        }

        /* Per-organ glow PointLights */
        const organGroups = {}
        points.forEach((p, i) => {
          const organ = organs[i]
          if (organ !== 'SKIN_LIMBS') {
            if (!organGroups[organ]) organGroups[organ] = []
            organGroups[organ].push(p)
          }
        })

        organLights = Object.entries(organGroups).map(([organ, pts]) => {
          const center = new THREE.Vector3()
          pts.forEach(p => center.add(p))
          center.divideScalar(pts.length)
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
          }
        })

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

    /* ── Resize ────────────────────────────────────────── */
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    }
    window.addEventListener('resize', onResize)

    /* ── Cleanup ───────────────────────────────────────── */
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      container.removeEventListener('mousemove', onMouseMove)
      container.removeEventListener('click', onCanvasClick)
      hexMeshes.forEach(({ mesh }) => mesh.material?.dispose())
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [modelKey, modelMeta.url])

  /* ── Callout state ───────────────────────────────────── */
  const displayRegion = hoveredRegion || activeRegion
  const isCalloutActive = displayRegion !== null
  const calloutColor = ORGAN_COLORS[displayRegion] || '#33d399'
  const calloutSystem = ORGAN_SYSTEMS[displayRegion] || 'Integumentary System'
  const calloutPos = CALLOUT_POSITIONS[displayRegion]
  const displayLabel = displayRegion === 'SKIN_LIMBS' ? 'SKIN & LIMBS' : displayRegion

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden" style={{ background: '#060e0a' }}>
      <div ref={mountRef} className="absolute inset-0" />



      {/* Minimal corner HUD indicators */}
      <div className="absolute top-3.5 left-4 pointer-events-none select-none z-10">
        <div className="text-[9px] text-accent2/50 font-mono tracking-widest">BIOMETRIC SCAN</div>
        <div className="text-[8px] text-white/30 font-mono mt-0.5">{modelMeta.label} · {modelKey}</div>
      </div>
      <div className="absolute top-3.5 right-4 pointer-events-none select-none text-right z-10">
        <div className="text-[8px] text-accent2/40 font-mono">PARTICLE SCAN: ACTIVE</div>
      </div>

      {/* ══ FLOATING CALLOUT TOOLTIP ══ */}
      {isCalloutActive && calloutPos && (
        <div 
          className="absolute z-20 flex items-center pointer-events-none transition-all duration-300"
          style={{
            top: calloutPos.top,
            ...(calloutPos.lineDirection === 'left' 
              ? { left: calloutPos.left, flexDirection: 'row-reverse' } 
              : { right: calloutPos.right, flexDirection: 'row' })
          }}
        >
          {/* Callout info box */}
          <div 
            className="premium-glass p-3 rounded-xl border text-left min-w-[175px] shadow-lg animate-fade-in"
            style={{
              borderColor: `${calloutColor}50`,
              boxShadow: `0 4px 20px ${calloutColor}18, 0 0 1px 1px rgba(255, 255, 255, 0.04) inset`,
              background: 'rgba(6, 14, 10, 0.78)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)'
            }}
          >
            <div 
              className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
              style={{ color: calloutColor }}
            >
              <span>{displayLabel}</span>
              <span className="text-[7px] opacity-70 font-normal tracking-normal px-1.5 py-0.5 rounded bg-white/5 border border-white/10 uppercase">
                {activeRegion === displayRegion ? 'Active' : 'Hover'}
              </span>
            </div>
            
            <div className="space-y-0.5 text-[8px] font-mono text-white/75 leading-normal">
              <div><span className="opacity-40">| </span>{displayLabel}</div>
              <div><span className="opacity-40">| </span>{calloutSystem}</div>
              <div><span className="opacity-40">| </span>Status: Actively Monitored</div>
              <div><span className="opacity-40">| </span>Current Focus</div>
            </div>
          </div>

          {/* Dashed connector line */}
          <div 
            className="border-t border-dashed h-0 transition-all duration-300"
            style={{
              borderColor: calloutColor,
              width: '40px',
              opacity: 0.8,
              filter: `drop-shadow(0 0 3px ${calloutColor})`
            }}
          />

          {/* Pulsing target dot */}
          <div 
            className="w-2.5 h-2.5 rounded-full relative flex items-center justify-center"
            style={{
              backgroundColor: calloutColor,
              boxShadow: `0 0 10px 3px ${calloutColor}`
            }}
          >
            <span 
              className="absolute w-5 h-5 rounded-full animate-ping opacity-50"
              style={{ backgroundColor: calloutColor }}
            />
          </div>
        </div>
      )}

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
