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
        const organ = organs[pointIndex]
        if (organ && onRegionClick) {
          onRegionClick(organ)
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
            const organ = organs[pointsHit.index]
            if (organ && hoveredRegionRef.current !== organ) {
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
        const currentTargetRegion = hoveredRegionRef.current || activeRegion
        for (let i = 0, len = hexMeshes.length; i < len; i++) {
          const { mesh, organ } = hexMeshes[i]
          const isTarget = organ === currentTargetRegion
          
          const targetScale = isTarget ? (1.35 + Math.sin(t * 8) * 0.15) : 1.0
          const targetOpacity = isTarget ? 0.98 : (organ === 'SKIN_LIMBS' ? 0.12 : 0.35)
          
          mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.15))
          mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, targetOpacity, 0.15)
          mesh.lookAt(camera.position)
        }

        // Dynamic expanding/breathing particle animation and color vibrancy on hover
        const posAttr = particleGeo?.getAttribute('position')
        const colorAttr = particleGeo?.getAttribute('color')
        if (posAttr && colorAttr && organs.length) {
          let posNeedsUpdate = false
          let colorNeedsUpdate = false
          for (let i = 0; i < originals.length; i++) {
            const organ = organs[i]
            const isTarget = organ === currentTargetRegion
            const orig = originals[i]
            
            // Position
            const currX = posAttr.getX(i)
            const currY = posAttr.getY(i)
            const currZ = posAttr.getZ(i)
            
            let targetX = orig.x
            let targetY = orig.y
            let targetZ = orig.z
            
            if (isTarget) {
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
            
            let baseR, baseG, baseB
            switch (organ) {
              case 'BRAIN':      baseR = 0.7;  baseG = 0.3;  baseB = 0.9;  break
              case 'HEART':      baseR = 1.0;  baseG = 0.15; baseB = 0.3;  break
              case 'LUNGS':      baseR = 0.2;  baseG = 0.6;  baseB = 1.0;  break
              case 'LIVER':      baseR = 1.0;  baseG = 0.5;  baseB = 0.1;  break
              case 'STOMACH':    baseR = 1.0;  baseG = 0.4;  baseB = 0.7;  break
              case 'KIDNEYS':    baseR = 0.1;  baseG = 0.8;  baseB = 0.4;  break
              case 'INTESTINES': baseR = 0.9;  baseG = 0.8;  baseB = 0.1;  break
              default:           baseR = 0.12; baseG = 0.35; baseB = 0.24;
            }
            
            let targetR = baseR
            let targetG = baseG
            let targetB = baseB
            
            if (isTarget) {
              const pulse = Math.sin(t * 16 + i) * 0.12
              if (organ === 'BRAIN') {
                targetR = 0.98; targetG = 0.4 + pulse; targetB = 1.0
              } else if (organ === 'HEART') {
                targetR = 1.0; targetG = 0.0; targetB = 0.1 + pulse
              } else if (organ === 'LUNGS') {
                targetR = 0.05 + pulse; targetG = 0.9; targetB = 1.0
              } else if (organ === 'LIVER') {
                targetR = 1.0; targetG = 0.75 + pulse; targetB = 0.0
              } else if (organ === 'STOMACH') {
                targetR = 1.0; targetG = 0.1; targetB = 0.75 + pulse
              } else if (organ === 'KIDNEYS') {
                targetR = 0.0; targetG = 1.0; targetB = 0.55 + pulse
              } else if (organ === 'INTESTINES') {
                targetR = 1.0; targetG = 0.98; targetB = 0.0
              } else if (organ === 'SKIN_LIMBS') {
                targetR = 0.2; targetG = 0.95 + pulse; targetB = 0.5
              }
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

    /* ── OBJ model loading ─────────────────────────────── */
    const loader = new OBJLoader()
    loader.load(
      modelUrl,
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
        organs = points.map((p) => getOrganFromPoint(p, box))
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
          hexMeshes.push({ mesh, organ })
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
            organ,
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
