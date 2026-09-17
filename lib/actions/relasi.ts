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
import {
  distributionEntityIdSchema,
  distributionEntitySchema,
  distributionEntityToggleSchema,
} from "@/lib/validations/distributionSchema";

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
  revalidatePath("/distributors");
  revalidatePath("/");
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

export async function saveDistributionEntity(input: unknown): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = distributionEntitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Periksa kembali isian form.",
      errors: toErrors(parsed.error),
    };
  }

  const d = parsed.data;
  const isUpdate = Boolean(d.id);
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  if (d.parentId) {
    const { data: hierarchy, error: parentError } = await supabase
      .from("distribution_entities")
      .select("id, parent_id, is_active")
      .is("deleted_at", null);
    const parentMap = new Map(
      (hierarchy ?? []).map((entity) => [
        entity.id,
        { parentId: entity.parent_id as string | null, isActive: entity.is_active as boolean },
      ]),
    );
    const parent = parentMap.get(d.parentId);
    if (parentError || !parent) {
      return {
        success: false,
        message: "Parent distributor tidak ditemukan atau sudah dihapus.",
        errors: { parentId: "Pilih parent distributor yang masih tersedia" },
      };
    }
    if (d.isActive && !parent.isActive) {
      return {
        success: false,
        message: "Jaringan aktif tidak dapat menggunakan parent yang nonaktif.",
        errors: { parentId: "Aktifkan parent terlebih dahulu atau pilih parent lain" },
      };
    }

    const visited = new Set<string>();
    let ancestorId: string | null = d.parentId;
    while (ancestorId) {
      if (ancestorId === d.id || visited.has(ancestorId)) {
        return {
          success: false,
          message: "Relasi parent akan membentuk siklus.",
          errors: { parentId: "Pilih parent yang tidak berada di bawah entitas ini" },
        };
      }
      visited.add(ancestorId);
      ancestorId = parentMap.get(ancestorId)?.parentId ?? null;
    }
  }

  if (d.id && !d.isActive) {
    const { count, error: childError } = await supabase
      .from("distribution_entities")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", d.id)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (childError) {
      console.error("[action] check active distribution children", childError);
      return { success: false, message: "Gagal memeriksa relasi sub-distributor." };
    }
    if ((count ?? 0) > 0) {
      return {
        success: false,
        message: "Nonaktifkan entitas turunan terlebih dahulu sebelum menonaktifkan parent.",
      };
    }
  }

  const record = {
    name: d.name,
    legal_name: d.legalName || null,
    short_name: d.shortName || null,
    distribution_type: d.distributionType,
    parent_id: d.parentId || null,
    market_segment: d.marketSegment || null,
    region_label: d.regionLabel || null,
    city: d.city || null,
    province: d.province || null,
    address: d.address || null,
    phone: d.phone || null,
    email: d.email || null,
    website_url: d.websiteUrl || null,
    contact_name: d.contactName || null,
    logo_url: d.logoUrl || null,
    description: d.description || null,
    is_active: d.isActive,
    sort_order: d.sortOrder,
  };

  const query = isUpdate
    ? supabase
        .from("distribution_entities")
        .update(record)
        .eq("id", d.id)
        .is("deleted_at", null)
        .select("id")
        .maybeSingle()
    : supabase.from("distribution_entities").insert(record).select("id").single();
  const { data, error } = await query;

  if (error) {
    console.error("[action] save distribution entity", error);
    const duplicate = error.code === "23505";
    return {
      success: false,
      message: duplicate
        ? "Nama entitas jaringan distribusi sudah digunakan."
        : "Gagal menyimpan jaringan distribusi.",
      errors: duplicate ? { name: "Nama perusahaan sudah terdaftar" } : undefined,
    };
  }
  if (!data) {
    return { success: false, message: "Data jaringan distribusi tidak ditemukan." };
  }

  await recordAudit(
    isUpdate ? "distribution_entity.updated" : "distribution_entity.created",
    "distribution_entity",
    data.id,
    { name: d.name, distributionType: d.distributionType },
  );
  revalidateRelasiRoutes();
  return {
    success: true,
    message: isUpdate
      ? "Jaringan distribusi berhasil diperbarui."
      : "Jaringan distribusi berhasil ditambahkan.",
  };
}

export async function toggleDistributionEntity(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsed = distributionEntityToggleSchema.safeParse({ id, isActive });
  if (!parsed.success) return { success: false, message: "Status jaringan tidak valid." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  if (!parsed.data.isActive) {
    const { count, error: childError } = await supabase
      .from("distribution_entities")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", parsed.data.id)
      .eq("is_active", true)
      .is("deleted_at", null);
    if (childError) {
      console.error("[action] check active distribution children", childError);
      return { success: false, message: "Gagal memeriksa relasi sub-distributor." };
    }
    if ((count ?? 0) > 0) {
      return {
        success: false,
        message: "Nonaktifkan entitas turunan terlebih dahulu sebelum menonaktifkan parent.",
      };
    }
  }

  const { data, error } = await supabase
    .from("distribution_entities")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("[action] toggle distribution entity", error);
    return { success: false, message: "Gagal memperbarui status jaringan distribusi." };
  }

  await recordAudit("distribution_entity.toggled", "distribution_entity", parsed.data.id, {
    is_active: parsed.data.isActive,
  });
  revalidateRelasiRoutes();
  return {
    success: true,
    message: parsed.data.isActive
      ? "Jaringan distribusi kini tampil di publik."
      : "Jaringan distribusi disembunyikan dari publik.",
  };
}

export async function deleteDistributionEntity(id: string): Promise<ActionResult> {
  const admin = await getAdminUser();
  if (!admin) return { success: false, message: "Anda tidak memiliki akses." };

  const parsedId = distributionEntityIdSchema.safeParse(id);
  if (!parsedId.success) return { success: false, message: "ID jaringan tidak valid." };

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { count, error: childError } = await supabase
    .from("distribution_entities")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", parsedId.data)
    .is("deleted_at", null);
  if (childError) {
    console.error("[action] check distribution children", childError);
    return { success: false, message: "Gagal memeriksa relasi sub-distributor." };
  }
  if ((count ?? 0) > 0) {
    return {
      success: false,
      message: "Entitas masih menjadi parent. Ubah parent sub-distributor sebelum menghapus.",
    };
  }

  const { data, error } = await supabase
    .from("distribution_entities")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", parsedId.data)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("[action] delete distribution entity", error);
    return { success: false, message: "Gagal menghapus jaringan distribusi." };
  }

  await recordAudit("distribution_entity.deleted", "distribution_entity", parsedId.data, {});
  revalidateRelasiRoutes();
  return { success: true, message: "Jaringan distribusi berhasil dihapus." };
}
