import type { Profile } from '../types'

interface ProfilePanelProps {
  profile: Profile
  onClose: () => void
}

export function ProfilePanel({ profile, onClose }: ProfilePanelProps) {
  return (
    <div className="profile-panel">
      <button className="close-panel" onClick={onClose}>
        ×
      </button>

      <div className="profile-header">
        <div className="profile-photo">
          <img
            src={profile.photo}
            alt={profile.name}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p className="profile-title">{profile.title}</p>
        </div>
      </div>

      <p className="profile-summary">{profile.summary}</p>

      <div className="profile-section">
        <h3>Expériences</h3>
        {profile.experience.map((exp) => (
          <div key={exp.id} className="profile-item">
            <div className="profile-item-header">
              <strong>{exp.position}</strong>
              <span className="profile-period">{exp.period}</span>
            </div>
            <p className="profile-company">{exp.company}</p>
            <p className="profile-description">{exp.description}</p>
          </div>
        ))}
      </div>

      <div className="profile-section">
        <h3>Formation</h3>
        {profile.education.map((edu) => (
          <div key={edu.id} className="profile-item">
            <div className="profile-item-header">
              <strong>{edu.degree}</strong>
              <span className="profile-period">{edu.period}</span>
            </div>
            <p className="profile-company">{edu.school}</p>
            <p className="profile-description">{edu.description}</p>
          </div>
        ))}
      </div>

      <div className="profile-section">
        <h3>Compétences</h3>
        <div className="profile-skills">
          {profile.skills.map((skill, index) => (
            <span key={index} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
