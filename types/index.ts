export interface Solution {
  id: string;
  icon: string;
  title: string;
  description: string;
  fullDescription: string;
  anchor: string;
}

export interface Article {
  slug: string;
  badge: string;
  badgeColor: string;
  date: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  featured?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  roleColor: string;
  bio: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandColor: string;
  category: string;
  categoryColor: string;
  description: string;
  features?: string[];
  specs?: { label: string; value: string }[];
  imageUrl?: string;
  brochureUrl?: string;
  model3dUrl?: string;
  images?: string[];
  fulfillmentType?: "ready_stock" | "custom_request" | "third_party" | null;
}

export interface Brand {
  id: string;
  name: string;
  segment: "HSE" | "ENV" | "Platform" | "Lab";
  segmentColor: string;
  tagline: string;
  description: string;
  accentColor: string;
  logoLight?: string;
  logoDark?: string;
}

export interface GroupCompany {
  id: string;
  name: string;
  legalName?: string;
  logoUrl?: string;
  url?: string;
}

export interface Partner {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  url?: string;
}

export interface ContactFormData {
  fullName: string;
  email: string;
  company: string;
  industry: string;
  message: string;
}
