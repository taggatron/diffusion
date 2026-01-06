export type DiffusionInputs = {
  radiusUm: number
  deltaC: number
  temperatureC: number
}

// Simple, intentionally unit-light model based on Fick’s law intuition.
// Rate ∝ (surface area) * D(T) * (ΔC) / thickness
// where for a sphere SA:V = 3/r.

export function computeDiffusionRate(inputs: DiffusionInputs) {
  const radiusUm = clamp(inputs.radiusUm, 1, 200)
  const deltaC = clamp(inputs.deltaC, 0, 1)
  const temperatureC = clamp(inputs.temperatureC, -10, 80)

  const surfaceArea = 4 * Math.PI * radiusUm * radiusUm
  const volume = (4 / 3) * Math.PI * Math.pow(radiusUm, 3)
  const saToV = surfaceArea / volume

  // Membrane thickness: keep constant for the demo.
  const thicknessUm = 0.01

  // Temperature factor: mild exponential increase with temperature.
  // Using a simple Q10-like rule: rate doubles per 10°C (rough heuristic).
  const temperatureFactor = Math.pow(2, (temperatureC - 25) / 10)

  // For a concentration change *rate*, SA:V matters: bigger cells equilibrate slower.
  // Use SA:V rather than absolute surface area so increasing radius reduces the rate.
  const rawRate = (saToV / thicknessUm) * deltaC * temperatureFactor

  // Normalize to a baseline at radius=12µm, deltaC=0.6, temp=25°C.
  const baseline = {
    radiusUm: 12,
    deltaC: 0.6,
    temperatureC: 25,
  }
  const baselineSurfaceArea = 4 * Math.PI * baseline.radiusUm * baseline.radiusUm
  const baselineVolume = (4 / 3) * Math.PI * Math.pow(baseline.radiusUm, 3)
  const baselineSaToV = baselineSurfaceArea / baselineVolume
  const baselineTempFactor = 1
  const baselineRate = (baselineSaToV / thicknessUm) * baseline.deltaC * baselineTempFactor

  const relativeRate = rawRate / baselineRate

  return {
    surfaceArea,
    volume,
    saToV,
    temperatureFactor,
    rawRate,
    relativeRate,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
