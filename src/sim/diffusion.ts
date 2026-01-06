export type DiffusionInputs = {
  radiusUm: number
  deltaC: number
  temperatureC: number
}

// Simple, intentionally unit-light model based on Fick’s law intuition.
// Flux ∝ (surface area) * D(T) * (ΔC) / thickness
// The *rate of change of concentration* depends on flux divided by compartment volume.
// For a sphere, bigger radius means slower equilibration (SA grows ~r^2, volume ~r^3).

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

  // Model two well-mixed compartments: inside the cell and the surrounding medium.
  // Membrane flux is proportional to area and the concentration difference.
  const permeability = temperatureFactor / thicknessUm
  const flux = surfaceArea * permeability * deltaC

  // Choose an outside "reservoir" volume as a fixed multiple of cell volume.
  // This keeps the demo stable and makes ΔC relaxation scale ~1/r.
  const outsideVolumeScale = 10
  const outsideVolume = volume * outsideVolumeScale

  // Concentrations change due to flux; the concentration *difference* relaxes as:
  // d(ΔC)/dt = -flux * (1/Vin + 1/Vout)
  const dDeltaCDt = -flux * (1 / volume + 1 / outsideVolume)
  const rawRate = Math.abs(dDeltaCDt)

  // Normalize to a baseline at radius=12µm, deltaC=0.6, temp=25°C.
  const baseline = {
    radiusUm: 12,
    deltaC: 0.6,
    temperatureC: 25,
  }
  const baselineSurfaceArea = 4 * Math.PI * baseline.radiusUm * baseline.radiusUm
  const baselineVolume = (4 / 3) * Math.PI * Math.pow(baseline.radiusUm, 3)
  const baselineTempFactor = 1
  const baselinePermeability = baselineTempFactor / thicknessUm
  const baselineFlux = baselineSurfaceArea * baselinePermeability * baseline.deltaC
  const baselineOutsideVolume = baselineVolume * outsideVolumeScale
  const baselineDDeltaCDt = -baselineFlux * (1 / baselineVolume + 1 / baselineOutsideVolume)
  const baselineRate = Math.abs(baselineDDeltaCDt)

  const relativeRate = rawRate / baselineRate

  return {
    surfaceArea,
    volume,
    saToV,
    temperatureFactor,
    flux,
    dDeltaCDt,
    rawRate,
    relativeRate,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
