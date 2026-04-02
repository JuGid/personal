import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import type { Campus } from '../types'

// Types de planètes
type PlanetType = 'rocky' | 'gasGiant' | 'ice' | 'lava'

// Shader de base pour les planètes
const planetVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Simplex noise commun
const noiseGLSL = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }
`

// Shader pour planète rocheuse
const rockyFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = fbm(pos * 3.0);
    float n2 = fbm(pos * 6.0 + vec3(100.0));
    float n3 = snoise(pos * 12.0 + vec3(200.0));

    // Terrain avec montagnes et vallées
    vec3 mountainColor = baseColor * 1.2;
    vec3 valleyColor = secondaryColor * 0.6;
    vec3 craterColor = baseColor * 0.3;

    float terrain = smoothstep(-0.3, 0.3, n1);
    vec3 surfaceColor = mix(valleyColor, mountainColor, terrain);

    // Cratères
    float craters = smoothstep(0.35, 0.4, n3);
    surfaceColor = mix(surfaceColor, craterColor, craters * 0.6);

    // Détails de surface
    float details = n2 * 0.15;
    surfaceColor += vec3(details);

    // Éclairage depuis le soleil
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.15;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.85);

    // Rim lighting
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += baseColor * pow(rim, 4.0) * 0.2;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour géante gazeuse (style Jupiter/Saturn)
const gasGiantFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    // Bandes horizontales caractéristiques
    float bands = sin(vPosition.y * 8.0 + snoise(pos * 2.0) * 2.0) * 0.5 + 0.5;
    float bands2 = sin(vPosition.y * 15.0 + snoise(pos * 3.0 + vec3(50.0)) * 1.5) * 0.5 + 0.5;

    // Tempêtes et tourbillons
    float storm = snoise(pos * 4.0 + vec3(time * 0.05, 0.0, 0.0));
    float storm2 = snoise(pos * 8.0 - vec3(time * 0.03, 0.0, 0.0));

    // Grande tache (style Jupiter)
    vec3 stormCenter = vec3(0.5, 0.3, 0.0) + vec3(seed * 0.001);
    float distToStorm = length(vPosition - stormCenter);
    float greatSpot = smoothstep(0.5, 0.2, distToStorm);

    // Couleurs
    vec3 bandColor1 = baseColor;
    vec3 bandColor2 = secondaryColor;
    vec3 bandColor3 = mix(baseColor, vec3(1.0, 0.9, 0.8), 0.3);
    vec3 stormColor = mix(baseColor, vec3(0.9, 0.5, 0.3), 0.5);

    vec3 surfaceColor = mix(bandColor1, bandColor2, bands);
    surfaceColor = mix(surfaceColor, bandColor3, bands2 * 0.4);
    surfaceColor += vec3(storm * 0.1, storm * 0.08, storm * 0.05);
    surfaceColor = mix(surfaceColor, stormColor, greatSpot * 0.7);

    // Turbulence subtile
    surfaceColor += vec3(storm2 * 0.05);

    // Éclairage
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.2;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.8);

    // Atmosphère brillante sur les bords
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += baseColor * pow(rim, 3.0) * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète de glace
const iceFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = fbm(pos * 2.0);
    float n2 = snoise(pos * 5.0);
    float cracks = abs(snoise(pos * 10.0));

    // Calottes polaires
    float polar = smoothstep(0.6, 0.9, abs(vPosition.y));

    // Couleurs de glace
    vec3 iceColor = baseColor;
    vec3 deepIce = secondaryColor;
    vec3 snowColor = vec3(0.95, 0.97, 1.0);
    vec3 crackColor = baseColor * 0.4;

    vec3 surfaceColor = mix(deepIce, iceColor, smoothstep(-0.2, 0.3, n1));
    surfaceColor = mix(surfaceColor, snowColor, polar);

    // Fissures dans la glace
    float crackLines = smoothstep(0.85, 0.9, cracks);
    surfaceColor = mix(surfaceColor, crackColor, crackLines * 0.5);

    // Reflets cristallins
    float sparkle = pow(max(0.0, snoise(pos * 20.0)), 8.0);
    surfaceColor += vec3(sparkle * 0.3);

    // Éclairage
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.25;

    // Specular pour effet brillant
    vec3 viewDir = normalize(-vPosition);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0);

    vec3 finalColor = surfaceColor * (ambient + diff * 0.75) + vec3(spec * 0.3);

    // Rim bleuté
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(0.5, 0.7, 1.0) * pow(rim, 3.0) * 0.3;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour planète de lave
const lavaFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 secondaryColor;
  uniform float time;
  uniform float seed;
  uniform vec3 sunPosition;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = fbm(pos * 2.0 + vec3(time * 0.02, 0.0, 0.0));
    float n2 = snoise(pos * 4.0 - vec3(0.0, time * 0.01, 0.0));
    float n3 = snoise(pos * 8.0);

    // Croûte et lave
    float crustPattern = smoothstep(0.0, 0.3, n1);

    vec3 lavaColor = vec3(1.0, 0.3, 0.0);
    vec3 hotLava = vec3(1.0, 0.8, 0.2);
    vec3 crustColor = baseColor * 0.2;
    vec3 darkCrust = vec3(0.1, 0.05, 0.02);

    // Lave qui coule
    vec3 lava = mix(lavaColor, hotLava, smoothstep(0.3, 0.7, n2));

    // Surface
    vec3 surfaceColor = mix(lava, crustColor, crustPattern);
    surfaceColor = mix(surfaceColor, darkCrust, smoothstep(0.5, 0.8, n3) * crustPattern);

    // Fissures lumineuses
    float cracks = smoothstep(0.7, 0.75, abs(snoise(pos * 15.0)));
    surfaceColor = mix(surfaceColor, hotLava, cracks * (1.0 - crustPattern * 0.5));

    // Émission de lumière propre
    float emission = (1.0 - crustPattern) * 0.8 + cracks * 0.5;

    // Éclairage
    vec3 lightDir = normalize(sunPosition - vPosition);
    float diff = max(dot(vNormal, lightDir), 0.0);
    float ambient = 0.1;

    vec3 finalColor = surfaceColor * (ambient + diff * 0.5) + surfaceColor * emission * 0.5;

    // Rim de chaleur
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    finalColor += vec3(1.0, 0.4, 0.1) * pow(rim, 2.0) * 0.4;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Shader pour l'atmosphère
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const atmosphereFragmentShader = `
  uniform vec3 glowColor;
  uniform float intensity;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

    vec3 color = glowColor * fresnel * intensity;
    float alpha = fresnel * 0.7;

    gl_FragColor = vec4(color, alpha);
  }
