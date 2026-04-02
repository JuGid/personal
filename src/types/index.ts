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

// Aliases pour compatibilité avec les composants existants
export type Campus = Service;
export type Project = ServiceDetail;
