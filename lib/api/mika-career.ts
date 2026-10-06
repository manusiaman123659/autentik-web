import type {
  MikaCompany,
  MikaDepartment,
  MikaJob,
  MikaJobDetail,
  MikaJobQueryParams,
  MikaJobsResponse,
} from "@/types/mika-career";
import { getSafeExternalUrl, isLocalHostname, isNgrokHostname } from "@/lib/public-url";
import { htmlToPlainText } from "@/lib/html-to-plain-text";
import { cache } from "react";
import { getSafeRecruitmentUrl } from "@/lib/recruitment-url";

export const MIKA_JOB_DETAIL_TIMEOUT_MS = 8000;

// Server-owned scope. This module's fetchers are consumed by server readers /
// route handlers only. Never read this identity from CMS, env, or visitor input.
const AKA_RECRUITMENT_COMPANY_ID = 2 as const;
const AKA_RECRUITMENT_COMPANY_NAME = "PT AUTENTIK KARYA ANALITIKA";
const MAX_SNAPSHOT_PAGES = 20;
const SNAPSHOT_PAGE_SIZE = 50;

export type MikaJobDetailUnavailableReason =
  | "configuration"
  | "timeout"
  | "network"
  | "upstream"
  | "invalid_response";

export type MikaJobDetailResult =
  | { status: "found"; job: MikaJobDetail }
  | { status: "not_found" }
  | { status: "unavailable"; reason: MikaJobDetailUnavailableReason };

export function getMikaApiBaseUrl(): string | null {
  const configured = process.env.MIKA_API_BASE_URL?.trim();
  if (!configured) return null;

  const safeUrl = getSafeExternalUrl(configured);
  if (!safeUrl) return null;

  const parsed = new URL(safeUrl);
  if (parsed.search || parsed.hash) return null;

  const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
  return `${parsed.origin}${path}`;
}

/**
 * Extracts a safe HTTPS origin from a candidate base URL or the configured MIKA_API_BASE_URL.
 */