`

// Shader pour les nuages (planètes gazeuses seulement)
const cloudsFragmentShader = `
  uniform vec3 cloudColor;
  uniform float time;
  uniform float seed;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  ${noiseGLSL}

  void main() {
    vec3 pos = vPosition + vec3(seed);

    float n1 = snoise(pos * 3.0 + vec3(time * 0.03, 0.0, 0.0));
    float n2 = snoise(pos * 6.0 - vec3(time * 0.02, 0.0, 0.0));

    float clouds = smoothstep(0.1, 0.6, n1 * 0.5 + n2 * 0.5);

    vec3 lightDir = normalize(vec3(1.0, 0.5, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);

    vec3 color = cloudColor * (0.6 + diff * 0.4);
    float alpha = clouds * 0.5;

    gl_FragColor = vec4(color, alpha);
  }
`

// Shader pour anneaux
const ringFragmentShader = `
  uniform vec3 ringColor;
  uniform float innerRadius;
  uniform float outerRadius;
  uniform float seed;

  varying vec2 vUv;

  ${noiseGLSL}

  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = length(vUv - center) * 2.0;

    // Bandes dans les anneaux
    float bands = sin(dist * 50.0 + seed) * 0.5 + 0.5;
    float bands2 = sin(dist * 120.0 + seed * 2.0) * 0.5 + 0.5;

    // Gaps dans les anneaux (comme les divisions de Cassini)
    float gap1 = smoothstep(0.45, 0.47, dist) * (1.0 - smoothstep(0.48, 0.50, dist));
    float gap2 = smoothstep(0.65, 0.66, dist) * (1.0 - smoothstep(0.67, 0.68, dist));

    float alpha = bands * 0.6 + bands2 * 0.3;
    alpha *= (1.0 - gap1) * (1.0 - gap2 * 0.7);

    // Fade aux bords
    alpha *= smoothstep(0.0, 0.1, dist);
    alpha *= smoothstep(1.0, 0.85, dist);

    vec3 color = ringColor * (0.7 + bands * 0.3);

    gl_FragColor = vec4(color, alpha * 0.7);
  }
