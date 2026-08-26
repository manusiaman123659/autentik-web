import { z } from "zod";

export const FILE_TYPES = ["datasheet", "manual", "cad_3d", "certificate", "software_firmware"] as const;
export type FileType = (typeof FILE_TYPES)[number];

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  datasheet: "Datasheet",
  manual: "Manual Book",
  cad_3d: "CAD / 3D Step",
  certificate: "Sertifikat",
  software_firmware: "Software / Firmware",
};

export const RFQ_STATUSES = ["pending", "reviewed", "quoted", "rejected"] as const;
export type RfqStatus = (typeof RFQ_STATUSES)[number];

export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  pending: "Pending",
  reviewed: "Ditinjau",
  quoted: "Sudah Dikirim Penawaran",
  rejected: "Ditolak",
};

export const rfqSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().optional(),
  companyName: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  picName: z.string().min(2, "Nama PIC minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phoneNumber: z.string().min(8, "Nomor telepon minimal 8 digit"),
  estimatedQuantity: z.coerce.number().int().min(1, "Minimal 1 unit"),
  targetDate: z.string().optional().nullable().or(z.literal("")),
  notes: z.string().optional().nullable().or(z.literal("")),
});

export type RfqFormData = z.infer<typeof rfqSchema>;

export const docDownloadLeadSchema = z.object({
  documentId: z.string().uuid("ID dokumen tidak valid"),
  fullName: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  workEmail: z.string().email("Format email tidak valid"),
  companyName: z.string().min(2, "Nama perusahaan minimal 2 karakter"),
  phoneNumber: z
    .string()
    .min(8, "Nomor telepon minimal 8 digit")
    .regex(/^[\d\s\-+()]+$/, "Format nomor telepon tidak valid"),
});

export type DocDownloadLeadFormData = z.infer<typeof docDownloadLeadSchema>;

export const technicalDocumentSchema = z.object({
  title: z.string().min(1, "Judul dokumen wajib diisi"),
  fileType: z.enum(FILE_TYPES, "Tipe dokumen tidak valid"),
  fileUrl: z.string().url("URL file tidak valid"),
  fileSizeKb: z.coerce.number().int().min(0).optional(),
  requiresLead: z.boolean().default(true),
});

export type TechnicalDocumentFormData = z.infer<typeof technicalDocumentSchema>;
