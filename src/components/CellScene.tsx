import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Cell } from './Cell'

function FluxArrows(props: { radius: number; inRate: number; outRate: number }) {
  const { radius, inRate, outRate } = props
  const inArrowRef = useRef<THREE.ArrowHelper | null>(null)
  const outArrowRef = useRef<THREE.ArrowHelper | null>(null)

  useEffect(() => {
    if (!inArrowRef.current) {
      inArrowRef.current = new THREE.ArrowHelper(
        new THREE.Vector3(-1, 0, 0),
        new THREE.Vector3(radius, 0, 0),
        0.5,
        '#22c55e',
      )
    }
    if (!outArrowRef.current) {
      outArrowRef.current = new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(radius, 0, 0),
        0.5,
        '#ef4444',
      )
    }
    return () => {
      inArrowRef.current = null
      outArrowRef.current = null
    }
  }, [radius])

  useEffect(() => {
    const inArrow = inArrowRef.current
    const outArrow = outArrowRef.current
    if (!inArrow || !outArrow) return

    // Rates are in events/sec; scale to a visually stable arrow length.
    const inLen = THREE.MathUtils.clamp(0.2 + inRate * 0.06, 0.2, radius * 1.35)
    const outLen = THREE.MathUtils.clamp(0.2 + outRate * 0.06, 0.2, radius * 1.35)
    inArrow.setLength(inLen, Math.min(0.25, inLen * 0.25), Math.min(0.18, inLen * 0.18))
    outArrow.setLength(outLen, Math.min(0.25, outLen * 0.25), Math.min(0.18, outLen * 0.18))

    // Tail ends touch on the membrane (same origin), pointing opposite directions.
    // Place on +X membrane point so inward arrow points toward the center.
    const origin = new THREE.Vector3(radius, 0, 0)
    inArrow.position.copy(origin)
    outArrow.position.copy(origin)
    inArrow.setDirection(new THREE.Vector3(-1, 0, 0))
    outArrow.setDirection(new THREE.Vector3(1, 0, 0))
  }, [inRate, outRate, radius])

  return (
    <>
      {inArrowRef.current ? <primitive object={inArrowRef.current} /> : null}
      {outArrowRef.current ? <primitive object={outArrowRef.current} /> : null}
    </>
  )
}

export function CellScene(props: {
  radiusUm: number
  gradient: number
  temperatureC: number
  onCounts: (counts: { red: number; green: number }) => void
}) {
  const { radiusUm, gradient, temperatureC, onCounts } = props

  // Keep the model visually stable (not physically accurate): map µm radius to scene units.
  const radius = useMemo(() => THREE.MathUtils.clamp(radiusUm / 12, 0.35, 2.2), [radiusUm])
  const [flux, setFlux] = useState({ inRate: 0, outRate: 0 })

  return (
    <Canvas camera={{ position: [0, 0.1, 4.2], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.1} />
      <directionalLight position={[-4, -2, 2]} intensity={0.35} />

      <Cell
        radius={radius}
        gradient={gradient}
        temperatureC={temperatureC}
        onCounts={onCounts}
        onFlux={setFlux}
      />

      <FluxArrows radius={radius} inRate={flux.inRate} outRate={flux.outRate} />

      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={7} />
    </Canvas>
  )
}
