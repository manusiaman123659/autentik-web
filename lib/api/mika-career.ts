import type { CareerPosition } from "@/lib/data/careers";
import type {
  MikaCompany,
  MikaDepartment,
  MikaJob,
  MikaJobDetail,
  MikaJobQueryParams,
  MikaJobsResponse,
} from "@/types/mika-career";

const DEFAULT_API_BASE_URL = "https://heat-germicide-clasp.ngrok-free.dev/api/v1";

export const MIKA_API_DEFAULT_HEADERS: HeadersInit = {
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
};

export function getMikaApiBaseUrl(): string {
  const envUrl = process.env.MIKA_API_BASE_URL;
  return envUrl?.trim() ? envUrl.replace(/\/+$/, "") : DEFAULT_API_BASE_URL;
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

  const queryString = searchParams.toString();
  const url = `${getMikaApiBaseUrl()}/jobs${queryString ? `?${queryString}` : ""}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: MIKA_API_DEFAULT_HEADERS,
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data)) {
        const perPage = params.per_page ?? 10;
        return {
          success: true,
          data: json.data as MikaJob[],
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
  const url = `${getMikaApiBaseUrl()}/jobs/${id}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: MIKA_API_DEFAULT_HEADERS,
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });
    if (response.ok) {
      const json = await response.json();
      if (json?.data) {
        return {
          ...(json.data as MikaJobDetail),
          related_jobs: Array.isArray(json.related_jobs) ? json.related_jobs : json.data.related_jobs,
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
  try {
    const response = await fetch(`${baseUrl}/departments`, {
      headers: MIKA_API_DEFAULT_HEADERS,
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
      headers: MIKA_API_DEFAULT_HEADERS,
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
  try {
    const response = await fetch(`${getMikaApiBaseUrl()}/jobs?per_page=100`, {
      headers: MIKA_API_DEFAULT_HEADERS,
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 },
    });
    if (response.ok) {
      const json = await response.json();
      if (Array.isArray(json?.data)) return getCompaniesFromJobs(json.data);
    }
  } catch {
    // Consumer derives options from the resolved fallback jobs.
  }
  return [];
}
