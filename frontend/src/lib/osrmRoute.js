const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

export async function fetchDrivingRoute(from, to) {
  const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=false`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Could not calculate route')
  }

  const data = await res.json()
  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('No driving route found')
  }

  const route = data.routes[0]
  const coordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])

  return {
    coordinates,
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
  }
}
