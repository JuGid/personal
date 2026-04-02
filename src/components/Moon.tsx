import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import type { Project } from '../types'

interface MoonProps {
  project: Project
  index: number
  total: number
  parentSize: number
  parentColor: string
  onClick: () => void
  isSelected: boolean
}

export function Moon({
  project,
  index,
  total,
  parentSize,
  parentColor,
  onClick,
  isSelected
}: MoonProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const orbitRadius = parentSize + 2 + index * 1.5
  const orbitSpeed = 0.3 + index * 0.1
  const moonSize = 0.4

  useFrame((state) => {
    if (groupRef.current) {
      const angle = state.clock.elapsedTime * orbitSpeed + (index * Math.PI * 2) / total
      groupRef.current.position.x = Math.cos(angle) * orbitRadius
      groupRef.current.position.z = Math.sin(angle) * orbitRadius
      groupRef.current.position.y = Math.sin(angle * 0.5) * 0.5
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  const baseColor = new THREE.Color(parentColor).offsetHSL(0, -0.2, 0.2)

  return (
    <>
      {/* Orbit path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.02, orbitRadius + 0.02, 64]} />
        <meshBasicMaterial
          color="white"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group ref={groupRef}>
        {/* Moon glow */}
        <Sphere args={[moonSize * 1.3, 16, 16]}>
          <meshBasicMaterial
            color={parentColor}
            transparent
            opacity={hovered || isSelected ? 0.4 : 0.1}
          />
        </Sphere>

        {/* Moon */}
        <Sphere
          ref={meshRef}
          args={[moonSize, 32, 32]}
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
          <meshStandardMaterial
            color={isSelected ? '#ffffff' : baseColor}
            roughness={0.5}
            metalness={0.4}
            emissive={isSelected ? parentColor : baseColor}
            emissiveIntensity={hovered || isSelected ? 0.6 : 0.2}
          />
        </Sphere>

        {/* Project name label */}
        <Html
          position={[0, moonSize + 0.5, 0]}
          center
          style={{
            color: 'white',
            fontSize: '12px',
            fontWeight: '400',
            textShadow: '0 0 8px rgba(0,0,0,0.8)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            opacity: hovered || isSelected ? 1 : 0.6,
            transition: 'opacity 0.3s ease',
            maxWidth: '150px',
            textOverflow: 'ellipsis',
            overflow: 'hidden'
          }}
        >
          {project.name}
        </Html>
      </group>
    </>
  )
}
