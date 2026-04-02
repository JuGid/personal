export interface ServiceDetail {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  color: string;
  size: number;
  details: ServiceDetail[];
  cta?: {
    label: string;
    link: string;
  };
}

export interface GalaxyData {
  ownerName: string;
  tagline: string;
  contact?: {
    email?: string;
    linkedin?: string;
    website?: string;
  };
  services: Service[];
}

// Types pour le profil
export interface Experience {
  id: string;
  company: string;
  position: string;
  period: string;
  description: string;
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  period: string;
  description: string;
}

export interface Profile {
  name: string;
  title: string;
  photo: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
}

// Aliases pour compatibilité avec les composants existants
export type Campus = Service;
export type Project = ServiceDetail;
