import { useRef, useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Planet } from './Planet'
import { Moon } from './Moon'
import { Stars } from './Stars'
import { Sun } from './Sun'
import type { Campus, Project } from '../types'

interface GalaxyProps {
  campuses: Campus[]
  activeCampus: Campus | null
  selectedProject: Project | null
  onCampusClick: (campus: Campus) => void
  onProjectClick: (project: Project) => void
}

// Calcule les paramètres d'orbite pour chaque campus
function getOrbitParams(index: number, total: number) {
  const baseRadius = 8
  const radiusIncrement = 5
  const orbitRadius = baseRadius + index * radiusIncrement

  // Vitesse inversement proportionnelle au rayon (lois de Kepler simplifiées)
  const orbitSpeed = 0.15 / Math.sqrt(orbitRadius / baseRadius)

  // Offset pour répartir les planètes
  const orbitOffset = (index / total) * Math.PI * 2

  return { orbitRadius, orbitSpeed, orbitOffset }
}

export function Galaxy({
  campuses,
  activeCampus,
  selectedProject,
  onCampusClick,
  onProjectClick
}: GalaxyProps) {
  const { camera } = useThree()
  const targetPosition = useRef(new THREE.Vector3(25, 15, 25))
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0))

  // Stocke les positions actuelles des planètes pour le suivi caméra
  const planetPositions = useRef<Map<string, THREE.Vector3>>(new Map())

  // Calcule les paramètres d'orbite pour tous les campus
  const orbitParams = useMemo(() => {
    return campuses.map((_, index) => getOrbitParams(index, campuses.length))
  }, [campuses])

  useEffect(() => {
    if (activeCampus) {
      // La position sera mise à jour dans useFrame car la planète bouge
    } else {
      targetPosition.current.set(25, 15, 25)
      targetLookAt.current.set(0, 0, 0)
    }
  }, [activeCampus])

  useFrame((state) => {
    const time = state.clock.elapsedTime

    // Met à jour les positions des planètes
    campuses.forEach((campus, index) => {
      const { orbitRadius, orbitSpeed, orbitOffset } = orbitParams[index]
      const angle = time * orbitSpeed + orbitOffset
      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(angle * 0.5) * orbitRadius * 0.1

      if (!planetPositions.current.has(campus.id)) {
        planetPositions.current.set(campus.id, new THREE.Vector3())
      }
      planetPositions.current.get(campus.id)!.set(x, y, z)
    })

    // Si un campus est actif, suit sa position
    if (activeCampus) {
      const pos = planetPositions.current.get(activeCampus.id)
      if (pos) {
        const campusIndex = campuses.findIndex(c => c.id === activeCampus.id)
        const planetSize = campusIndex >= 0 &&
          (campuses[campusIndex].id.length * 7) % 4 === 1
            ? activeCampus.size * 1.3
            : activeCampus.size

        targetPosition.current.set(
          pos.x + planetSize * 5,
          pos.y + planetSize * 3,
          pos.z + planetSize * 5
        )
        targetLookAt.current.copy(pos)
      }
    }

    camera.position.lerp(targetPosition.current, 0.03)
    currentLookAt.current.lerp(targetLookAt.current, 0.03)
    camera.lookAt(currentLookAt.current)
  })

  return (
    <>
      <Stars />

      <ambientLight intensity={0.2} />

      {/* Soleil central */}
      <Sun />

      {campuses.map((campus, index) => {
        const { orbitRadius, orbitSpeed, orbitOffset } = orbitParams[index]

        return (
          <group key={campus.id}>
            <Planet
              campus={campus}
              onClick={() => onCampusClick(campus)}
              isActive={activeCampus?.id === campus.id}
              orbitRadius={orbitRadius}
              orbitSpeed={orbitSpeed}
              orbitOffset={orbitOffset}
            />

            {activeCampus?.id === campus.id && (
              <PlanetMoons
                campus={campus}
                orbitRadius={orbitRadius}
                orbitSpeed={orbitSpeed}
                orbitOffset={orbitOffset}
                selectedProject={selectedProject}
                onProjectClick={onProjectClick}
              />
            )}
          </group>
        )
      })}
    </>
  )
}

// Composant séparé pour les lunes qui suit la planète
interface PlanetMoonsProps {
  campus: Campus
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
  selectedProject: Project | null
  onProjectClick: (project: Project) => void
}

function PlanetMoons({
  campus,
  orbitRadius,
  orbitSpeed,
  orbitOffset,
  selectedProject,
  onProjectClick
}: PlanetMoonsProps) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime
      const angle = time * orbitSpeed + orbitOffset
      const x = Math.cos(angle) * orbitRadius
      const z = Math.sin(angle) * orbitRadius
      const y = Math.sin(angle * 0.5) * orbitRadius * 0.1

      groupRef.current.position.set(x, y, z)
    }
  })

  // Détermine la taille de la planète (même logique que dans Planet.tsx)
  const seed = useMemo(() => {
    let hash = 0
    for (let i = 0; i < campus.id.length; i++) {
      hash = ((hash << 5) - hash) + campus.id.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 1000
  }, [campus.id])

  const planetType = ['rocky', 'gasGiant', 'ice', 'lava'][seed % 4]
  const planetSize = planetType === 'gasGiant' ? campus.size * 1.3 : campus.size

  const items = campus.details || (campus as any).projects || []

  return (
    <group ref={groupRef}>
      {items.map((item: any, index: number) => (
        <Moon
          key={item.id}
          project={item}
          index={index}
          total={items.length}
          parentSize={planetSize}
          parentColor={campus.color}
          onClick={() => onProjectClick(item)}
          isSelected={selectedProject?.id === item.id}
        />
      ))}
    </group>
  )
}
