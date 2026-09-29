import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { doc } from 'firebase/firestore'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../context/AuthContext.jsx'
import { db } from '../firebase.js'
import { fetchFloodData } from '../utils/floodData.js'
import { geocode, getCurrentPosition, reverseGeocode } from '../utils/geolocation.js'
import { calculateRisk } from '../utils/riskScore.js'
import { getFirestoreDocWithTimeout } from '../utils/firestore.js'

const FloodDetails = lazy(() => import('../components/FloodDetails.jsx'))

const LOCATION_MARKER = L.divIcon({
  className: 'flood-map-marker',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

function RecenterMap({ location }) {
  const map = useMap()

  useEffect(() => {
    map.setView([location.lat, location.lon], 11)
  }, [location.lat, location.lon, map])

  return null
}

export default function HomePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [useMyLocation, setUseMyLocation] = useState(false)
  const [location, setLocation] = useState(null)
  const [floodData, setFloodData] = useState(null)
  const [risk, setRisk] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const requestId = useRef(0)
  const userInitiatedLookup = useRef(false)

  const loadLocation = useCallback(async (resolveLocation, onError) => {
    const currentRequest = ++requestId.current
    setError('')
    setIsLoading(true)

    try {
      const nextLocation = await resolveLocation()
      if (currentRequest !== requestId.current) return
      if (!nextLocation) throw new Error('We could not find that location. Try a nearby town or city.')

      const nextFloodData = await fetchFloodData(nextLocation.lat, nextLocation.lon)
      if (currentRequest !== requestId.current) return

      setLocation(nextLocation)
      setFloodData(nextFloodData)
      setRisk(calculateRisk(nextFloodData.daily))
    } catch (lookupError) {
      if (currentRequest === requestId.current) {
        setError(lookupError instanceof Error ? lookupError.message : 'Could not load flood data. Please try again.')
        onError?.()
      }
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function loadSavedLocation() {
      let localSaved = ''
      try {
        localSaved = (user?.uid ? localStorage.getItem(`floodsense-saved-location-${user.uid}`) : '') ||
          localStorage.getItem('floodsense-saved-location') || ''
      } catch {
        localSaved = ''
      }

      if (localSaved && !userInitiatedLookup.current) {
        setQuery(localSaved)
        void loadLocation(() => geocode(localSaved.trim()))
      }

      if (!user?.uid) {
        if (!localSaved) setIsLoading(false)
        return
      }

      try {
        const profile = await getFirestoreDocWithTimeout(doc(db, 'users', user.uid))
        if (!isCurrent || userInitiatedLookup.current) return

        const savedLocation = profile.exists() ? profile.data().savedLocation : null
        if (typeof savedLocation !== 'string' || !savedLocation.trim()) {
          if (!localSaved) setIsLoading(false)
          return
        }

        try {
          localStorage.setItem(`floodsense-saved-location-${user.uid}`, savedLocation)
        } catch {}

        if (savedLocation !== localSaved) {
          setQuery(savedLocation)
          await loadLocation(() => geocode(savedLocation.trim()))
        }
      } catch (err) {
        console.warn('Could not load saved location from Firestore:', err)
        if (isCurrent && !userInitiatedLookup.current && !localSaved) {
          setIsLoading(false)
        }
      }
    }

    void loadSavedLocation()

    return () => {
      isCurrent = false
    }
  }, [loadLocation, user])

  useEffect(() => () => {
    requestId.current += 1
  }, [])

  function handleSearch(event) {
    event.preventDefault()
    const searchText = query.trim()
    if (!searchText) {
      setError('Enter a town, city, or address to search.')
      return
    }

    userInitiatedLookup.current = true
    setUseMyLocation(false)
    void loadLocation(() => geocode(searchText))
  }

  function handleLocationToggle(event) {
    const enabled = event.target.checked
    userInitiatedLookup.current = true
    setUseMyLocation(enabled)

    if (!enabled) {
      requestId.current += 1
      setIsLoading(false)
      setError('')
      return
    }

    void loadLocation(async () => {
      const coordinates = await getCurrentPosition()
      const displayName = await reverseGeocode(coordinates.lat, coordinates.lon)
      return { ...coordinates, displayName: displayName || 'Current location' }
    }, () => setUseMyLocation(false))
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <div>
          <p className="home-eyebrow">Flood monitoring</p>
          <h1>Local flood outlook</h1>
          <p className="home-intro">Check river conditions and rainfall for the week ahead.</p>
        </div>

        <div className="home-location-controls">
          <form className="home-search" onSubmit={handleSearch}>
            <label className="home-search-label" htmlFor="location-search">Location</label>
            <div className="home-search-row">
              <input
                id="location-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a town or city"
                autoComplete="off"
              />
              <button type="submit">
                {isLoading && !location ? 'Loading...' : 'Search'}
              </button>
            </div>
          </form>

          <label className="location-switch">
            <input
              type="checkbox"
              role="switch"
              checked={useMyLocation}
              onChange={handleLocationToggle}
              aria-label="Use my location"
            />
            <span className="location-switch-track" aria-hidden="true"><span /></span>
            <span>Use my location</span>
          </label>
        </div>
      </header>

      {error && <p className="home-error" role="alert">{error}</p>}

      <div className="home-dashboard">
        <section className="home-map-panel" aria-label="Location map">
          {location ? (
            <MapContainer center={[location.lat, location.lon]} zoom={11} scrollWheelZoom>
              <RecenterMap location={location} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={[location.lat, location.lon]}
                icon={LOCATION_MARKER}
                alt={`Map marker for ${location.displayName}`}
                title={`Flood outlook location: ${location.displayName}`}
              >
                <Popup>{location.displayName}</Popup>
              </Marker>
            </MapContainer>
          ) : (
            <div className="home-map-empty">
              <span className="map-empty-mark" aria-hidden="true">+</span>
              <p>{isLoading ? 'Finding your saved location...' : 'Choose a location to view the map.'}</p>
            </div>
          )}
          {location && <p className="map-location-label">{location.displayName}</p>}
        </section>

        <aside className="home-results" aria-label="Flood and weather outlook" aria-busy={isLoading}>
          {isLoading && (
            <div className="home-results-loading" role="status">
              <span className="home-loading-spinner" aria-hidden="true" />
              <span>{location ? 'Updating the 7-day outlook...' : 'Loading your location...'}</span>
            </div>
          )}

          {!isLoading && !floodData && !error && (
            <div className="home-results-empty">
              <h2>Your 7-day outlook</h2>
              <p>Search for a place or use your current location to see local conditions.</p>
            </div>
          )}

          {floodData && risk && location && (
            <Suspense fallback={<p className="flood-details-loading" role="status">Preparing forecast details...</p>}>
              <FloodDetails
                locationName={location.displayName}
                dailyData={floodData.daily}
                riskResult={risk}
              />
            </Suspense>
          )}
        </aside>
      </div>
    </main>
  )

}
