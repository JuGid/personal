import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Shader simple pour étoiles statiques
const starVertexShader = `
  attribute float size;
  varying vec3 vColor;

  void main() {
    vColor = color;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const starFragmentShader = `
  varying vec3 vColor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    // Glow circulaire doux
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    glow = pow(glow, 1.8);

    gl_FragColor = vec4(vColor * glow, glow);
  }
`

// Étoiles de fond
function BackgroundStars() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const count = 8000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const starColors = [
      [1.0, 0.95, 0.9],
      [0.9, 0.9, 1.0],
      [1.0, 0.8, 0.6],
      [0.8, 0.85, 1.0],
      [1.0, 1.0, 0.8],
      [0.7, 0.8, 1.0],
    ]

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 60 + Math.random() * 140
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const colorIndex = Math.floor(Math.random() * starColors.length)
      const brightness = 0.6 + Math.random() * 0.4
      colors[i3] = starColors[colorIndex][0] * brightness
      colors[i3 + 1] = starColors[colorIndex][1] * brightness
      colors[i3 + 2] = starColors[colorIndex][2] * brightness

      sizes[i] = Math.random() < 0.1
        ? 1.2 + Math.random() * 1.5
        : 0.3 + Math.random() * 0.7
    }

    return [positions, colors, sizes]
  }, [])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

// Étoiles brillantes
function BrightStars() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const count = 150
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const brightColors = [
      [1.0, 1.0, 1.0],
      [0.95, 0.97, 1.0],
      [1.0, 0.97, 0.9],
    ]

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 40 + Math.random() * 100
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const colorIndex = Math.floor(Math.random() * brightColors.length)
      colors[i3] = brightColors[colorIndex][0]
      colors[i3 + 1] = brightColors[colorIndex][1]
      colors[i3 + 2] = brightColors[colorIndex][2]

      sizes[i] = 2.5 + Math.random() * 3
    }

    return [positions, colors, sizes]
  }, [])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

// Nébuleuse
const nebulaFragmentShader = `
  varying vec3 vColor;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);

    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    alpha = pow(alpha, 2.0) * 0.12;

    gl_FragColor = vec4(vColor, alpha);
  }
`

function Nebula() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const count = 3000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    const nebulaColors = [
      [0.4, 0.15, 0.6],
      [0.15, 0.25, 0.5],
      [0.25, 0.12, 0.4],
      [0.12, 0.18, 0.35],
      [0.5, 0.2, 0.4],
    ]

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 70 + Math.random() * 130
      const theta = Math.random() * Math.PI * 2
      const phi = Math.PI / 2 + (Math.random() - 0.5) * 0.6

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = (Math.random() - 0.5) * 25
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      const colorIndex = Math.floor(Math.random() * nebulaColors.length)
      const brightness = 0.5 + Math.random() * 0.5
      colors[i3] = nebulaColors[colorIndex][0] * brightness
      colors[i3 + 1] = nebulaColors[colorIndex][1] * brightness
      colors[i3 + 2] = nebulaColors[colorIndex][2] * brightness

      sizes[i] = 30 + Math.random() * 50
    }

    return [positions, colors, sizes]
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.003
    }
  })

  const nebulaVertexShader = `
    attribute float size;
    varying vec3 vColor;

    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

// Milliers de petites étoiles denses
function TinyStars() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const count = 20000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 35 + Math.random() * 165
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const brightness = 0.5 + Math.random() * 0.5
      colors[i3] = brightness
      colors[i3 + 1] = brightness
      colors[i3 + 2] = brightness + Math.random() * 0.08

      sizes[i] = 0.08 + Math.random() * 0.25
    }

    return [positions, colors, sizes]
  }, [])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

// Voie lactée - bande dense d'étoiles
function MilkyWay() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const count = 30000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      const radius = 45 + Math.random() * 155
      const theta = Math.random() * Math.PI * 2

      // Distribution gaussienne pour la hauteur (bande concentrée)
      const u1 = Math.random()
      const u2 = Math.random()
      const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      const height = gaussian * radius * 0.08

      positions[i3] = radius * Math.cos(theta)
      positions[i3 + 1] = height
      positions[i3 + 2] = radius * Math.sin(theta)

      // Couleurs variées
      const colorType = Math.random()
      let r, g, b
      if (colorType < 0.65) {
        const brightness = 0.6 + Math.random() * 0.4
        r = brightness
        g = brightness
        b = brightness
      } else if (colorType < 0.82) {
        r = 0.7 + Math.random() * 0.3
        g = 0.75 + Math.random() * 0.25
        b = 0.9 + Math.random() * 0.1
      } else if (colorType < 0.95) {
        r = 0.95 + Math.random() * 0.05
        g = 0.85 + Math.random() * 0.1
        b = 0.6 + Math.random() * 0.2
      } else {
        r = 0.95 + Math.random() * 0.05
        g = 0.6 + Math.random() * 0.15
        b = 0.5 + Math.random() * 0.15
      }

      colors[i3] = r
      colors[i3 + 1] = g
      colors[i3 + 2] = b

      sizes[i] = 0.05 + Math.random() * 0.18
    }

    return [positions, colors, sizes]
  }, [])

  return (
    <points ref={ref} rotation={[0.25, 0, 0.15]}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

// Poussière d'étoiles dense au centre
function StarDust() {
  const ref = useRef<THREE.Points>(null)

  const [positions, colors, sizes] = useMemo(() => {
    const count = 25000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3

      // Distribution plus dense au centre
      const r = Math.random()
      const radius = 30 + Math.pow(r, 0.7) * 170
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i3 + 2] = radius * Math.cos(phi)

      const brightness = 0.4 + Math.random() * 0.4
      const tint = Math.random()
      if (tint < 0.7) {
        colors[i3] = brightness
        colors[i3 + 1] = brightness
        colors[i3 + 2] = brightness
      } else {
        colors[i3] = brightness * (0.9 + Math.random() * 0.1)
        colors[i3 + 1] = brightness * (0.9 + Math.random() * 0.1)
        colors[i3 + 2] = brightness * (1.0 + Math.random() * 0.1)
      }

      sizes[i] = 0.03 + Math.random() * 0.12
    }

    return [positions, colors, sizes]
  }, [])

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={starVertexShader}
        fragmentShader={starFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        vertexColors
      />
    </points>
  )
}

export function Stars() {
  return (
    <>
      <StarDust />
      <TinyStars />
      <MilkyWay />
      <Nebula />
      <BackgroundStars />
      <BrightStars />
    </>
  )
}