`

interface PlanetProps {
  campus: Campus
  onClick: () => void
  isActive: boolean
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
}

export function Planet({ campus, onClick, isActive, orbitRadius, orbitSpeed, orbitOffset }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const planetRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const atmosphereRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Seed unique basé sur l'ID du campus
  const seed = useMemo(() => {
    let hash = 0
    for (let i = 0; i < campus.id.length; i++) {
      hash = ((hash << 5) - hash) + campus.id.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 1000
  }, [campus.id])

  // Détermine le type de planète et si elle a des anneaux
  const planetType: PlanetType = useMemo(() => {
    const types: PlanetType[] = ['rocky', 'gasGiant', 'ice', 'lava']
    return types[seed % types.length]
  }, [seed])

  const hasRings = useMemo(() => {
    return planetType === 'gasGiant' || seed % 5 === 0
  }, [planetType, seed])

  const hasClouds = useMemo(() => {
    return planetType === 'gasGiant' || planetType === 'ice'
  }, [planetType])

  // Couleurs de la planète
  const baseColor = useMemo(() => new THREE.Color(campus.color), [campus.color])
  const secondaryColor = useMemo(() => {
    const hsl = { h: 0, s: 0, l: 0 }
    baseColor.getHSL(hsl)
    return new THREE.Color().setHSL(
      (hsl.h + 0.08) % 1,
      hsl.s * 0.9,
      hsl.l * 0.75
    )
  }, [baseColor])

  // Sélection du fragment shader selon le type
  const fragmentShader = useMemo(() => {
    switch (planetType) {
      case 'gasGiant': return gasGiantFragmentShader
      case 'ice': return iceFragmentShader
      case 'lava': return lavaFragmentShader
      default: return rockyFragmentShader
    }
  }, [planetType])

  // Uniforms pour les shaders
  const planetUniforms = useMemo(() => ({
    baseColor: { value: baseColor },
    secondaryColor: { value: secondaryColor },
    time: { value: 0 },
    seed: { value: seed },
    sunPosition: { value: new THREE.Vector3(0, 0, 0) }
  }), [baseColor, secondaryColor, seed])

  const atmosphereUniforms = useMemo(() => ({
    glowColor: { value: baseColor },
    intensity: { value: 1.0 }
  }), [baseColor])

  const cloudsUniforms = useMemo(() => ({
    cloudColor: { value: new THREE.Color(1, 1, 1) },
    time: { value: 0 },
    seed: { value: seed + 500 }
  }), [seed])

  const ringUniforms = useMemo(() => ({
    ringColor: { value: baseColor.clone().lerp(new THREE.Color(1, 1, 1), 0.3) },
    innerRadius: { value: 0.5 },
    outerRadius: { value: 1.0 },
    seed: { value: seed }
  }), [baseColor, seed])

  // Position orbitale
  const currentPosition = useRef(new THREE.Vector3())

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Orbite autour du soleil
    if (groupRef.current) {
      const angle = time * orbitSpeed + orbitOffset
      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(angle * 0.5) * orbitRadius * 0.1 // Légère inclinaison

      groupRef.current.position.set(x, y, z)
      currentPosition.current.set(x, y, z)
    }

    if (planetRef.current) {
      planetRef.current.rotation.y += planetType === 'gasGiant' ? 0.004 : 0.002
      const material = planetRef.current.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.time.value = time
        material.uniforms.sunPosition.value.set(
          -currentPosition.current.x,
          -currentPosition.current.y,
          -currentPosition.current.z
        ).normalize().multiplyScalar(10)
      }
    }

    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += 0.003
      const material = cloudsRef.current.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.time.value = time
      }
    }

    if (atmosphereRef.current) {
      const material = atmosphereRef.current.material as THREE.ShaderMaterial
      if (material.uniforms) {
        material.uniforms.intensity.value = THREE.MathUtils.lerp(
          material.uniforms.intensity.value,
          hovered ? 1.8 : 1.0,
          0.1
        )
      }
    }
  })

  const planetSize = planetType === 'gasGiant' ? campus.size * 1.3 : campus.size

  return (
    <>
      {/* Orbite visible */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.03, orbitRadius + 0.03, 128]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={groupRef}>
        {/* Atmosphère externe (glow) */}
        <Sphere ref={atmosphereRef} args={[planetSize * 1.12, 64, 64]}>
          <shaderMaterial
            uniforms={atmosphereUniforms}
            vertexShader={atmosphereVertexShader}
            fragmentShader={atmosphereFragmentShader}
            transparent
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </Sphere>

        {/* Surface de la planète */}
        <Sphere
          ref={planetRef}
          args={[planetSize, 128, 128]}
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'auto'
          }}
        >
          <shaderMaterial
            uniforms={planetUniforms}
            vertexShader={planetVertexShader}
            fragmentShader={fragmentShader}
          />
        </Sphere>

        {/* Couche de nuages (pour certains types) */}
        {hasClouds && (
          <Sphere ref={cloudsRef} args={[planetSize * 1.02, 64, 64]}>
            <shaderMaterial
              uniforms={cloudsUniforms}
              vertexShader={planetVertexShader}
              fragmentShader={cloudsFragmentShader}
              transparent
              depthWrite={false}
            />
          </Sphere>
        )}

        {/* Anneaux */}
        {hasRings && (
          <group rotation={[Math.PI * 0.4 + seed * 0.001, seed * 0.002, Math.PI * 0.05]}>
            <mesh>
              <ringGeometry args={[planetSize * 1.4, planetSize * 2.5, 128]} />
              <shaderMaterial
                uniforms={ringUniforms}
                vertexShader={`
                  varying vec2 vUv;
                  void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                  }
                `}
                fragmentShader={ringFragmentShader}
                transparent
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        )}

        {/* Label */}
        {!isActive && (
          <Html
            position={[0, planetSize + 1.2, 0]}
            center
            style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: '400',
              letterSpacing: '0.08em',
              textShadow: `0 0 10px ${campus.color}, 0 0 20px rgba(255,255,255,0.5)`,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              opacity: hovered ? 1 : 0.7,
              transition: 'opacity 0.3s ease'
            }}
          >
            {campus.name}
          </Html>
        )}
      </group>
    </>
  )
}
