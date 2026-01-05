import { useMemo, useState } from 'react'
import { CellScene } from './components/CellScene'
import { computeDiffusionRate, type DiffusionInputs } from './sim/diffusion'

function App() {
  const [radiusUm, setRadiusUm] = useState(12)
  const [deltaC, setDeltaC] = useState(0.6)
  const [temperatureC, setTemperatureC] = useState(25)
  const [particleCounts, setParticleCounts] = useState({ red: 0, green: 0 })

  const inputs: DiffusionInputs = useMemo(
    () => ({ radiusUm, deltaC, temperatureC }),
    [radiusUm, deltaC, temperatureC],
  )

  const outputs = useMemo(() => computeDiffusionRate(inputs), [inputs])

  return (
    <div className="min-h-full bg-gradient-to-br from-white via-sky-50 to-fuchsia-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diffusion Factors Simulator</h1>
          <p className="mt-1 text-sm text-slate-600">
            Adjust SA:V, concentration gradient, and temperature.
          </p>
        </div>
        <div className="rounded-xl bg-white/70 px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">Relative diffusion rate</div>
          <div className="mt-0.5 text-2xl font-semibold tabular-nums">{outputs.relativeRate.toFixed(2)}×</div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 px-5 pb-8 md:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-2xl bg-white/70 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <div className="text-sm font-medium">3D cell model</div>
              <div className="text-xs text-slate-500">Sphere radius changes with SA:V (via radius)</div>
            </div>
            <div className="text-right text-xs text-slate-500">
              <div className="tabular-nums">SA:V ≈ {outputs.saToV.toFixed(3)} 1/µm</div>
              <div className="tabular-nums">Temp factor ≈ {outputs.temperatureFactor.toFixed(2)}×</div>
            </div>
          </div>
          <div className="relative h-[420px] md:h-[520px]">
            <CellScene
              radiusUm={radiusUm}
              gradient={deltaC}
              temperatureC={temperatureC}
              onCounts={setParticleCounts}
            />

            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-white/70 px-3 py-2 text-xs shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="text-red-500">Red</div>
                <div className="font-medium tabular-nums text-red-500">{particleCounts.red}</div>
              </div>
              <div className="mt-1 flex items-center justify-between gap-4">
                <div className="text-green-500">Green</div>
                <div className="font-medium tabular-nums text-green-500">{particleCounts.green}</div>
              </div>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-medium">Parameters</div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Cell radius (µm)</label>
                <div className="text-sm font-medium tabular-nums">{radiusUm.toFixed(0)}</div>
              </div>
              <input
                className="mt-2 w-full accent-sky-500"
                type="range"
                min={4}
                max={30}
                step={1}
                value={radiusUm}
                onChange={(e) => setRadiusUm(Number(e.target.value))}
              />
              <div className="mt-1 text-xs text-slate-500">Smaller radius → higher SA:V → faster diffusion</div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Concentration gradient (ΔC)</label>
                <div className="text-sm font-medium tabular-nums">{deltaC.toFixed(2)}</div>
              </div>
              <input
                className="mt-2 w-full accent-fuchsia-500"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={deltaC}
                onChange={(e) => setDeltaC(Number(e.target.value))}
              />
              <div className="mt-1 text-xs text-slate-500">Higher ΔC → stronger driving force</div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-700">Temperature (°C)</label>
                <div className="text-sm font-medium tabular-nums">{temperatureC.toFixed(0)}</div>
              </div>
              <input
                className="mt-2 w-full accent-amber-500"
                type="range"
                min={0}
                max={60}
                step={1}
                value={temperatureC}
                onChange={(e) => setTemperatureC(Number(e.target.value))}
              />
              <div className="mt-1 text-xs text-slate-500">Higher temperature → higher diffusion coefficient</div>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-white/60 p-4 ring-1 ring-slate-200">
            <div className="text-xs font-medium text-slate-600">Model (simple)</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-600">Surface area</div>
              <div className="text-right font-medium tabular-nums">{outputs.surfaceArea.toFixed(0)} µm²</div>
              <div className="text-slate-600">Volume</div>
              <div className="text-right font-medium tabular-nums">{outputs.volume.toFixed(0)} µm³</div>
              <div className="text-slate-600">Rate (relative)</div>
              <div className="text-right font-medium tabular-nums">{outputs.relativeRate.toFixed(2)}×</div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
