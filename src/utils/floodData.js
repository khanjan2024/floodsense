const FLOOD_API_URL = 'https://flood-api.open-meteo.com/v1/flood'
const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast'

async function fetchJson(url) {
  let response
  try {
    response = await fetch(url)
  } catch (error) {
    throw new Error('Could not reach Open-Meteo. Check your connection and try again.', { cause: error })
  }

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed (HTTP ${response.status}).`)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new Error('Open-Meteo returned an unreadable response.', { cause: error })
  }
}

function createDailyUrl(baseUrl, latitude, longitude, dailyFields) {
  const url = new URL(baseUrl)
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: dailyFields,
    forecast_days: '7',
  }).toString()
  return url
}

function getDailyValue(daily, field, index) {
  const values = daily?.[field]
  return Array.isArray(values) ? values[index] ?? null : null
}

export async function fetchFloodData(lat, lon) {
  const latitude = Number(lat)
  const longitude = Number(lon)
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    throw new TypeError('Latitude and longitude must be valid coordinates.')
  }

  const floodUrl = createDailyUrl(
    FLOOD_API_URL,
    latitude,
    longitude,
    'river_discharge,river_discharge_mean,river_discharge_max',
  )
  const forecastUrl = createDailyUrl(
    FORECAST_API_URL,
    latitude,
    longitude,
    'precipitation_sum,precipitation_probability_max',
  )

  const [floodResult, forecastResult] = await Promise.allSettled([
    fetchJson(floodUrl),
    fetchJson(forecastUrl),
  ])

  if (floodResult.status === 'rejected' && forecastResult.status === 'rejected') {
    throw new Error('Could not load flood and forecast data. Please try again later.', {
      cause: forecastResult.reason,
    })
  }

  const floodDaily = floodResult.status === 'fulfilled' ? floodResult.value?.daily : null
  const forecastDaily = forecastResult.status === 'fulfilled' ? forecastResult.value?.daily : null
  const floodDates = Array.isArray(floodDaily?.time) ? floodDaily.time : []
  const forecastDates = Array.isArray(forecastDaily?.time) ? forecastDaily.time : []
  const dates = [...new Set([...forecastDates, ...floodDates])]
  const floodIndexByDate = new Map(floodDates.map((date, index) => [date, index]))
  const forecastIndexByDate = new Map(forecastDates.map((date, index) => [date, index]))

  return {
    daily: dates.map((date) => {
      const floodIndex = floodIndexByDate.get(date)
      const forecastIndex = forecastIndexByDate.get(date)

      return {
        date,
        discharge: floodIndex === undefined ? null : getDailyValue(floodDaily, 'river_discharge', floodIndex),
        dischargeMean: floodIndex === undefined ? null : getDailyValue(floodDaily, 'river_discharge_mean', floodIndex),
        precipitation: forecastIndex === undefined ? null : getDailyValue(forecastDaily, 'precipitation_sum', forecastIndex),
        precipProbability: forecastIndex === undefined
          ? null
          : getDailyValue(forecastDaily, 'precipitation_probability_max', forecastIndex),
      }
    }),
  }
}