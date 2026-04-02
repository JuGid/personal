import type { Service } from '../types'

interface ServicePanelProps {
  service: Service
}

export function ServicePanel({ service }: ServicePanelProps) {
  return (
    <div className="service-panel">
      <h2 style={{ color: service.color }}>{service.name}</h2>
      <p className="service-description">{service.description}</p>

      {service.cta && (
        <a
          href={service.cta.link}
          className="service-cta"
          style={{ backgroundColor: service.color }}
        >
          {service.cta.label}
        </a>
      )}

      <p className="service-hint">
        Cliquez sur un satellite pour plus de détails
      </p>
    </div>
  )
}
