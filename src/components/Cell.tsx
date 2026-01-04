import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'

export function Cell(props: { radius: number; gradient: number; temperatureC: number }) {
  const { radius, gradient, temperatureC } = props
  const groupRef = useRef<THREE.Group>(null)

  const particleGeometry = useMemo(() => new THREE.BufferGeometry(), [])
  const particleMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.03,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    [],
  )

  const { positions, velocities } = useMemo(() => {
    const count = 700
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)

    const rand = () => (Math.random() * 2 - 1)
    for (let i = 0; i < count; i++) {
      // Start outside the cell in a loose shell.
      const r = radius * (1.35 + Math.random() * 1.2)
      const v = new THREE.Vector3(rand(), rand(), rand()).normalize().multiplyScalar(r)
      positions[i * 3 + 0] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z

      // Random walk velocity
      velocities[i * 3 + 0] = rand() * 0.06
      velocities[i * 3 + 1] = rand() * 0.06
      velocities[i * 3 + 2] = rand() * 0.06
    }
    return { positions, velocities }
  }, [radius])

  useMemo(() => {
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }, [particleGeometry, positions])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.18
    groupRef.current.rotation.x += delta * 0.05

    const posAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute

    // A simple visual heuristic: higher temperature and higher gradient increase inward drift
    const tempFactor = 0.6 + THREE.MathUtils.clamp((temperatureC - 10) / 50, 0, 1) * 1.2
    const drift = gradient * 0.35 * tempFactor
    const walk = 0.35 * tempFactor

    for (let i = 0; i < posAttr.count; i++) {
      const ix = i * 3
      const x = positions[ix + 0]
      const y = positions[ix + 1]
      const z = positions[ix + 2]

      // Random walk + inward drift
      velocities[ix + 0] += (Math.random() * 2 - 1) * 0.04 * delta * walk
      velocities[ix + 1] += (Math.random() * 2 - 1) * 0.04 * delta * walk
      velocities[ix + 2] += (Math.random() * 2 - 1) * 0.04 * delta * walk

      const v = new THREE.Vector3(velocities[ix + 0], velocities[ix + 1], velocities[ix + 2])
      const p = new THREE.Vector3(x, y, z)
      const inward = p.clone().normalize().multiplyScalar(-drift)
      v.add(inward.multiplyScalar(delta))

      // Update position
      p.add(v.clone().multiplyScalar(delta))

      // Keep particles in a bounding sphere shell for a clean visualization.
      const dist = p.length()
      const minR = radius * 0.65
      const maxR = radius * 2.6

      // If it goes too deep inside, gently push it outward (we're not simulating transport into cytosol here).
      if (dist < minR) p.multiplyScalar(minR / Math.max(1e-6, dist))
      if (dist > maxR) p.multiplyScalar(maxR / Math.max(1e-6, dist))

      positions[ix + 0] = p.x
      positions[ix + 1] = p.y
      positions[ix + 2] = p.z

      velocities[ix + 0] = v.x
      velocities[ix + 1] = v.y
      velocities[ix + 2] = v.z
    }

    posAttr.needsUpdate = true
  })

  const membraneColor = useMemo(() => {
    // Bright color that shifts with gradient (purely visual)
    return new THREE.Color().setHSL(0.55 + gradient * 0.25, 0.95, 0.62)
  }, [gradient])

  const glowColor = useMemo(() => {
    return new THREE.Color().setHSL(0.9 - gradient * 0.35, 0.95, 0.7)
  }, [gradient])

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color={membraneColor}
          transparent
          opacity={0.25}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[radius * 1.02, 64, 64]} />
        <meshStandardMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      <points geometry={particleGeometry} material={particleMaterial} />
    </group>
  )
}
