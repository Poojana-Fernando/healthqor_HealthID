import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchDrivingRoute } from '../../lib/osrmRoute'
import { getFacilityStyle } from '../../lib/facilityUtils'
import FacilityMapLegend from './FacilityMapLegend'

const MAP_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

const ROUTE_COLOR = '#34d399'
const ROUTE_OUTLINE = '#ecfdf5'

function createPinIcon(color, size = 32, borderWidth = 2) {
  return L.divIcon({
    className: 'facility-map-pin',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:${borderWidth}px solid rgba(255,255,255,0.95);
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 0 12px ${color}99;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

const userIcon = createPinIcon('#dc2626', 30)
const iconCache = new Map()

function getCachedIcon(facility, { selected, recommended }) {
  const style = getFacilityStyle(facility)
  let color = style.color
  let size = style.pinSize
  let borderWidth = 2
  let borderColor = style.pinBorderColor ?? 'rgba(255,255,255,0.95)'

  if (recommended) {
    size += 2
    borderWidth = 3
    borderColor = '#6ee7b7'
  }
  if (selected) {
    size += 4
    borderWidth = 3
    borderColor = '#f0fdf4'
  }

  const key = `${facility.id}-${selected}-${recommended}-${color}-${size}-${borderColor}`
  if (!iconCache.has(key)) {
    iconCache.set(key, L.divIcon({
      className: 'facility-map-pin',
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${color};
        border:${borderWidth}px solid ${borderColor};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 0 12px ${color}99;
      "></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size],
    }))
  }
  return iconCache.get(key)
}

function FitRouteBounds({ positions, active }) {
  const map = useMap()
  useEffect(() => {
    if (!active || !positions?.length) return
    if (positions.length >= 2) {
      map.fitBounds(positions, { padding: [48, 48], maxZoom: 15, animate: true })
    } else if (positions.length === 1) {
      map.flyTo(positions[0], 15, { duration: 0.8 })
    }
  }, [active, positions, map])
  return null
}

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const resize = () => map.invalidateSize()
    resize()
    const timer = setTimeout(resize, 100)

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(resize)
      : null
    observer?.observe(container.parentElement ?? container)

    window.addEventListener('resize', resize)
    return () => {
      clearTimeout(timer)
      observer?.disconnect()
      window.removeEventListener('resize', resize)
    }
  }, [map])
  return null
}

export default function FacilityMap({
  center,
  userLocation,
  facilities = [],
  selectedId,
  recommendedId,
  onSelectFacility,
}) {
  const [routeCoords, setRouteCoords] = useState([])
  const [routeMeta, setRouteMeta] = useState(null)
  const [routeError, setRouteError] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)

  const selectedFacility = useMemo(
    () => facilities.find((f) => f.id === selectedId),
    [facilities, selectedId],
  )

  useEffect(() => {
    if (!selectedFacility || !userLocation) {
      setRouteCoords([])
      setRouteMeta(null)
      setRouteError('')
      setRouteLoading(false)
      return
    }

    let cancelled = false
    setRouteError('')
    setRouteLoading(true)

    fetchDrivingRoute(userLocation, { lat: selectedFacility.lat, lng: selectedFacility.lng })
      .then((route) => {
        if (cancelled) return
        setRouteCoords(route.coordinates)
        setRouteMeta({
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          destination: selectedFacility.name,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setRouteCoords([])
        setRouteMeta(null)
        setRouteError(err.message || 'Could not load route')
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedFacility, userLocation])

  const boundsPositions = useMemo(() => {
    if (routeCoords.length >= 2) return routeCoords
    if (selectedFacility) return [[selectedFacility.lat, selectedFacility.lng]]
    if (userLocation) return [[userLocation.lat, userLocation.lng]]
    return [center]
  }, [routeCoords, selectedFacility, userLocation, center])

  const getFacilityIcon = (facility) => {
    const selected = facility.id === selectedId
    const recommended = facility.id === recommendedId
    if (selected) {
      return getCachedIcon(facility, { selected: true, recommended: false })
    }
    if (recommended) {
      return getCachedIcon(facility, { selected: false, recommended: true })
    }
    return getCachedIcon(facility, { selected: false, recommended: false })
  }

  return (
    <>
      <MapContainer
        center={center}
        zoom={13}
        className="facility-map rounded-2xl"
        scrollWheelZoom
        zoomControl
      >
        <TileLayer url={MAP_TILES} attribution={TILE_ATTRIBUTION} maxZoom={20} />
        <MapResizer />
        <FitRouteBounds positions={boundsPositions} active={Boolean(selectedFacility)} />

        {routeCoords.length >= 2 && (
          <>
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: ROUTE_OUTLINE,
                weight: 8,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={routeCoords}
              pathOptions={{
                color: ROUTE_COLOR,
                weight: 5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>
              <div className="facility-popup">
                <strong>Your location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {facilities.map((facility) => (
          <Marker
            key={facility.id}
            position={[facility.lat, facility.lng]}
            icon={getFacilityIcon(facility)}
            eventHandlers={{
              click: () => onSelectFacility?.(facility),
            }}
          >
            <Popup>
              <div className="facility-popup">
                <strong>{facility.name}</strong>
                <p className="capitalize">
                  {getFacilityStyle(facility).label} · {facility.distanceKm} km
                </p>
                {facility.phone && <p>{facility.phone}</p>}
                {facility.address && <p>{facility.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <FacilityMapLegend />

      {routeLoading && selectedFacility && (
        <div className="facility-route-badge" aria-live="polite">
          Calculating best route to {selectedFacility.name}…
        </div>
      )}

      {routeMeta && !routeLoading && (
        <div className="facility-route-badge" aria-live="polite">
          <span className="font-semibold text-accent2">Route to {routeMeta.destination}</span>
          <span>{routeMeta.durationMin} min drive · {routeMeta.distanceKm} km</span>
        </div>
      )}

      {routeError && selectedFacility && !routeLoading && (
        <div className="facility-route-badge facility-route-badge--error" aria-live="polite">
          {routeError}
        </div>
      )}
      {selectedFacility && !userLocation && !routeLoading && (
        <div className="facility-route-badge facility-route-badge--error" aria-live="polite">
          Enable location to see the driving route.
        </div>
      )}
    </>
  )
}
