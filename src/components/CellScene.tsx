import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useMemo } from 'react'
import { Cell } from './Cell'

export function CellScene(props: {
  radiusUm: number
  gradient: number
  temperatureC: number
  onCounts: (counts: { red: number; green: number }) => void
}) {
  const { radiusUm, gradient, temperatureC, onCounts } = props

  // Keep the model visually stable (not physically accurate): map µm radius to scene units.
  const radius = useMemo(() => THREE.MathUtils.clamp(radiusUm / 12, 0.35, 2.2), [radiusUm])

  return (
    <Canvas camera={{ position: [0, 0.1, 4.2], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 3]} intensity={1.1} />
      <directionalLight position={[-4, -2, 2]} intensity={0.35} />

      <Cell radius={radius} gradient={gradient} temperatureC={temperatureC} onCounts={onCounts} />

      <OrbitControls enablePan={false} minDistance={2.4} maxDistance={7} />
    </Canvas>
  )
}
