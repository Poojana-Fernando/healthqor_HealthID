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

/**
 * Derive a clean trunk reference frame from the body mesh, excluding arms/legs.
 * Returns torso center (x,z), half extents, and vertical metrics in body space.
 * Works for any normalized humanoid (male or female) since it reads geometry.
 */
export function computeTorsoFrame(points, bodyBox) {
  const size = bodyBox.getSize(new THREE.Vector3())
  const center = bodyBox.getCenter(new THREE.Vector3())

  // Keep only central trunk band (chest + abdomen, near the midline) so arms
  // and legs don't inflate the torso width/depth used for organ anchoring.
  const trunk = points.filter((p) => {
    const relY = (p.y - bodyBox.min.y) / (size.y || 1)
    const relXFromCenter = Math.abs(p.x - center.x) / (size.x || 1)
    return relY > 0.46 && relY < 0.8 && relXFromCenter < 0.2
  })

  const frameBox =
    trunk.length > 40 ? new THREE.Box3().setFromPoints(trunk) : bodyBox
  const fSize = frameBox.getSize(new THREE.Vector3())
  const fCenter = frameBox.getCenter(new THREE.Vector3())

  return {
    centerX: fCenter.x,
    centerZ: fCenter.z,
    halfWidth: Math.max(fSize.x / 2, size.x * 0.06),
    halfDepth: Math.max(fSize.z / 2, size.z * 0.06),
    minY: bodyBox.min.y,
    height: size.y,
  }
}

/** Compute centroid and bounding size per organ from classified body points */
export function computeOrganRegions(points, organTags) {
  const groups = {}
  points.forEach((p, i) => {
    const organ = organTags[i]
    if (!groups[organ]) groups[organ] = []
    groups[organ].push(p)
  })

  const regions = {}
  Object.entries(groups).forEach(([organ, pts]) => {
    if (!pts.length) return
    const box = new THREE.Box3().setFromPoints(pts)
    regions[organ] = {
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
      box,
    }
  })
  return regions
}

/** Split bilateral organ points into left/right hemispheres */
export function computeBilateralRegions(points, organTags, organName, axisX) {
  const left = []
  const right = []
  points.forEach((p, i) => {
    if (organTags[i] !== organName) return
    if (p.x <= axisX) left.push(p)
    else right.push(p)
  })

  const build = (pts) => {
    if (!pts.length) return null
    const box = new THREE.Box3().setFromPoints(pts)
    return {
      center: box.getCenter(new THREE.Vector3()),
      size: box.getSize(new THREE.Vector3()),
      box,
    }
  }

  return { left: build(left), right: build(right) }
}

/** Position and scale a loaded organ object to anatomical anchor in body space */
export function placeOrganObject(object, anchor, sizeTarget, rotation = null) {
  const wrapper = new THREE.Group()
  wrapper.position.copy(anchor)

  const pivot = new THREE.Group()
  if (rotation) {
    pivot.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0)
  }
  wrapper.add(pivot)

  const clone = object.clone(true)
  pivot.add(clone)
  clone.updateMatrixWorld(true)

  const box = new THREE.Box3().setFromObject(clone)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const sx = sizeTarget.x / Math.max(size.x, 0.001)
  const sy = sizeTarget.y / Math.max(size.y, 0.001)
  const sz = sizeTarget.z / Math.max(size.z, 0.001)

  clone.position.sub(center)
  pivot.scale.set(sx, sy, sz)

  return wrapper
}

/** Scale organ mesh non-uniformly to match anatomical region dimensions */
export function placeOrganMeshSized(vertices, anchor, sizeTarget, rotation = null) {
  if (vertices.length === 0) return []

  const box = new THREE.Box3().setFromPoints(vertices)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const sx = sizeTarget.x / Math.max(size.x, 0.001)
  const sy = sizeTarget.y / Math.max(size.y, 0.001)
  const sz = sizeTarget.z / Math.max(size.z, 0.001)
  const euler = rotation
    ? new THREE.Euler(rotation.x || 0, rotation.y || 0, rotation.z || 0)
    : null

  return vertices.map((v) => {
    const p = v.clone().sub(center)
    p.x *= sx
    p.y *= sy
    p.z *= sz
    if (euler) p.applyEuler(euler)
    return p.add(anchor)
  })
}

/** Scale organ mesh to target size and move to anchor point in body space */
export function placeOrganMesh(vertices, anchor, targetSize) {
  if (vertices.length === 0) return []

  const box = new THREE.Box3().setFromPoints(vertices)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const scale = targetSize / maxDim

  return vertices.map((v) =>
    v.clone().sub(center).multiplyScalar(scale).add(anchor)
  )
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
