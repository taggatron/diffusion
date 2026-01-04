import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMemo, useRef } from 'react'

export function Cell(props: { radius: number; gradient: number; temperatureC: number }) {
  const { radius, gradient, temperatureC } = props
  const groupRef = useRef<THREE.Group>(null)
  const burstMeshRef = useRef<THREE.InstancedMesh>(null)

  const MAX_PARTICLES = 1400
  const MIN_ACTIVE_PARTICLES = 450

  const particleGeometry = useMemo(() => new THREE.BufferGeometry(), [])
  const particleMaterial = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.045,
        sizeAttenuation: true,
        transparent: true,
        opacity: 1.0,
        vertexColors: true,
        depthWrite: false,
      }),
    [],
  )

  const burstMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexColors: true,
      }),
    [],
  )

  type Burst = {
    position: THREE.Vector3
    normal: THREE.Vector3
    age: number
    kind: 'enter' | 'exit'
  }

  const burstsRef = useRef<Burst[]>([])
  const prevOutsideRef = useRef<Uint8Array | null>(null)
  const tmpV3 = useMemo(() => new THREE.Vector3(), [])
  const tmpV3b = useMemo(() => new THREE.Vector3(), [])
  const tmpQuat = useMemo(() => new THREE.Quaternion(), [])
  const tmpMat = useMemo(() => new THREE.Matrix4(), [])
  const tmpScale = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(0, 0, 1), [])
  const enterColor = useMemo(() => new THREE.Color('#34d399'), [])
  const exitColor = useMemo(() => new THREE.Color('#a7f3d0'), [])
  const insideParticleColor = useMemo(() => new THREE.Color('#ef4444'), [])
  const outsideParticleColor = useMemo(() => new THREE.Color('#22c55e'), [])

  const { positions, velocities, colors } = useMemo(() => {
    const count = MAX_PARTICLES
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    const rand = () => (Math.random() * 2 - 1)
    for (let i = 0; i < count; i++) {
      // Start half inside, half outside for an immediate in/out dynamic.
      const inside = i % 2 === 0
      const r = inside ? radius * (Math.random() * 0.95) : radius * (1.1 + Math.random() * 1.6)
      const v = new THREE.Vector3(rand(), rand(), rand()).normalize().multiplyScalar(r)
      positions[i * 3 + 0] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z

      // Random walk velocity (small initial jitter)
      velocities[i * 3 + 0] = rand() * 0.02
      velocities[i * 3 + 1] = rand() * 0.02
      velocities[i * 3 + 2] = rand() * 0.02

      // Initial color by location (inside red, outside green)
      const c = inside ? insideParticleColor : outsideParticleColor
      colors[i * 3 + 0] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, velocities, colors }
  }, [radius, insideParticleColor, outsideParticleColor])

  useMemo(() => {
    prevOutsideRef.current = new Uint8Array(positions.length / 3)
    for (let i = 0; i < positions.length / 3; i++) {
      const ix = i * 3
      const dist = Math.hypot(positions[ix + 0], positions[ix + 1], positions[ix + 2])
      prevOutsideRef.current[i] = dist >= radius ? 1 : 0
    }
  }, [positions, radius])

  useMemo(() => {
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    particleGeometry.setDrawRange(0, MAX_PARTICLES)
  }, [particleGeometry, positions])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    // Keep the cell mostly stable to avoid perceived motion patterns.
    groupRef.current.rotation.y += delta * 0.02

    const posAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute
    const colorAttr = particleGeometry.getAttribute('color') as THREE.BufferAttribute

    // Temperature increases random motion speed (diffusion coefficient).
    const tempNorm = THREE.MathUtils.clamp((temperatureC - 0) / 60, 0, 1)
    const speedFactor = 0.6 + tempNorm * 1.8

    // Membrane permeability: chance to cross when a step hits the membrane.
    // Gradient biases net flux inward but still allows outward motion.
    const kBase = 2.2 * speedFactor
    const kEnter = kBase * (0.25 + 1.75 * gradient)
    const kExit = kBase * (0.25 + 1.75 * (1 - gradient))
    const pEnter = 1 - Math.exp(-kEnter * delta)
    const pExit = 1 - Math.exp(-kExit * delta)

    // Random walk acceleration + displacement scale (scaled by temperature).
    // Keep it visually obvious: higher temperature => noticeably faster motion.
    const accel = 1.4 * speedFactor
    const moveScale = 1.25 * speedFactor
    const damping = Math.pow(0.78, delta)

    const prevOutside = prevOutsideRef.current
    const bursts = burstsRef.current
    const membraneR = radius

    // More gradient => more particles (simple visualization of higher ΔC)
    const activeCount = Math.floor(
      THREE.MathUtils.lerp(MIN_ACTIVE_PARTICLES, MAX_PARTICLES, THREE.MathUtils.clamp(gradient, 0, 1)),
    )
    particleGeometry.setDrawRange(0, activeCount)

    for (let i = 0; i < activeCount; i++) {
      const ix = i * 3
      const x = positions[ix + 0]
      const y = positions[ix + 1]
      const z = positions[ix + 2]

      tmpV3b.set(x, y, z)
      const dist0 = tmpV3b.length()

      // Pure random walk (no directed drift).
      tmpV3.set(velocities[ix + 0], velocities[ix + 1], velocities[ix + 2])
      tmpV3.x += (Math.random() * 2 - 1) * accel * delta
      tmpV3.y += (Math.random() * 2 - 1) * accel * delta
      tmpV3.z += (Math.random() * 2 - 1) * accel * delta
      tmpV3.multiplyScalar(damping)

      // Integrate position (scaled so temperature slider visibly changes speed)
      tmpV3b.add(tmpV3.clone().multiplyScalar(delta * moveScale))
      const dist1 = tmpV3b.length()

      // Probabilistic permeation at the membrane: if a step crosses, either allow or reflect.
      if (dist0 !== dist1) {
        const crossedOutward = dist0 < membraneR && dist1 >= membraneR
        const crossedInward = dist0 >= membraneR && dist1 < membraneR
        if (crossedOutward || crossedInward) {
          const allow = crossedInward ? Math.random() < pEnter : Math.random() < pExit
          if (!allow) {
            const normal = tmpV3b.clone().normalize()
            // Nudge slightly to the side we came from to prevent rapid toggling.
            tmpV3b.copy(normal.multiplyScalar(membraneR + (crossedInward ? 0.02 * membraneR : -0.02 * membraneR)))
            const vRad = tmpV3.dot(normal)
            tmpV3.addScaledVector(normal, -2 * vRad)
          }
        }
      }

      const dist = tmpV3b.length()

      // Detect membrane crossing (enter/exit) and spawn a short glow burst.
      if (prevOutside) {
        const isOutside = dist >= membraneR ? 1 : 0
        const wasOutside = prevOutside[i]
        if (wasOutside !== isOutside) {
          // Approximate intersection point on the membrane.
          const normal = tmpV3b.clone().normalize()
          const posOnMembrane = normal.clone().multiplyScalar(membraneR)
          bursts.push({
            position: posOnMembrane,
            normal,
            age: 0,
            kind: isOutside ? 'exit' : 'enter',
          })
          prevOutside[i] = isOutside
        }
      }

      // Color by location (inside red, outside green)
      const isInside = dist < membraneR
      const c = isInside ? insideParticleColor : outsideParticleColor
      colors[ix + 0] = c.r
      colors[ix + 1] = c.g
      colors[ix + 2] = c.b

      // Keep particles within a larger bounds sphere (allow inside the cell, too).
      const minR = radius * 0.15
      const maxR = radius * 2.6
      if (dist < minR) tmpV3b.multiplyScalar(minR / Math.max(1e-6, dist))
      if (dist > maxR) tmpV3b.multiplyScalar(maxR / Math.max(1e-6, dist))

      positions[ix + 0] = tmpV3b.x
      positions[ix + 1] = tmpV3b.y
      positions[ix + 2] = tmpV3b.z

      velocities[ix + 0] = tmpV3.x
      velocities[ix + 1] = tmpV3.y
      velocities[ix + 2] = tmpV3.z
    }

    posAttr.needsUpdate = true
    colorAttr.needsUpdate = true

    // Age + render bursts (instanced quads oriented to membrane normal).
    const burstMesh = burstMeshRef.current
    if (burstMesh) {
      const maxAge = 0.35
      for (let i = bursts.length - 1; i >= 0; i--) {
        bursts[i].age += delta
        if (bursts[i].age > maxAge) bursts.splice(i, 1)
      }

      const count = Math.min(bursts.length, burstMesh.count)
      burstMesh.visible = count > 0
      for (let i = 0; i < count; i++) {
        const b = bursts[bursts.length - 1 - i]
        const t = THREE.MathUtils.clamp(b.age / maxAge, 0, 1)
        const s = (0.18 + t * 0.55) * radius
        const fade = 1 - t

        tmpQuat.setFromUnitVectors(up, b.normal)
        tmpScale.set(s, s, s)
        tmpMat.compose(b.position, tmpQuat, tmpScale)
        burstMesh.setMatrixAt(i, tmpMat)

        const color = (b.kind === 'enter' ? enterColor : exitColor).clone().multiplyScalar(0.85 + 0.75 * fade)
        burstMesh.setColorAt(i, color)
      }

      burstMesh.instanceMatrix.needsUpdate = true
      if (burstMesh.instanceColor) burstMesh.instanceColor.needsUpdate = true

      // Material opacity is shared; keep it high and let size/color do the fade.
      burstMaterial.opacity = 0.9
    }
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
      <mesh renderOrder={1}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          color={membraneColor}
          transparent
          opacity={0.25}
          depthWrite={false}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>

      <mesh renderOrder={1}>
        <sphereGeometry args={[radius * 1.02, 64, 64]} />
        <meshStandardMaterial
          color={glowColor}
          transparent
          opacity={0.08}
          depthWrite={false}
          roughness={0.0}
          metalness={0.0}
        />
      </mesh>

      <instancedMesh ref={burstMeshRef} args={[undefined as any, undefined as any, 80]} renderOrder={2}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <primitive object={burstMaterial} attach="material" />
      </instancedMesh>

      <points geometry={particleGeometry} material={particleMaterial} renderOrder={3} />
    </group>
  )
}
