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

export type DistributionType = "group_distribution" | "distributor" | "sub_distributor";

export interface DistributionEntity {
  id: string;
  name: string;
  legalName: string | null;
  shortName: string | null;
  distributionType: DistributionType;
  parentId: string | null;
  marketSegment: string | null;
  regionLabel: string | null;
  city: string | null;
  province: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  contactName: string | null;
  logoUrl: string | null;
  description: string | null;
  sortOrder: number;
}

export interface ContactFormData {
  fullName: string;
  email: string;
  company: string;
  industry: string;
  message: string;
}
