import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Galaxy } from './components/Galaxy'
import { ServicePanel } from './components/ServicePanel'
import { DetailPanel } from './components/DetailPanel'
import { ProfilePanel } from './components/ProfilePanel'
import galaxyData from './data/services.json'
import profileData from './data/profile.json'
import type { Service, ServiceDetail, GalaxyData, Profile } from './types'

const data = galaxyData as GalaxyData
const profile = profileData as Profile

function App() {
  const [activeService, setActiveService] = useState<Service | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ServiceDetail | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  const handleServiceClick = (service: Service) => {
    if (activeService?.id === service.id) {
      setActiveService(null)
      setSelectedDetail(null)
    } else {
      setActiveService(service)
      setSelectedDetail(null)
      setShowProfile(false)
    }
  }

  const handleDetailClick = (detail: ServiceDetail) => {
    setSelectedDetail(detail)
  }

  const handleBack = () => {
    setActiveService(null)
    setSelectedDetail(null)
  }

  const handleClosePanel = () => {
    setSelectedDetail(null)
  }

  const handleSunClick = () => {
    setShowProfile(!showProfile)
    setActiveService(null)
    setSelectedDetail(null)
  }

  const handleCloseProfile = () => {
    setShowProfile(false)
  }

  return (
    <div className="app">
      <div className="canvas-container">
        <Canvas
          camera={{
            position: [25, 15, 25],
            fov: 60,
            near: 0.1,
            far: 1000
          }}
        >
          <Galaxy
            campuses={data.services}
            activeCampus={activeService}
            selectedProject={selectedDetail}
            onCampusClick={handleServiceClick}
            onProjectClick={handleDetailClick}
            onSunClick={handleSunClick}
          />
        </Canvas>
      </div>

      <div className="ui-overlay">
        <header className="header">
          <h1 className="owner-name">{data.ownerName}</h1>
          {data.tagline && <p className="tagline">{data.tagline}</p>}
        </header>

        {activeService && (
          <>
            <button className="back-button" onClick={handleBack}>
              ← Vue d'ensemble
            </button>
            <ServicePanel service={activeService} onClose={handleBack} />
          </>
        )}

        {!activeService && !showProfile && (
          <p className="hint">Explorez mes services en cliquant sur une planète, ou cliquez sur le soleil pour voir mon profil</p>
        )}

        {showProfile && (
          <ProfilePanel profile={profile} onClose={handleCloseProfile} />
        )}

        {selectedDetail && (
          <DetailPanel
            detail={selectedDetail}
            service={activeService!}
            onClose={handleClosePanel}
          />
        )}

        {data.contact && (
          <div className="contact-bar">
            {data.contact.email && (
              <a href={`mailto:${data.contact.email}`} className="contact-link">
                Email
              </a>
            )}
            {data.contact.linkedin && (
              <a href={data.contact.linkedin} target="_blank" rel="noopener noreferrer" className="contact-link">
                LinkedIn
              </a>
            )}
            {data.contact.website && (
              <a href={data.contact.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                Site web
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
