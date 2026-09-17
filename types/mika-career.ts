export interface MikaSalary {
  min: number | null;
  max: number | null;
  currency: string;
  formatted: string;
}

export interface MikaDeadlineBadge {
  status: string;
  label: string;
  color: string;
}

export interface MikaDeadlineInfo {
  is_expired: boolean;
  is_active: boolean;
  days_remaining: number;
  badge: MikaDeadlineBadge;
}

export interface MikaCompany {
  id: number | string;
  name: string;
  logo: string | null;
  city: string;
}

export interface MikaDepartment {
  id: number | string;
  name: string;
  code?: string;
  jobs_count?: number;
}

export interface MikaEducationRequirements {
  degrees: string[];
  majors: string[];
}

export interface MikaJob {
  id: number | string;
  title: string;
  employment_type: string; // "Full-time" | "Internship" | "Part-time" | "Contract" | string
  location: string;
  salary: MikaSalary;
  quota: number;
  deadline: string;
  deadline_info: MikaDeadlineInfo;
  company: MikaCompany;
  department: MikaDepartment;
  education_requirements?: MikaEducationRequirements;
  description?: string;
  responsibilities?: string[] | string;
  requirements?: string[] | string;
  benefits?: string[] | string;
  skills?: string[];
  apply_url?: string | null;
  created_at?: string;
}

export interface MikaJobDetail extends MikaJob {
  related_jobs?: MikaJob[];
}

export interface MikaPaginationMeta {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface MikaJobsResponse {
  success: boolean;
  data: MikaJob[];
  meta: MikaPaginationMeta;
  message?: string;
}

export interface MikaJobDetailResponse {
  success: boolean;
  data: MikaJobDetail;
  message?: string;
}

export interface MikaDepartmentsResponse {
  success: boolean;
  data: MikaDepartment[];
  message?: string;
}

export interface MikaJobQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  q?: string;
  department_id?: number | string;
  company_id?: number | string;
  location?: string;
  employment_type?: string;
}
