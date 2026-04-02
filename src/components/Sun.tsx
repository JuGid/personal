import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SunProps {
  onClick?: () => void
}

const sunVertexShader = `
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

const sunFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  // Simplex noise
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

  void main() {
    vec3 pos = vPosition;

    // Turbulence animée
    float n1 = snoise(pos * 2.0 + time * 0.3);
    float n2 = snoise(pos * 4.0 - time * 0.2);
    float n3 = snoise(pos * 8.0 + time * 0.5);

    float turbulence = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

    // Couleurs du soleil
    vec3 coreColor = vec3(1.0, 1.0, 0.9);      // Blanc-jaune au centre
    vec3 midColor = vec3(1.0, 0.8, 0.3);       // Orange
    vec3 outerColor = vec3(1.0, 0.4, 0.1);     // Rouge-orange

    // Gradient basé sur la position et le bruit
    float gradient = length(vPosition) / 1.5;
    gradient += turbulence * 0.2;

    vec3 color = mix(coreColor, midColor, smoothstep(0.0, 0.5, gradient));
    color = mix(color, outerColor, smoothstep(0.3, 1.0, gradient));

    // Taches solaires
    float spots = smoothstep(0.4, 0.5, n2) * 0.3;
    color -= vec3(spots * 0.5, spots * 0.3, spots * 0.1);

    // Éruptions
    float flares = pow(max(0.0, n3), 3.0) * 0.5;
    color += vec3(flares, flares * 0.5, 0.0);

    gl_FragColor = vec4(color, 1.0);
  }
`

const coronaVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const coronaFragmentShader = `
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);

    // Pulsation
    float pulse = 0.8 + 0.2 * sin(time * 2.0);

    vec3 color = vec3(1.0, 0.6, 0.2) * fresnel * pulse;
    float alpha = fresnel * 0.6 * pulse;

    gl_FragColor = vec4(color, alpha);
  }
`

export function Sun({ onClick }: SunProps) {
  const sunRef = useRef<THREE.Mesh>(null)
  const coronaRef = useRef<THREE.Mesh>(null)
  const corona2Ref = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const sunUniforms = useMemo(() => ({
    time: { value: 0 }
  }), [])

  const coronaUniforms = useMemo(() => ({
    time: { value: 0 }
  }), [])

  const corona2Uniforms = useMemo(() => ({
    time: { value: 0 }
  }), [])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    if (sunRef.current) {
      sunRef.current.rotation.y += 0.001
      const material = sunRef.current.material as THREE.ShaderMaterial
      material.uniforms.time.value = time
    }

    if (coronaRef.current) {
      const material = coronaRef.current.material as THREE.ShaderMaterial
      material.uniforms.time.value = time
    }

    if (corona2Ref.current) {
      const material = corona2Ref.current.material as THREE.ShaderMaterial
      material.uniforms.time.value = time
    }
  })

  return (
    <group position={[0, 0, 0]}>
      {/* Lumière du soleil */}
      <pointLight intensity={3} color="#fff5e0" distance={100} decay={0.5} />
      <pointLight intensity={1.5} color="#ffaa44" distance={50} decay={1} />

      {/* Corona externe */}
      <mesh ref={corona2Ref}>
        <sphereGeometry args={[2.5, 64, 64]} />
        <shaderMaterial
          uniforms={corona2Uniforms}
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Corona interne */}
      <mesh ref={coronaRef}>
        <sphereGeometry args={[1.8, 64, 64]} />
        <shaderMaterial
          uniforms={coronaUniforms}
          vertexShader={coronaVertexShader}
          fragmentShader={coronaFragmentShader}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Surface du soleil */}
      <mesh
        ref={sunRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
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
        scale={hovered ? 1.05 : 1}
      >
        <sphereGeometry args={[1.5, 128, 128]} />
        <shaderMaterial
          uniforms={sunUniforms}
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
        />
      </mesh>

      {/* Glow additionnel */}
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial
          color="#ffaa44"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
