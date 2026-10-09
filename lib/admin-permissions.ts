export const APPLICATION_ROLES = ["super_admin", "admin", "staff", "editor", "customer"] as const;
export type ApplicationRole = (typeof APPLICATION_ROLES)[number];
export type CmsRole = Exclude<ApplicationRole, "customer">;
export const CMS_CAPABILITIES = ["cms", "operations", "content", "shipping", "audit", "sensitive", "users"] as const;
export type CmsCapability = (typeof CMS_CAPABILITIES)[number];

export const ROLE_LABELS: Record<ApplicationRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin AKA",
  staff: "Staff AKA",
  editor: "Editor AKA",
  customer: "Customer",
};

const PERMISSIONS: Record<ApplicationRole, readonly CmsCapability[]> = {
  super_admin: CMS_CAPABILITIES,
  admin: ["cms", "operations", "content", "shipping", "audit"],
  staff: ["cms", "operations"],
  editor: ["cms", "content"],
  customer: [],
};

export function hasCapability(role: unknown, capability: CmsCapability): boolean {
  return typeof role === "string"
    && Object.hasOwn(PERMISSIONS, role)
    && PERMISSIONS[role as ApplicationRole].includes(capability);
}

export function isCmsRole(role: unknown): role is CmsRole {
  return hasCapability(role, "cms");
}

export const SECTION_CAPABILITIES: Record<string, readonly CmsCapability[]> = {
  orders: ["operations"], sparepart: ["operations"], stok: ["operations"], produk: ["operations"],
  inquiry: ["operations"], lead: ["operations"], rfq: ["operations"],
  compro: ["content"], merek: ["content"], karir: ["content"], relasi: ["content"], portfolio: ["content"],
  integrasi: ["content", "shipping", "sensitive"],
  "akses-staff": ["users"], riwayat: ["audit"],
};

export function canAccessSection(role: unknown, section: string): boolean {
  return Object.hasOwn(SECTION_CAPABILITIES, section)
    && SECTION_CAPABILITIES[section].some((capability) => hasCapability(role, capability));
}
