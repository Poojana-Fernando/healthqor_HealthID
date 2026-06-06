import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import {
  buildPlexusLines,
  classifyParticles,
  createHexGeometry,
  extractVertices,
  normalizeMeshVertices,
  sampleVertices,
} from './meshParticles'

const MODELS = {
  MALE: { url: '/models/FinalBaseMesh.obj', label: 'FinalBaseMesh.obj' },
  FEMALE: { url: '/models/FemaleBaseMesh.obj', label: 'FemaleBaseMesh.obj' },
}

function resolveModelKey(gender) {
  const value = String(gender ?? 'MALE').trim().toUpperCase()
  return value === 'FEMALE' ? 'FEMALE' : 'MALE'
}

export default function HumanoidFigure({ gender = 'MALE' }) {
  const mountRef = useRef(null)
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const modelKey = resolveModelKey(gender)
  const modelMeta = MODELS[modelKey]

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    let disposed = false
    let frame
    const width = container.clientWidth
    const height = container.clientHeight

    setLoadState('loading')
    setLoadError(null)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0c1a14)
    scene.fog = new THREE.FogExp2(0x0c1a14, 0.07)

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100)
    camera.position.set(0, 0.1, 5.5)
    camera.lookAt(0, 0.2, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0x34d399, 0.35))
    const key = new THREE.DirectionalLight(0x5eead4, 1.0)
    key.position.set(2, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x10b981, 0.6)
    rim.position.set(-3, 2, -2)
    scene.add(rim)

    const humanoid = new THREE.Group()
    scene.add(humanoid)

    const pedestal = new THREE.Group()
    pedestal.position.y = -1.85
    pedestal.add(new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.04, 1.5),
      new THREE.MeshPhysicalMaterial({ color: 0x0c1a14, metalness: 0.85, roughness: 0.25 })
    ))
    const rings = [0.5, 0.66, 0.82].map((r, i) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.01, 64),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0x5eead4 : 0x34d399,
          transparent: true,
          opacity: 0.35 - i * 0.08,
          side: THREE.DoubleSide,
        })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.y = 0.025 + i * 0.004
      ring.userData.speed = 0.25 + i * 0.12
      ring.userData.dir = i % 2 === 0 ? 1 : -1
      pedestal.add(ring)
      return ring
    })
    scene.add(pedestal)

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2(-10, -10)
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const intersect = new THREE.Vector3()
    const clock = new THREE.Clock()

    let originals = []
    let offsets = []
    let particleGeo = null
    let hexMeshes = []
    let heartLight = null
    const disposables = []

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    }
    container.addEventListener('mousemove', onMouseMove)

    const animate = () => {
      frame = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()
      humanoid.rotation.y = t * 0.22
      rings.forEach((ring) => {
        ring.rotation.z = t * ring.userData.speed * ring.userData.dir
      })

      if (particleGeo && originals.length) {
        raycaster.setFromCamera(mouse, camera)
        raycaster.ray.intersectPlane(plane, intersect)
        const localHit = intersect.clone()
        humanoid.worldToLocal(localHit)

        const posAttr = particleGeo.attributes.position
        originals.forEach((orig, i) => {
          const dist = orig.distanceTo(localHit)
          const push = Math.max(0, 1 - dist / 0.45) * 0.18
          if (push > 0) {
            const dir = orig.clone().sub(localHit)
            if (dir.lengthSq() > 0.0001) dir.normalize().multiplyScalar(push)
            offsets[i].lerp(dir, 0.12)
          } else {
            offsets[i].lerp(new THREE.Vector3(), 0.06)
          }
          const p = orig.clone().add(offsets[i])
          posAttr.setXYZ(i, p.x, p.y, p.z)
        })
        posAttr.needsUpdate = true

        hexMeshes.forEach(({ mesh, index }) => {
          const orig = originals[index]
          const dist = orig.distanceTo(localHit)
          const push = Math.max(0, 1 - dist / 0.4) * 0.25
          if (push > 0) {
            mesh.position.copy(orig).add(orig.clone().sub(localHit).normalize().multiplyScalar(push))
            mesh.material.opacity = 0.9
          } else {
            mesh.position.copy(orig)
            mesh.material.opacity = 0.4
          }
          mesh.lookAt(camera.position)
        })

        if (heartLight) heartLight.intensity = 1.2 + Math.sin(t * 2.2) * 0.35
      }

      renderer.render(scene, camera)
    }
    animate()

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
        const points = sampleVertices(normalized, 2400)
        const types = classifyParticles(points)

        originals = points.map((p) => p.clone())
        offsets = points.map(() => new THREE.Vector3())

        const positions = new Float32Array(points.length * 3)
        const colors = new Float32Array(points.length * 3)
        const c = new THREE.Color()

        points.forEach((p, i) => {
          positions[i * 3] = p.x
          positions[i * 3 + 1] = p.y
          positions[i * 3 + 2] = p.z
          if (types[i] === 1) c.setRGB(1.0, 0.3, 0.42)
          else c.setRGB(0.52, 0.92, 0.78)
          colors[i * 3] = c.r
          colors[i * 3 + 1] = c.g
          colors[i * 3 + 2] = c.b
        })

        particleGeo = new THREE.BufferGeometry()
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
        disposables.push(particleGeo)

        humanoid.add(new THREE.Points(particleGeo, new THREE.PointsMaterial({
          size: 0.028,
          vertexColors: true,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        })))

        const plexusGeo = new THREE.BufferGeometry()
        plexusGeo.setAttribute('position', new THREE.Float32BufferAttribute(buildPlexusLines(points), 3))
        disposables.push(plexusGeo)
        humanoid.add(new THREE.LineSegments(
          plexusGeo,
          new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.12 })
        ))

        const hexGeo = createHexGeometry(0.016)
        disposables.push(hexGeo)
        const hexStep = Math.max(1, Math.floor(points.length / 500))
        for (let i = 0; i < points.length; i += hexStep) {
          const mesh = new THREE.Mesh(hexGeo, new THREE.MeshBasicMaterial({
            color: types[i] === 1 ? 0xff4466 : 0x5eead4,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }))
          mesh.position.copy(points[i])
          humanoid.add(mesh)
          hexMeshes.push({ mesh, index: i })
        }

        const chestPoints = points.filter((_, i) => types[i] === 1)
        if (chestPoints.length) {
          const chestCenter = new THREE.Vector3()
          chestPoints.forEach((p) => chestCenter.add(p))
          chestCenter.divideScalar(chestPoints.length)
          heartLight = new THREE.PointLight(0xff3355, 1.4, 2.5)
          heartLight.position.copy(chestCenter)
          humanoid.add(heartLight)
        }

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

    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousemove', onMouseMove)
      hexMeshes.forEach(({ mesh }) => mesh.material?.dispose())
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [modelKey, modelMeta.url])

  return (
    <div className="relative w-full h-full min-h-[560px] rounded-2xl overflow-hidden bg-[#0c1a14]/40">
      <div ref={mountRef} className="absolute inset-0" />

      {loadState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-accent2/60 text-sm">
          Loading {modelKey === 'FEMALE' ? 'female' : 'male'} scan mesh...
        </div>
      )}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
          {loadError}
        </div>
      )}

      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="text-[10px] text-accent2/70 font-mono tracking-widest mb-1">BIOMETRICS</div>
        <div className="text-lg font-mono text-white/90">98 <span className="text-accent2 text-sm">5,178</span></div>
      </div>

      <div className="absolute top-4 right-4 pointer-events-none select-none text-right">
        <div className="text-[9px] text-accent2/60 font-mono">PARTICLE SCAN: ACTIVE</div>
        <div className="text-[9px] text-white/40 font-mono mt-1">{modelMeta.label}</div>
        <div className="text-[8px] text-accent2/40 font-mono mt-0.5">{modelKey}</div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="text-[9px] text-accent2/40 font-mono tracking-[0.3em]">HOLOGRAPHIC PARTICLE HUMANOID</div>
      </div>
    </div>
  )
}
