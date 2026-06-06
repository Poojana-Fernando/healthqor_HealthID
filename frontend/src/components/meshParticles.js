import * as THREE from 'three'

/** Extract world-space vertices from loaded OBJ group */
export function extractVertices(object) {
  const vertices = []
  object.updateMatrixWorld(true)
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry?.attributes?.position) return
    const pos = child.geometry.attributes.position
    const m = child.matrixWorld
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      v.applyMatrix4(m)
      vertices.push(v.clone())
    }
  })
  return vertices
}

/** Center, scale to target height, face camera-forward */
export function normalizeMeshVertices(vertices, targetHeight = 3.6) {
  if (vertices.length === 0) return []

  const box = new THREE.Box3().setFromPoints(vertices)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const scale = targetHeight / size.y

  return vertices.map((v) => {
    const p = v.clone().sub(center).multiplyScalar(scale)
    // OBJ is y-up; slight forward tilt for presentation
    return new THREE.Vector3(p.x, p.y, p.z)
  })
}

/** Downsample while preserving silhouette density */
export function sampleVertices(vertices, targetCount = 2200) {
  if (vertices.length <= targetCount) return vertices
  const step = vertices.length / targetCount
  const sampled = []
  for (let i = 0; i < targetCount; i++) {
    sampled.push(vertices[Math.floor(i * step)])
  }
  return sampled
}

/** Classify particles: 0=body, 1=chest/heart region */
export function classifyParticles(points) {
  const types = new Array(points.length).fill(0)
  const box = new THREE.Box3().setFromPoints(points)
  const center = box.getCenter(new THREE.Vector3())

  points.forEach((p, i) => {
    const relY = (p.y - box.min.y) / (box.max.y - box.min.y)
    const relX = (p.x - center.x) / (box.max.x - box.min.x + 0.001)
    // Chest band + slight left bias (anatomical heart position)
    if (relY > 0.52 && relY < 0.68 && relX < 0.15 && p.z > center.z - 0.1) {
      types[i] = 1
    }
  })
  return types
}

export function buildPlexusLines(points, maxDist = 0.09, maxLinks = 1000) {
  const verts = []
  let links = 0
  const step = Math.max(1, Math.floor(points.length / 320))
  for (let i = 0; i < points.length && links < maxLinks; i += step) {
    for (let j = i + step; j < points.length && links < maxLinks; j += step) {
      if (points[i].distanceTo(points[j]) < maxDist) {
        verts.push(
          points[i].x, points[i].y, points[i].z,
          points[j].x, points[j].y, points[j].z
        )
        links++
      }
    }
  }
  return verts
}

export function createHexGeometry(size = 0.018) {
  const shape = new THREE.Shape()
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
    const x = Math.cos(angle) * size
    const y = Math.sin(angle) * size
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}
