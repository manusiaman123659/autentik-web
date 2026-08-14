"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { ZodError } from "zod";
import { getAdminUser } from "@/lib/admin";
import { createClient } from "@/utils/supabase/server";
import { recordAudit } from "@/lib/audit";
import type { ActionResult } from "./products";
import {
  teamMemberSchema,
  groupCompanySchema,
  partnerSchema,
} from "@/lib/validations/relasiSchema";

function toErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[àáâäãå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôöõ]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/ñ/g, "n")
    .replace(/ç/g, "c")
    .replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function revalidateRelasiRoutes() {
  revalidatePath("/about");
  revalidatePath("/admin/relasi");
  revalidatePath("/admin");
}

async function persistRow(
  table: "team_members" | "group_companies" | "partners",
  id: string,
  record: Record<string, unknown>,
  entity: string,
  entityLabel: string,
  isUpdate: boolean,
  auditDetails: Record<string, unknown>
): Promise<ActionResult> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error } = await supabase
    .from(table)
    .upsert(record as never, { onConflict: "id" });
  if (error) {
    console.error(`[action] upsert ${entity}`, error);
    return {
      success: false,
      message: `Gagal menyimpan ${entityLabel}. ${error.message}`,
    };
  }

  await recordAudit(
    isUpdate ? `${entity}.updated` : `${entity}.created`,
    entity,
    id,
    auditDetails
  );
  revalidateRelasiRoutes();

  return {
    success: true,
    message: isUpdate
      ? `${entityLabel} berhasil diperbarui.`
      : `${entityLabel} berhasil ditambahkan.`,
  };
}

export async function saveTeamMember(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const isUpdate = Boolean(d.id && d.id.trim());
  const id = isUpdate ? d.id!.trim() : slugify(d.name) || "anggota-tim";

  return persistRow(
    "team_members",
    id,
    {
      id,
      name: d.name,
      role: d.role,
      role_color: d.roleColor,
      bio: d.bio,
      image_url: d.imageUrl,
      is_visible: d.isVisible,
      sort_order: d.sortOrder,
    },
    "team_member",
    "Anggota tim",
    isUpdate,
    { name: d.name, role: d.role }
  );
}

export async function saveGroupCompany(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = groupCompanySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const isUpdate = Boolean(d.id && d.id.trim());
  const id = isUpdate ? d.id!.trim() : slugify(d.name) || "grup";

  return persistRow(
    "group_companies",
    id,
    {
      id,
      name: d.name,
      legal_name: d.legalName,
      logo_url: d.logoUrl,
      url: d.url || null,
      is_visible: d.isVisible,
      sort_order: d.sortOrder,
    },
    "group_company",
    "Grup perusahaan",
    isUpdate,
    { name: d.name, legalName: d.legalName }
  );
}

export async function savePartner(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = partnerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const isUpdate = Boolean(d.id && d.id.trim());
  const id = isUpdate
    ? d.id!.trim()
    : slugify(d.shortName || d.name) || "partner";

  return persistRow(
    "partners",
    id,
    {
      id,
      name: d.name,
      short_name: d.shortName,
      logo_url: d.logoUrl,
      url: d.url || null,
      is_visible: d.isVisible,
      sort_order: d.sortOrder,
    },
    "partner",
    "Partner",
    isUpdate,
    { name: d.name, shortName: d.shortName }
  );
}

async function deleteRow(
  table: "team_members" | "group_companies" | "partners",
  id: string,
  entity: string,
  entityLabel: string
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    console.error(`[action] delete ${entity}`, error);
    return {
      success: false,
      message: `Gagal menghapus ${entityLabel}. ${error.message}`,
    };
  }

  await recordAudit(`${entity}.deleted`, entity, id, {});
  revalidateRelasiRoutes();
  return { success: true, message: `${entityLabel} berhasil dihapus.` };
}

export async function deleteTeamMember(id: string): Promise<ActionResult> {
  return deleteRow("team_members", id, "team_member", "Anggota tim");
}

export async function deleteGroupCompany(id: string): Promise<ActionResult> {
  return deleteRow("group_companies", id, "group_company", "Grup perusahaan");
}

export async function deletePartner(id: string): Promise<ActionResult> {
  return deleteRow("partners", id, "partner", "Partner");
}

async function toggleVisibility(
  table: "team_members" | "group_companies" | "partners",
  id: string,
  isVisible: boolean,
  entity: string,
  entityLabel: string
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { error } = await supabase
    .from(table)
    .update({ is_visible: isVisible })
    .eq("id", id);
  if (error) {
    console.error(`[action] toggle ${entity}`, error);
    return {
      success: false,
      message: `Gagal memperbarui ${entityLabel}. ${error.message}`,
    };
  }

  await recordAudit(`${entity}.toggled`, entity, id, { is_visible: isVisible });
  revalidateRelasiRoutes();
  return {
    success: true,
    message: isVisible
      ? `${entityLabel} kini tampil di publik.`
      : `${entityLabel} disembunyikan dari publik.`,
  };
}

export async function toggleTeamMember(id: string, isVisible: boolean): Promise<ActionResult> {
  return toggleVisibility("team_members", id, isVisible, "team_member", "Anggota tim");
}

export async function toggleGroupCompany(id: string, isVisible: boolean): Promise<ActionResult> {
  return toggleVisibility("group_companies", id, isVisible, "group_company", "Grup perusahaan");
}

export async function togglePartner(id: string, isVisible: boolean): Promise<ActionResult> {
  return toggleVisibility("partners", id, isVisible, "partner", "Partner");
}