export function getSafeMikaOrigin(baseUrl?: string | null): string | null {
  const candidate = (baseUrl !== undefined ? baseUrl : getMikaApiBaseUrl())?.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:") return null;
    if (parsed.username || parsed.password) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Normalizes an external MIKA Career company logo URL.
 *
 * Rules:
 * - CASE A & B: Absolute HTTPS URL (Cloudinary, MIKA production/staging) -> preserved as-is.
 * - CASE B: Relative Laravel public storage path (/storage/... or storage/...) -> resolved against MIKA origin.
 * - CASE C, E, F: Localhost / 127.0.0.1 Laravel public storage path -> rewritten to MIKA HTTPS origin.
 * - CASE D & I: null / undefined / empty / malformed -> null.
 * - CASE E, G, H: Dangerous / non-HTTP(S) schemes (javascript:, data:, blob:, ftp:, file:) -> null.
 * - CASE F: URLs with embedded credentials -> null.
 * - CASE J: Arbitrary foreign localhost paths not in /storage/... -> null (not rewritten).
 */
export function normalizeMikaLogoUrl(
  logo: string | null | undefined,
  mikaApiBaseUrl?: string | null,
): string | null {
  if (!logo || typeof logo !== "string") return null;

  const trimmed = logo.trim();
  if (!trimmed) return null;

  // Reject protocol-relative URLs
  if (trimmed.startsWith("//")) return null;

  // CASE B: Relative Laravel public storage path
  if (trimmed.startsWith("/storage/") || trimmed.startsWith("storage/")) {
    const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const [pathname] = normalizedPath.split(/[?#]/);

    if (!pathname.startsWith("/storage/") || pathname.length <= "/storage/".length) {
      return null;
    }

    const origin = getSafeMikaOrigin(mikaApiBaseUrl);
    if (!origin) return null;

    try {
      const resolved = new URL(normalizedPath, origin);
      // Prevent directory traversal out of /storage/
      if (!resolved.pathname.startsWith("/storage/")) return null;
      return resolved.toString();
    } catch {
      return null;
    }
  }

  // Absolute URL handling
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  // CASE F: Reject embedded credentials
  if (parsed.username || parsed.password) return null;

  // CASE E / G / H: Reject non-http(s) protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  // CASE C, E, F, J: Localhost / local IP handling
  if (isLocalHostname(parsed.hostname)) {
    // Only rewrite if it is a valid Laravel public storage path
    if (parsed.pathname.startsWith("/storage/") && parsed.pathname.length > "/storage/".length) {
      const origin = getSafeMikaOrigin(mikaApiBaseUrl);
      if (!origin) return null;

      try {
        const rewritten = new URL(parsed.pathname + parsed.search + parsed.hash, origin);
        if (!rewritten.pathname.startsWith("/storage/")) return null;
        return rewritten.toString();
      } catch {
        return null;
      }
    }

    // CASE J: Reject arbitrary foreign localhost paths
    return null;
  }

  // CASE A & B: Absolute HTTPS external URL
  if (parsed.protocol === "https:") {
    return parsed.toString();
  }

  // Reject external insecure HTTP
  return null;
}

export function normalizeMikaCompany(
  company: MikaCompany,
  baseUrl?: string | null,
): MikaCompany {
  return {
    id: company.id,
    name: company.name,
    city: company.city,
    logo: normalizeMikaLogoUrl(company.logo, baseUrl),
  };
}

export function normalizeMikaJob(
  job: MikaJob,
  baseUrl?: string | null,
): MikaJob {
  const education = job.education_requirements;
  return {
    id: job.id,
    title: job.title,
    status: job.status,
    employment_type: job.employment_type,
    location: job.location,
    salary: { min: job.salary.min, max: job.salary.max, currency: job.salary.currency, formatted: job.salary.formatted },
    quota: job.quota,
    deadline: job.deadline,
    deadline_info: {
      is_expired: job.deadline_info.is_expired,
      is_active: job.deadline_info.is_active,
      days_remaining: job.deadline_info.days_remaining,
      badge: { status: job.deadline_info.badge.status, label: job.deadline_info.badge.label, color: job.deadline_info.badge.color },
    },
    department: { id: job.department.id, name: job.department.name },
    company: normalizeMikaCompany(job.company, baseUrl),
    education_requirements:
      education == null || Array.isArray(education) ? undefined : { degrees: [...education.degrees], majors: [...education.majors] },
    description: job.description ? htmlToPlainText(job.description) : undefined,
    responsibilities: job.responsibilities ?? undefined,
    requirements: job.requirements ?? undefined,
    benefits: job.benefits ?? undefined,
    skills: job.skills ?? undefined,
    created_at: job.created_at && Number.isFinite(Date.parse(job.created_at)) ? job.created_at : undefined,
    apply_url: getMikaApplyUrl(job.apply_url),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJobId(value: unknown): value is number | string {
  return (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value)))
    && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function isPublicAkaJob(value: unknown): boolean {
  return isRecord(value) && isRecord(value.company)
    && value.company.id === AKA_RECRUITMENT_COMPANY_ID
    && typeof value.company.name === "string"
    && value.company.name.trim().replace(/\s+/g, " ").toUpperCase() === AKA_RECRUITMENT_COMPANY_NAME
    && value.status === "Open" && isRecord(value.deadline_info)
    && value.deadline_info.is_active === true && value.deadline_info.is_expired === false;
}

/** Both API and CMS fallback use the same fixed verified recruitment origin. */
export function getMikaApplyUrl(value: unknown): string | null {
  return getSafeRecruitmentUrl(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalTextList(value: unknown): value is string | string[] | null | undefined {
  return value === undefined || value === null || typeof value === "string" || isStringArray(value);
}

function isMikaJob(value: unknown): value is MikaJob {
  if (!isRecord(value)) return false;

  const salary = value.salary;
  const deadlineInfo = value.deadline_info;
  const company = value.company;
  const department = value.department;
  if (!isRecord(salary) || !isRecord(deadlineInfo) || !isRecord(company) || !isRecord(department)) {
    return false;
  }

  const deadlineBadge = deadlineInfo.badge;
  if (!isRecord(deadlineBadge)) return false;

  const education = value.education_requirements;
  if (
    education !== undefined &&
    education !== null &&
    !(
      (Array.isArray(education) && education.length === 0) ||
      (isRecord(education) && isStringArray(education.degrees) && isStringArray(education.majors))
    )
  ) {
    return false;
  }

  return (
    isJobId(value.id) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.status === "string" &&
    typeof value.employment_type === "string" &&
    typeof value.location === "string" &&
    typeof value.quota === "number" &&
    typeof value.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.deadline) &&
    Number.isFinite(Date.parse(value.deadline)) &&
    (salary.min === null || typeof salary.min === "number") &&
    (salary.max === null || typeof salary.max === "number") &&
    typeof salary.currency === "string" &&
    typeof salary.formatted === "string" &&
    typeof deadlineInfo.is_expired === "boolean" &&
    typeof deadlineInfo.is_active === "boolean" &&
    typeof deadlineInfo.days_remaining === "number" &&
    typeof deadlineBadge.status === "string" &&
    typeof deadlineBadge.label === "string" &&
    typeof deadlineBadge.color === "string" &&
    (typeof company.id === "number" || typeof company.id === "string") &&
    typeof company.name === "string" &&
    company.name.trim().length > 0 &&
    (company.logo === null || typeof company.logo === "string") &&
    typeof company.city === "string" &&
    (typeof department.id === "number" || typeof department.id === "string") &&
    typeof department.name === "string" &&
    (value.description === undefined || value.description === null || typeof value.description === "string") &&
    isOptionalTextList(value.responsibilities) &&
    isOptionalTextList(value.requirements) &&
    isOptionalTextList(value.benefits) &&
    (value.skills === undefined || value.skills === null || isStringArray(value.skills)) &&
    (value.apply_url === undefined || value.apply_url === null || typeof value.apply_url === "string") &&
    (value.created_at === undefined || value.created_at === null || typeof value.created_at === "string")
  );
}

function getMikaApiHeaders(baseUrl: string): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  const hostname = new URL(baseUrl).hostname;

  if (process.env.NODE_ENV !== "production" && isNgrokHostname(hostname)) {
    headers["ngrok-skip-browser-warning"] = "true";
  }

  return headers;
}

const emptyMeta = (params: MikaJobQueryParams = {}) => ({
  current_page: Number(params.page) || 1,
  per_page: Number(params.per_page) || 10,
  total_items: 0,
  total_pages: 1,
  has_next: false,
  has_prev: false,
});

export function getDepartmentsFromJobs(jobs: MikaJob[]): MikaDepartment[] {
  return Array.from(
    new Map(jobs.map((job) => [String(job.department.id), job.department])).values(),
  );
}

export function getCompaniesFromJobs(jobs: MikaJob[]): MikaCompany[] {
  return Array.from(
    new Map(jobs.map((job) => [String(job.company.id), job.company])).values(),
  );
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function paginationParams(params: MikaJobQueryParams) {
  return { page: positiveInteger(params.page, 1), per_page: Math.min(positiveInteger(params.per_page, 10), SNAPSHOT_PAGE_SIZE) };
}

function isPaginationMeta(value: unknown): value is MikaJobsResponse["meta"] {
  if (!isRecord(value)) return false;
  return [value.current_page, value.per_page, value.total_pages].every((n) => typeof n === "number" && Number.isSafeInteger(n) && n > 0)
    && typeof value.total_items === "number" && Number.isSafeInteger(value.total_items) && value.total_items >= 0
    && typeof value.has_next === "boolean" && typeof value.has_prev === "boolean"
    && value.total_pages === Math.max(1, Math.ceil(value.total_items / Number(value.per_page)))
    && value.has_next === (Number(value.current_page) < Number(value.total_pages))
    && value.has_prev === (Number(value.current_page) > 1);
}

async function fetchJobsPage(baseUrl: string, params: MikaJobQueryParams, page: number, perPage: number) {
  const query = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  for (const [key, value] of Object.entries({
    search: params.search || params.q, department_id: params.department_id,
    employment_type: params.employment_type, location: params.location,
  })) {
    if ((typeof value === "string" || typeof value === "number") && String(value).trim() && value !== "all") {
      query.set(key, String(value).trim().slice(0, 100));
    }
  }
  // Visitor company/company_id is deliberately not copied. Always set last.
  query.set("company_id", String(AKA_RECRUITMENT_COMPANY_ID));
  const response = await fetch(`${baseUrl}/jobs?${query}`, {
    method: "GET", headers: getMikaApiHeaders(baseUrl), signal: AbortSignal.timeout(4000), next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error("Upstream lowongan tidak tersedia");
  const json: unknown = await response.json();
  if (!isRecord(json) || json.success !== true || !Array.isArray(json.data) || !isPaginationMeta(json.meta)
    || json.meta.current_page !== page || json.meta.per_page !== perPage
    || json.data.length !== Math.max(0, Math.min(perPage, json.meta.total_items - (page - 1) * perPage))) {
    throw new Error("Payload atau pagination lowongan tidak valid");
  }
  return { data: json.data as unknown[], meta: json.meta };
}

function publicJobs(data: unknown[], baseUrl: string): MikaJob[] {
  return data.filter((job): job is MikaJob => isPublicAkaJob(job) && isMikaJob(job))
    .map((job) => normalizeMikaJob(job, baseUrl));
}

async function publicSnapshot(baseUrl: string, params: MikaJobQueryParams): Promise<MikaJob[]> {
  const first = await fetchJobsPage(baseUrl, params, 1, SNAPSHOT_PAGE_SIZE);
  if (first.meta.total_pages > MAX_SNAPSHOT_PAGES || first.meta.total_items > MAX_SNAPSHOT_PAGES * SNAPSHOT_PAGE_SIZE) {
    throw new Error("Snapshot lowongan melebihi batas");
  }
  const seenIds = new Set<string>();
  const jobs: MikaJob[] = [];
  let accumulatedRows = 0;
  const append = (data: unknown[]) => {
    // Prove completeness against ALL upstream rows before filtering ownership /
    // availability. Repeated or unidentifiable rows cannot prove a snapshot.
    for (const row of data) {
      if (!isRecord(row) || !isJobId(row.id)) throw new Error("ID snapshot lowongan tidak valid");
      const id = String(Number(row.id));
      if (seenIds.has(id)) throw new Error("ID snapshot lowongan berulang");
      seenIds.add(id);
      accumulatedRows++;
    }
    jobs.push(...publicJobs(data, baseUrl));
  };
  append(first.data);
  for (let page = 2; page <= first.meta.total_pages; page++) {
    // Never follow upstream links: they omit company_id and can broaden scope.
    const result = await fetchJobsPage(baseUrl, params, page, SNAPSHOT_PAGE_SIZE);
    if (result.meta.total_items !== first.meta.total_items) throw new Error("Pagination lowongan berubah selama snapshot");
    append(result.data);
  }
  if (accumulatedRows !== first.meta.total_items || seenIds.size !== first.meta.total_items) {
    throw new Error("Snapshot lowongan tidak lengkap");
  }
  return jobs;
}

export async function getMikaJobs(params: MikaJobQueryParams = {}): Promise<MikaJobsResponse> {
  const paging = paginationParams(params);
  const baseUrl = getMikaApiBaseUrl();
  if (baseUrl) {
    try {
      const result = await fetchJobsPage(baseUrl, params, paging.page, paging.per_page);
      let jobs = publicJobs(result.data, baseUrl);
      let meta = result.meta;
      if (meta.total_pages > 1 || jobs.length !== result.data.length || new Set(jobs.map((job) => String(Number(job.id)))).size !== jobs.length) {
        // Defense-in-depth can remove foreign/closed/malformed rows. Reconcile
        // the bounded full result BEFORE pagination, rather than trust counts
        // for dropped records or expose empty/miscounted intermediate pages.
        const snapshot = await publicSnapshot(baseUrl, params);
        const pages = Math.max(1, Math.ceil(snapshot.length / paging.per_page));
        jobs = snapshot.slice((paging.page - 1) * paging.per_page, paging.page * paging.per_page);
        meta = { current_page: paging.page, per_page: paging.per_page, total_items: snapshot.length, total_pages: pages,
          has_next: paging.page < pages, has_prev: paging.page > 1 };
      }
      return { success: true, data: jobs, meta, message: "Lowongan PT Autentik Karya Analitika berhasil dimuat." };
    } catch {
      console.warn("[AKA Careers] Listing tidak tersedia atau payload tidak valid.");
    }
  }
  return { success: false, data: [], meta: emptyMeta(paging),
    message: "Informasi lowongan sedang tidak tersedia. Silakan coba lagi beberapa saat." };
}

/** Complete, scoped snapshot for sitemap; any page failure discards the result. */
export async function getAllPublicMikaJobs(): Promise<MikaJob[] | null> {
  const baseUrl = getMikaApiBaseUrl();
  if (!baseUrl) return null;
  try { return await publicSnapshot(baseUrl, {}); }
  catch { return null; }
}

export const getMikaJobDetail = cache(async (id: number | string): Promise<MikaJobDetailResult> => {
  if (!isJobId(id)) return { status: "not_found" };
  const baseUrl = getMikaApiBaseUrl();
  if (!baseUrl) return { status: "unavailable", reason: "configuration" };
  const url = `${baseUrl}/jobs/${id}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getMikaApiHeaders(baseUrl),
      signal: AbortSignal.timeout(MIKA_JOB_DETAIL_TIMEOUT_MS),
      next: { revalidate: 60 },
    });

    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) {
      console.warn(`[Mika Career] Job detail upstream unavailable (id=${id}, status=${response.status})`);
      return { status: "unavailable", reason: "upstream" };
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      console.warn(`[Mika Career] Job detail response is not valid JSON (id=${id})`);
      return { status: "unavailable", reason: "invalid_response" };
    }

    if (!isRecord(json) || json.success !== true) {
      console.warn(`[Mika Career] Job detail payload is invalid (id=${id})`);
      return { status: "unavailable", reason: "invalid_response" };
    }
    // Foreign, missing ownership or uncertain availability is NOT a legacy
    // lookup opportunity. Nothing from such a record is serialized publicly.
    if (!isPublicAkaJob(json.data)) return { status: "not_found" };
    if (!isMikaJob(json.data) || Number(json.data.id) !== Number(id)) {
      return { status: "unavailable", reason: "invalid_response" };
    }

    const rawDetail = json.data as MikaJobDetail;
    const relatedCandidate: unknown = json.related_jobs ?? rawDetail.related_jobs;
    if (
      relatedCandidate !== undefined &&
      !Array.isArray(relatedCandidate)
    ) {
      console.warn(`[Mika Career] Related job payload is invalid (id=${id})`);
      return { status: "unavailable", reason: "invalid_response" };
    }

    const normalizedJob = normalizeMikaJob(rawDetail, baseUrl);
    return {
      status: "found",
      job: {
        ...normalizedJob,
        related_jobs: Array.isArray(relatedCandidate) ? publicJobs(relatedCandidate, baseUrl) : undefined,
      },
    };
  } catch (error) {
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.warn(`[Mika Career] Job detail request failed (id=${id}, reason=${isTimeout ? "timeout" : "network"})`);
    return { status: "unavailable", reason: isTimeout ? "timeout" : "network" };
  }
});

export async function getMikaDepartments(): Promise<MikaDepartment[]> {
  const jobs = await getAllPublicMikaJobs();
  return jobs ? getDepartmentsFromJobs(jobs) : [];
}

export async function getMikaCompanies(): Promise<MikaCompany[]> {
  const jobs = await getAllPublicMikaJobs();
  return jobs ? getCompaniesFromJobs(jobs) : [];
}
