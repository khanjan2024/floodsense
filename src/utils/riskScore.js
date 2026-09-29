const BASE_WEIGHTS = {
  precipitation: 40,
  discharge: 40,
  probability: 20,
}

export const SAFETY_TIPS = {
  Low: [
    'Keep an eye on local weather and flood alerts.',
    'Know where to find higher ground in your area.',
  ],
  Moderate: [
    'Check local flood alerts regularly and review your evacuation route.',
    'Move valuables, medications, and important documents above floor level.',
    'Avoid parking or camping near rivers and other low-lying areas.',
  ],
  High: [
    'Follow local emergency instructions and move to higher ground early.',
    'Never walk, swim, or drive through floodwater.',
    'Keep an emergency kit, charged phone, and essential medications with you.',
  ],
}

function getNumbers(dailyData, field) {
  return dailyData
    .map((day) => day?.[field])
    .filter((value) => value !== null && value !== undefined && value !== '')
    .map(Number)
    .filter(Number.isFinite)
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function normalize(value, maximum) {
  return Math.min(Math.max(value / maximum, 0), 1)
}

export function calculateRisk(dailyData) {
  const days = Array.isArray(dailyData) ? dailyData : []
  const precipitationValues = getNumbers(days, 'precipitation')
  const probabilityValues = getNumbers(days, 'precipProbability')
  const dischargeValues = getNumbers(days, 'discharge')
  const dischargeMeanValues = getNumbers(days, 'dischargeMean').filter((value) => value > 0)

  const totalPrecipitation = precipitationValues.length
    ? precipitationValues.reduce((total, value) => total + Math.max(value, 0), 0)
    : null
  const maxProbability = probabilityValues.length
    ? Math.min(Math.max(Math.max(...probabilityValues), 0), 100)
    : null
  const peakDischarge = dischargeValues.length ? Math.max(...dischargeValues) : null
  const meanDischarge = dischargeMeanValues.length
    ? dischargeMeanValues.reduce((total, value) => total + value, 0) / dischargeMeanValues.length
    : null
  const dischargeRatio = peakDischarge !== null && meanDischarge !== null
    ? peakDischarge / meanDischarge
    : null

  const hasPrecipitation = totalPrecipitation !== null
  const hasDischarge = dischargeRatio !== null && Number.isFinite(dischargeRatio)
  const hasProbability = maxProbability !== null
  const remainingWeight = (hasPrecipitation ? BASE_WEIGHTS.precipitation : 0)
    + (hasProbability ? BASE_WEIGHTS.probability : 0)
  const redistributedRiverWeight = !hasDischarge && remainingWeight > 0
    ? BASE_WEIGHTS.discharge
    : 0

  const precipitationWeight = hasPrecipitation
    ? BASE_WEIGHTS.precipitation + redistributedRiverWeight * BASE_WEIGHTS.precipitation / remainingWeight
    : 0
  const probabilityWeight = hasProbability
    ? BASE_WEIGHTS.probability + redistributedRiverWeight * BASE_WEIGHTS.probability / remainingWeight
    : 0
  const dischargeWeight = hasDischarge ? BASE_WEIGHTS.discharge : 0

  const weightedScore = (hasPrecipitation
    ? normalize(totalPrecipitation, 100) * precipitationWeight
    : 0) + (hasDischarge
    ? normalize(dischargeRatio, 2) * dischargeWeight
    : 0) + (hasProbability
    ? normalize(maxProbability, 100) * probabilityWeight
    : 0)
  const score = Math.round(Math.min(Math.max(weightedScore, 0), 100))

  const isHighRainfall = totalPrecipitation !== null && totalPrecipitation > 100
  const isHighDischarge = dischargeRatio !== null && dischargeRatio > 2
  const level = isHighRainfall || isHighDischarge || score >= 67
    ? 'High'
    : score >= 34
      ? 'Moderate'
      : 'Low'

  const reasons = []
  if (totalPrecipitation === null) {
    reasons.push('Precipitation data is unavailable.')
  } else if (isHighRainfall) {
    reasons.push(`Heavy rainfall expected: ${formatNumber(totalPrecipitation)}mm over 7 days.`)
  } else {
    reasons.push(`Rainfall expected: ${formatNumber(totalPrecipitation)}mm over 7 days.`)
  }

  if (dischargeRatio === null) {
    reasons.push('River discharge data is unavailable; its score weight was redistributed.')
  } else if (isHighDischarge) {
    reasons.push(`Peak river discharge is ${formatNumber(dischargeRatio)}x its mean.`)
  } else {
    reasons.push(`Peak river discharge is ${formatNumber(dischargeRatio)}x its mean.`)
  }

  if (maxProbability === null) {
    reasons.push('Precipitation probability data is unavailable.')
  } else {
    reasons.push(`Maximum precipitation probability: ${formatNumber(maxProbability)}% over 7 days.`)
  }

  if (!hasPrecipitation && !hasDischarge && !hasProbability) {
    reasons.push('Risk is low-confidence because forecast data is unavailable.')
  }

  return { level, score, reasons }
}