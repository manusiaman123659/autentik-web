export type PublicTechnicalDocument =
  | {
      id: string;
      title: string;
      file_type: string;
      file_size_kb: number | null;
      requires_lead: false;
      file_url: string;
    }
  | {
      id: string;
      title: string;
      file_type: string;
      file_size_kb: number | null;
      requires_lead: true;
    };

export function isPublicTechnicalDocumentProduct(product: {
  product_type: string;
  status?: string | null;
  is_active?: boolean | null;
  deleted_at?: string | null;
}): boolean {
  return product.product_type === "b2b_system"
    && product.status === "published"
    && product.is_active === true
    && product.deleted_at == null;
}

export function toPublicTechnicalDocument(row: {
  id: string;
  title: string;
  file_type: string;
  file_size_kb: number | null;
  requires_lead: boolean;
  file_url: string | null;
  storage_path: string | null;
}): PublicTechnicalDocument | null {
  const metadata = {
    id: row.id,
    title: row.title,
    file_type: row.file_type,
    file_size_kb: row.file_size_kb,
  };

  if (row.requires_lead) {
    if (!row.storage_path || row.file_url != null) return null;
    return { ...metadata, requires_lead: true };
  }

  if (!row.file_url || row.storage_path != null) return null;
  return { ...metadata, requires_lead: false, file_url: row.file_url };
}
