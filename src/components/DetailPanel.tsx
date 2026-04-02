import type { ServiceDetail, Service } from '../types'

interface DetailPanelProps {
  detail: ServiceDetail
  service: Service
  onClose: () => void
}

export function DetailPanel({ detail, service, onClose }: DetailPanelProps) {
  return (
    <div className="detail-panel">
      <button className="close-panel" onClick={onClose}>
        ×
      </button>

      <div className="detail-icon" style={{ backgroundColor: service.color }}>
        {detail.icon || '✦'}
      </div>

      <h2>{detail.name}</h2>

      <p className="detail-description">{detail.description}</p>

      {service.cta && (
        <a
          href={service.cta.link}
          className="detail-cta"
          style={{ borderColor: service.color, color: service.color }}
        >
          {service.cta.label}
        </a>
      )}
    </div>
  )
}
