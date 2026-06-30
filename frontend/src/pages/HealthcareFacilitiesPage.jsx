import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import ConditionSelect from '../components/healthcare/ConditionSelect'
import FacilityCard from '../components/healthcare/FacilityCard'
import FacilityMap from '../components/healthcare/FacilityMap'
import HealthIdLoadingIcon from '../components/ui/HealthIdLoadingIcon'
import LoadingButton from '../components/ui/LoadingButton'
import './HealthcareFacilitiesPage.css'

const DEFAULT_LOCATION = { lat: 6.9271, lng: 79.8612, label: 'Colombo (default)' }

export default function HealthcareFacilitiesPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [condition, setCondition] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [locationLabel, setLocationLabel] = useState('')
  const [locationDenied, setLocationDenied] = useState(false)
  const [locating, setLocating] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [disclaimer, setDisclaimer] = useState('')
  const [facilities, setFacilities] = useState([])
  const [recommendedId, setRecommendedId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const listRef = useRef(null)

  const mapCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng]

  useEffect(() => {
    if (!authLoading && !user) navigate('/login')
  }, [user, authLoading, navigate])

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true)
      setLocationLabel(DEFAULT_LOCATION.label)
      return
    }

    setLocating(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLabel('Your current location')
        setLocationDenied(false)
        setLocating(false)
      },
      () => {
        setLocationDenied(true)
        setLocationLabel(DEFAULT_LOCATION.label)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }, [])

  useEffect(() => {
    if (user) requestLocation()
  }, [user, requestLocation])

  const handleSearch = async () => {
    if (!condition.trim()) {
      setError('Please select or enter a medical condition.')
      return
    }

    const lat = userLocation?.lat ?? DEFAULT_LOCATION.lat
    const lng = userLocation?.lng ?? DEFAULT_LOCATION.lng

    setSearching(true)
    setError('')
    setFacilities([])
    setRecommendedId(null)
    setSelectedId(null)

    try {
      const res = await api.searchHealthcareFacilities(condition.trim(), lat, lng, 15)
      setFacilities(res.facilities || [])
      setRecommendedId(res.recommendedFacilityId || null)
      setDisclaimer(res.disclaimer || '')
      if (res.recommendedFacilityId) {
        setSelectedId(res.recommendedFacilityId)
      }
      if (!res.facilities?.length) {
        setError(res.disclaimer || 'No facilities found nearby.')
      }
    } catch (e) {
      setError(e.message || 'Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectFacility = (facility) => {
    setSelectedId(facility.id)
    const el = listRef.current?.querySelector(`[data-facility-id="${facility.id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <HealthIdLoadingIcon />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
          <span className="text-gradient-health">Find Care</span> near you
        </h1>
        <p className="text-white/60 max-w-2xl">
          Choose your medical condition and discover nearby hospitals, clinics, and pharmacies ranked by AI for your needs.
        </p>
      </div>

      <div className="premium-glass rounded-3xl p-4 md:p-6 mb-6">
        <div className="grid md:grid-cols-[1fr_auto_auto] gap-4 items-end">
          <ConditionSelect value={condition} onChange={setCondition} disabled={searching} />

          <button
            type="button"
            onClick={requestLocation}
            disabled={locating}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:border-accent/50 text-sm transition h-10"
          >
            <Navigation className={`w-4 h-4 ${locating ? 'animate-pulse' : ''}`} />
            {locating ? 'Locating...' : 'Use my location'}
          </button>

          <LoadingButton
            onClick={handleSearch}
            loading={searching}
            disabled={!condition.trim()}
            className="h-10 px-6"
          >
            <Search className="w-4 h-4 mr-2 inline" />
            Search
          </LoadingButton>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <MapPin className="w-3.5 h-3.5 text-accent/70" />
          <span>
            {locationLabel || 'Detecting location...'}
            {locationDenied && ' — enable location for more accurate results'}
          </span>
        </div>

        {error && (
          <p className="mt-3 text-sm text-amber-300/90">{error}</p>
        )}
        {disclaimer && facilities.length > 0 && (
          <p className="mt-3 text-xs text-white/45 leading-relaxed">{disclaimer}</p>
        )}
      </div>

      <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-6 items-start">
        <div
          ref={listRef}
          className="order-2 lg:order-1 flex flex-col gap-3 overflow-y-auto find-care-scroll find-care-results pr-1"
        >
          {searching && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/60">
              <HealthIdLoadingIcon />
              <p className="text-sm">Searching facilities and ranking matches...</p>
            </div>
          )}

          {!searching && facilities.length === 0 && (
            <div className="premium-glass rounded-2xl p-8 text-center text-white/50 text-sm">
              Select a condition and search to see nearby healthcare facilities.
            </div>
          )}

          {!searching && facilities.map((facility) => (
            <div key={facility.id} data-facility-id={facility.id}>
              <FacilityCard
                facility={facility}
                isRecommended={facility.id === recommendedId}
                isSelected={facility.id === selectedId}
                onSelect={handleSelectFacility}
              />
            </div>
          ))}
        </div>

        <div className="order-1 lg:order-2 find-care-map-shell premium-glass rounded-3xl overflow-hidden p-1">
          <div className="find-care-map-frame">
            <FacilityMap
              center={mapCenter}
              userLocation={userLocation}
              facilities={facilities}
              selectedId={selectedId}
              recommendedId={recommendedId}
              onSelectFacility={handleSelectFacility}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
