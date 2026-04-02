import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Galaxy } from './components/Galaxy'
import { ServicePanel } from './components/ServicePanel'
import { DetailPanel } from './components/DetailPanel'
import galaxyData from './data/services.json'
import type { Service, ServiceDetail, GalaxyData } from './types'

const data = galaxyData as GalaxyData

function App() {
  const [activeService, setActiveService] = useState<Service | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<ServiceDetail | null>(null)

  const handleServiceClick = (service: Service) => {
    if (activeService?.id === service.id) {
      setActiveService(null)
      setSelectedDetail(null)
    } else {
      setActiveService(service)
      setSelectedDetail(null)
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

        {!activeService && (
          <p className="hint">Explorez mes services en cliquant sur une planète</p>
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
