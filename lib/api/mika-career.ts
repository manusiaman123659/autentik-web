import type { CareerPosition } from "@/lib/data/careers";
import type {
  MikaCompany,
  MikaDepartment,
  MikaJob,
  MikaJobDetail,
  MikaJobQueryParams,
  MikaJobsResponse,
} from "@/types/mika-career";
import { getSafeExternalUrl, isLocalHostname, isNgrokHostname } from "@/lib/public-url";

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
    ...company,
    logo: normalizeMikaLogoUrl(company.logo, baseUrl),
  };
}

export function normalizeMikaJob(
  job: MikaJob,
  baseUrl?: string | null,
): MikaJob {
  return {
    ...job,
    company: normalizeMikaCompany(job.company, baseUrl),
  };
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

export function legacyCareersToMikaJobs(careers: CareerPosition[]): MikaJob[] {
  return careers.map((career) => ({
    id: career.slug,
    title: career.title,
    employment_type: career.type === "Magang" ? "Internship" : career.type,
    location: career.location,
    salary: { min: null, max: null, currency: "IDR", formatted: "" },
    quota: 0,
    deadline: "",
    deadline_info: {
      is_expired: false,
      is_active: true,
      days_remaining: 0,
      badge: { status: "open", label: "Posisi terbuka", color: "emerald" },
    },
    company: {
      id: "legacy-aka",
      name: "PT Autentik Karya Analitika",
      logo: null,
      city: "Semarang",
    },
    department: {
      id: `legacy-${career.department.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: career.department,
    },
    description: career.summary || career.description.trim(),
    responsibilities: career.responsibilities,
    requirements: career.requirements,
    benefits: career.benefits,
    apply_url: null,
  }));
}

export function filterMikaJobs(
  jobs: MikaJob[],
  params: MikaJobQueryParams = {},
  message = "Data lowongan dimuat dari sumber cadangan AKA",
): MikaJobsResponse {
  let filtered = [...jobs];
  const searchKeyword = (params.search || params.q || "").toLowerCase().trim();

  if (searchKeyword) {
    filtered = filtered.filter(
      (job) =>
        job.title.toLowerCase().includes(searchKeyword) ||
        job.company.name.toLowerCase().includes(searchKeyword) ||
        job.department.name.toLowerCase().includes(searchKeyword) ||
        job.location.toLowerCase().includes(searchKeyword) ||
        job.skills?.some((skill) => skill.toLowerCase().includes(searchKeyword)),
    );
  }
  if (params.department_id && params.department_id !== "all") {
    filtered = filtered.filter(
      (job) => String(job.department.id) === String(params.department_id),
    );
  }
  if (params.company_id && params.company_id !== "all") {
    filtered = filtered.filter((job) => String(job.company.id) === String(params.company_id));
  }
  if (params.employment_type && params.employment_type !== "all") {
    filtered = filtered.filter(
      (job) => job.employment_type.toLowerCase() === params.employment_type!.toLowerCase(),
    );
  }
  if (params.location && params.location !== "all") {
    filtered = filtered.filter((job) =>
      job.location.toLowerCase().includes(params.location!.toLowerCase()),
    );
  }

  const page = Number(params.page) || 1;
  const perPage = Number(params.per_page) || 10;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  const startIndex = (page - 1) * perPage;

  return {
    success: true,
    data: filtered.slice(startIndex, startIndex + perPage),
    meta: {
      current_page: page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
    message,
  };
}

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

export async function getMikaJobs(params: MikaJobQueryParams = {}): Promise<MikaJobsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.search || params.q) searchParams.set("search", (params.search || params.q || "").trim());
  if (params.department_id && params.department_id !== "all") {
    searchParams.set("department_id", String(params.department_id));
  }
  if (params.company_id && params.company_id !== "all") {
    searchParams.set("company_id", String(params.company_id));
  }
  if (params.location && params.location !== "all") searchParams.set("location", params.location.trim());
  if (params.employment_type && params.employment_type !== "all") {
    searchParams.set("employment_type", params.employment_type.trim());
  }

  const baseUrl = getMikaApiBaseUrl();
  if (!baseUrl) {
    return {
      success: false,
      data: [],
      meta: emptyMeta(params),
      message: "Mika Career API sedang tidak tersedia",
    };
  }

  const queryString = searchParams.toString();
  const url = `${baseUrl}/jobs${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getMikaApiHeaders(baseUrl),
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data)) {
        const perPage = params.per_page ?? 10;
        const normalizedJobs = json.data.map((job: MikaJob) => normalizeMikaJob(job, baseUrl));
        return {
          success: true,
          data: normalizedJobs,
          meta: json.meta ?? {
            current_page: params.page ?? 1,
            per_page: perPage,
            total_items: json.data.length,
            total_pages: Math.ceil(json.data.length / perPage) || 1,
            has_next: false,
            has_prev: false,
          },
          message: "Data berhasil dimuat dari Mika Career",
        };
      }
    }
  } catch (error) {
    console.warn(
      `[Mika Career] Live API fetch failed (${url}):`,
      error instanceof Error ? error.message : String(error),
    );
  }

  return {
    success: false,
    data: [],
    meta: emptyMeta(params),
    message: "Mika Career API sedang tidak tersedia",
  };
}

export async function getMikaJobDetail(id: number | string): Promise<MikaJobDetail | null> {
  if (!/^\d+$/.test(String(id))) return null;
  const baseUrl = getMikaApiBaseUrl();
  if (!baseUrl) return null;
  const url = `${baseUrl}/jobs/${id}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getMikaApiHeaders(baseUrl),
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (response.ok) {
      const json = await response.json();
      if (json?.data) {
        const rawDetail = json.data as MikaJobDetail;
        const normalizedJob = normalizeMikaJob(rawDetail, baseUrl);
        const rawRelated = Array.isArray(json.related_jobs)
          ? json.related_jobs
          : Array.isArray(rawDetail.related_jobs)
            ? rawDetail.related_jobs
            : undefined;

        return {
          ...normalizedJob,
          related_jobs: rawRelated?.map((relJob: MikaJob) => normalizeMikaJob(relJob, baseUrl)),
        };
      }
    }
  } catch (error) {
    console.warn(
      `[Mika Career] Job detail API failed (${url}):`,
      error instanceof Error ? error.message : String(error),
    );
  }
  return null;
}

export async function getMikaDepartments(): Promise<MikaDepartment[]> {
  const baseUrl = getMikaApiBaseUrl();
  if (!baseUrl) return [];
  try {
    const response = await fetch(`${baseUrl}/departments`, {
      headers: getMikaApiHeaders(baseUrl),
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data) && json.data.length > 0) return json.data;
    }
  } catch {
    // Try deriving departments from live jobs below.
  }

  try {
    const response = await fetch(`${baseUrl}/jobs?per_page=50`, {
      headers: getMikaApiHeaders(baseUrl),
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data)) return getDepartmentsFromJobs(json.data);
    }
  } catch {
    // Consumer derives options from the resolved fallback jobs.
  }
  return [];
}

export async function getMikaCompanies(): Promise<MikaCompany[]> {
  const baseUrl = getMikaApiBaseUrl();
  if (!baseUrl) return [];
  try {
    const response = await fetch(`${baseUrl}/jobs?per_page=100`, {
      headers: getMikaApiHeaders(baseUrl),
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data)) {
        const normalizedJobs = json.data.map((job: MikaJob) => normalizeMikaJob(job, baseUrl));
        return getCompaniesFromJobs(normalizedJobs);
      }
    }
  } catch {
    // Consumer derives options from the resolved fallback jobs.
  }
  return [];
}
