const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'

/*
 * Nominatim's public service is for modest, user-triggered lookups, not client-side
 * autocomplete. Browsers set User-Agent themselves and forbid overriding it; they
 * send the app's Referer automatically. Keep traffic attributable, cache where
 * practical, display OpenStreetMap attribution, and use a switchable proxy/provider
 * if production traffic grows. See https://operations.osmfoundation.org/policies/nominatim/.
 */

async function requestNominatim(path, parameters) {
  const url = new URL(path, NOMINATIM_BASE_URL)
  url.search = new URLSearchParams(parameters).toString()

  let response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    throw new Error('Could not reach OpenStreetMap. Check your connection and try again.', { cause: error })
  }

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Location lookup is temporarily rate-limited. Please wait and try again.')
    }
    throw new Error(`Location lookup failed (HTTP ${response.status}). Please try again later.`)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new Error('Location lookup returned an unreadable response. Please try again later.', { cause: error })
  }
}

export async function geocode(query) {
  const searchText = typeof query === 'string' ? query.trim() : ''
  if (!searchText) return null

  const results = await requestNominatim('/search', {
    format: 'jsonv2',
    limit: '1',
    q: searchText,
  })

  const firstResult = Array.isArray(results) ? results[0] : null
  if (!firstResult || typeof firstResult.display_name !== 'string') return null

  const lat = Number(firstResult.lat)
  const lon = Number(firstResult.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

  return { lat, lon, displayName: firstResult.display_name }
}

export async function reverseGeocode(lat, lon) {
  const latitude = Number(lat)
  const longitude = Number(lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new TypeError('Latitude and longitude must be valid numbers.')
  }

  const result = await requestNominatim('/reverse', {
    format: 'jsonv2',
    lat: String(latitude),
    lon: String(longitude),
  })

  return typeof result?.display_name === 'string' ? result.display_name : null
}

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not available in this browser.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location permission was denied. Allow location access in your browser settings and try again.'))
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new Error('Your current location could not be determined.'))
        } else if (error.code === error.TIMEOUT) {
          reject(new Error('Finding your location took too long. Please try again.'))
        } else {
          reject(new Error('Could not get your current location. Please try again.'))
        }
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 10000 },
    )
  })
}