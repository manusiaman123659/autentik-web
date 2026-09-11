import type {
  MikaJob,
  MikaJobDetail,
  MikaDepartment,
  MikaJobsResponse,
  MikaJobQueryParams,
} from "@/types/mika-career";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export function getMikaApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  return (envUrl && envUrl.trim()) ? envUrl.replace(/\/+$/, "") : DEFAULT_API_BASE_URL;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data (Fallback aman saat Backend Laravel 13 belum aktif)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_MIKA_DEPARTMENTS: MikaDepartment[] = [
  { id: 1, name: "Engineering & IT", code: "ENG", jobs_count: 3 },
  { id: 2, name: "Hardware & IoT", code: "IOT", jobs_count: 1 },
  { id: 3, name: "Product & Design", code: "PRD", jobs_count: 1 },
  { id: 4, name: "Sales & Business Development", code: "SLS", jobs_count: 1 },
  { id: 5, name: "Operations & Support", code: "OPS", jobs_count: 1 },
];

export const MOCK_MIKA_JOBS: MikaJobDetail[] = [
  {
    id: 1,
    title: "Senior Fullstack Developer",
    employment_type: "Full-time",
    location: "Jakarta (Hybrid)",
    salary: {
      min: 12000000,
      max: 18000000,
      currency: "IDR",
      formatted: "Rp 12.000.000 - Rp 18.000.000",
    },
    quota: 2,
    deadline: "2026-09-23",
    deadline_info: {
      is_expired: false,
      is_active: true,
      days_remaining: 14,
      badge: { status: "open", label: "Batas: 23 Sep 2026", color: "emerald" },
    },
    company: {
      id: 1,
      name: "PT Teknologi Nusantara",
      logo: null,
      city: "Jakarta Selatan",
    },
    department: { id: 1, name: "Engineering & IT" },
    education_requirements: {
      degrees: ["S1 / D4 Teknik Informatika", "Sistem Informasi", "Ilmu Komputer"],
      majors: ["Informatika", "Software Engineering"],
    },
    description:
      "Bertanggung jawab dalam merancang arsitektur web berskala besar, mengintegrasikan sistem Next.js frontend dengan backend Laravel API berkinerja tinggi, serta menjaga kualitas kode dan pipeline CI/CD.",
    responsibilities: [
      "Mengembangkan antarmuka modern yang cepat dan responsif menggunakan Next.js App Router dan React 19.",
      "Mendesain arsitektur RESTful API dan database relational (PostgreSQL / MySQL) yang efisien.",
      "Mengoptimalkan performa aplikasi, SEO, web vitals, dan standar keamanan data.",
      "Bekerjasama erat dengan tim Product, UI/UX, dan DevOps dalam sprint agile.",
    ],
    requirements: [
      "Pengalaman kerja minimal 3+ tahun di pengembangan fullstack web.",
      "Menguasai TypeScript, Next.js, Tailwind CSS, dan PHP Laravel.",
      "Familiar dengan arsitektur REST API, GraphQL, caching (Redis), dan relational database.",
      "Memiliki pemahaman mendalam tentang state management dan SSR/SSG patterns.",
      "Keahlian komunikasi dan problem solving yang kuat.",
    ],
    benefits: [
      "Gaji kompetitif + BPJS Ketenagakerjaan & Kesehatan.",
      "Skema kerja hybrid fleksibel (WFO/WFH).",
      "Tunjangan perangkat kerja dan internet bulanan.",
      "Budget pengembangan karir & sertifikasi teknologi tahunan.",
    ],
    skills: ["Next.js", "TypeScript", "React", "Laravel", "PostgreSQL", "Tailwind CSS", "Docker"],
    apply_url: null,
  },
  {
    id: 2,
    title: "IoT Hardware & Embedded Firmware Engineer",
    employment_type: "Full-time",
    location: "Bandung (On-site)",
    salary: {
      min: 9000000,
      max: 14000000,
      currency: "IDR",
      formatted: "Rp 9.000.000 - Rp 14.000.000",
    },
    quota: 1,
    deadline: "2026-09-30",
    deadline_info: {
      is_expired: false,
      is_active: true,
      days_remaining: 20,
      badge: { status: "open", label: "Batas: 30 Sep 2026", color: "emerald" },
    },
    company: {
      id: 2,
      name: "PT Autentik Karya Analitika",
      logo: null,
      city: "Bandung",
    },
    department: { id: 2, name: "Hardware & IoT" },
    education_requirements: {
      degrees: ["S1 / D4 Teknik Elektro", "Teknik Mekatronika", "Teknik Fisika"],
      majors: ["Sistem Tertanam", "Elektronika Industri"],
    },
    description:
      "Merancang, memprogram, dan menguji modul instrumen sensor IoT pintar (misal sensor suhu, kelembapan, monitoring lingkungan) untuk aplikasi industri dan laboratorium.",
    responsibilities: [
      "Mengembangkan firmware microcontroller (ESP32, STM32, Nordic nRF) berbasis C/C++ dan RTOS.",
      "Mendesain skema PCB dan layout hardware sensor industri dengan standar EMC/EMI.",
      "Melakukan integrasi protokol transmisi data: LoRaWAN, MQTT, Modbus, dan BLE.",
      "Melakukan validasi uji lapangan dan kalibrasi akurasi sensor presisi.",
    ],
    requirements: [
      "Pengalaman 2+ tahun dalam embedded programming C/C++.",
      "Pengalaman merancang hardware PCB menggunakan KiCAD / Altium.",
      "Pemahaman mendalam mengenai protokol komunikasi I2C, SPI, UART, RS-485 Modbus.",
      "Terbiasa dengan firmware debugging dan oscilloscope.",
    ],
    benefits: [
      "Akses lab riset hardware dan peralatan instrumentasi lengkap.",
      "Asuransi kesehatan swasta.",
      "Tunjangan makan dan lembur yang transparan.",
    ],
    skills: ["C/C++", "ESP32", "STM32", "PCB Design", "MQTT", "LoRaWAN", "Modbus"],
    apply_url: null,
  },
  {
    id: 3,
    title: "Frontend Engineer Intern (Next.js & React)",
    employment_type: "Internship",
    location: "Jakarta (Remote)",
    salary: {
      min: 3500000,
      max: 5000000,
      currency: "IDR",
      formatted: "Rp 3.500.000 - Rp 5.000.000",
    },
    quota: 3,
    deadline: "2026-10-15",
    deadline_info: {
      is_expired: false,
      is_active: true,
      days_remaining: 35,
      badge: { status: "open", label: "Batas: 15 Okt 2026", color: "blue" },
    },
    company: {
      id: 1,
      name: "PT Teknologi Nusantara",
      logo: null,
      city: "Jakarta Selatan",
    },
    department: { id: 1, name: "Engineering & IT" },
    education_requirements: {
      degrees: ["Mahasiswa Tingkat Akhir / Fresh Graduate S1/D3/D4"],
      majors: ["Informatika", "Sistem Informasi", "Teknik Komputer"],
    },
    description:
      "Program magang intensif 6 bulan untuk talenta muda yang ingin mengasah keterampilan dalam ekosistem Next.js modern, Tailwind CSS, animasi interaktif, dan integrasi REST API dunia nyata.",
    responsibilities: [
      "Membantu membangun komponen antarmuka web yang rapi dan dapat digunakan ulang.",
      "Mengimplementasikan integrasi REST API backend dengan penanganan error yang baik.",
      "Mempelajari dan mempraktekkan best practice Web Accessibility dan Performance.",
    ],
    requirements: [
      "Memahami dasar-dasar HTML, CSS, JavaScript modern (ES6+), dan React.",
      "Tertarik mendalami Next.js App Router dan TypeScript.",
      "Memiliki portofolio proyek web sederhana (repo GitHub / live demo).",
      "Bersedia magang penuh waktu selama 6 bulan (WFH).",
    ],
    benefits: [
      "Uang saku bulanan kompetitif.",
      "Mentorship 1-on-1 bersama Senior Engineer.",
      "Sertifikat magang resmi dan peluang konversi ke karyawan tetap.",
    ],
    skills: ["React", "JavaScript", "HTML/CSS", "Tailwind CSS", "Git"],
    apply_url: null,
  },
  {
    id: 4,
    title: "Technical Sales & Product Specialist",
    employment_type: "Full-time",
    location: "Surabaya (Field)",
    salary: {
      min: 8000000,
      max: 13000000,
      currency: "IDR",
      formatted: "Rp 8.000.000 - Rp 13.000.000",
    },
    quota: 2,
    deadline: "2026-10-05",
    deadline_info: {
      is_expired: false,
      is_active: true,
      days_remaining: 25,
      badge: { status: "open", label: "Batas: 05 Okt 2026", color: "emerald" },
    },
    company: {
      id: 2,
      name: "PT Autentik Karya Analitika",
      logo: null,
      city: "Surabaya",
    },
    department: { id: 4, name: "Sales & Business Development" },
    education_requirements: {
      degrees: ["S1 Semua Jurusan Sains / Teknik / Manajemen"],
      majors: ["Kimia", "Biologi", "Teknik Industri", "Farmasi"],
    },
    description:
      "Menangani konsultasi teknis kebutuhan instrumen laboratorium dan perangkat IoT untuk klien industri manufaktur, farmasi, universitas, dan lembaga riset di wilayah Jawa Timur & sekitarnya.",
    responsibilities: [
      "Membangun hubungan kemitraan dengan klien B2B, lab riset, dan institusi pendidikan.",
      "Memberikan presentasi teknis solusi produk instrumen analisis dan sistem monitoring.",
      "Menyusun penawaran harga (RFQ) dan memandu proses tender pengadaan.",
    ],
    requirements: [
      "Pengalaman 1-3 tahun di bidang B2B Technical Sales instrumen laboratorium / peralatan industri.",
      "Memiliki kemampuan komunikasi interpersonal dan negosiasi yang luwes.",
      "Bersedia melakukan dinas lapangan (kunjungan klien wilayah Jawa Timur).",
    ],
    benefits: [
      "Gaji pokok + insentif komisi penjualan tanpa batas.",
      "Tunjangan transportasi dan fasilitas dinas.",
      "Asuransi kesehatan keluarga.",
    ],
    skills: ["B2B Sales", "Negotiation", "Technical Presentation", "CRM"],
    apply_url: null,
  },
  {
    id: 5,
    title: "DevOps & Cloud Infrastructure Specialist",
    employment_type: "Contract",
    location: "Jakarta (Hybrid)",
    salary: {
      min: 14000000,
      max: 20000000,
      currency: "IDR",
      formatted: "Rp 14.000.000 - Rp 20.000.000",
    },
    quota: 1,
    deadline: "2026-09-28",
    deadline_info: {
      is_expired: false,
      is_active: true,
      days_remaining: 18,
      badge: { status: "open", label: "Batas: 28 Sep 2026", color: "emerald" },
    },
    company: {
      id: 1,
      name: "PT Teknologi Nusantara",
      logo: null,
      city: "Jakarta Pusat",
    },
    department: { id: 1, name: "Engineering & IT" },
    education_requirements: {
      degrees: ["S1 Teknik Informatika / Ilmu Komputer / Teknik Telekomunikasi"],
      majors: ["Cloud Computing", "Jaringan & Keamanan Sistem"],
    },
    description:
      "Mengelola infrastruktur cloud server berkinerja tinggi, mengimplementasikan pipeline CI/CD otomatis, containerization Docker/Kubernetes, serta pengawasan keandalan sistem (monitoring & alerts).",
    responsibilities: [
      "Merancang dan mengelola arsitektur server di Cloudflare, AWS, atau VPS dedicated.",
      "Membangun automasi build dan deployment otomatis menggunakan GitHub Actions.",
      "Menjamin uptime sistem 99.9%, disaster recovery, dan proteksi keamanan jaringan.",
    ],
    requirements: [
      "Pengalaman minimal 3 tahun mengelola Linux Server dan infrastruktur cloud.",
      "Mahir dalam Docker, CI/CD pipelines, Nginx reverse proxy, dan firewall.",
      "Memiliki pemahaman mengenai monitoring tools (Prometheus, Grafana, Sentry).",
    ],
    benefits: [
      "Kompensasi kontrak premium bulanan.",
      "Waktu kerja fleksibel.",
      "Peluang perpanjangan jangka panjang.",
    ],
    skills: ["Docker", "Linux", "CI/CD", "AWS", "Cloudflare", "Nginx", "PostgreSQL"],
    apply_url: null,
  },
];

// Helper menyambungkan related_jobs ke detail
function attachRelatedJobs(job: MikaJobDetail): MikaJobDetail {
  const related = MOCK_MIKA_JOBS.filter(
    (j) => j.id !== job.id && (j.department.id === job.department.id || j.employment_type === job.employment_type)
  ).slice(0, 3);
  return { ...job, related_jobs: related };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Fetchers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mengambil daftar lowongan dengan filter query params
 */
export async function getMikaJobs(params: MikaJobQueryParams = {}): Promise<MikaJobsResponse> {
  const baseUrl = getMikaApiBaseUrl();
  const searchParams = new URLSearchParams();

  if (params.page) searchParams.set("page", String(params.page));
  if (params.per_page) searchParams.set("per_page", String(params.per_page));
  if (params.search || params.q) {
    searchParams.set("search", (params.search || params.q || "").trim());
  }
  if (params.department_id && params.department_id !== "all") {
    searchParams.set("department_id", String(params.department_id));
  }
  if (params.location && params.location !== "all") {
    searchParams.set("location", params.location.trim());
  }
  if (params.employment_type && params.employment_type !== "all") {
    searchParams.set("employment_type", params.employment_type.trim());
  }

  const queryString = searchParams.toString();
  const url = `${baseUrl}/jobs${queryString ? `?${queryString}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000), // timeout 4s
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        return {
          success: true,
          data: json.data as MikaJob[],
          meta: json.meta ?? {
            current_page: params.page ?? 1,
            per_page: params.per_page ?? 10,
            total_items: json.data.length,
            total_pages: Math.ceil(json.data.length / (params.per_page ?? 10)) || 1,
            has_next: false,
            has_prev: false,
          },
          message: "Data berhasil dimuat dari REST API Laravel",
        };
      }
    }
  } catch (err) {
    console.warn(`[Mika Career] Live API fetch failed (${url}), using resilient fallback mock data:`, err instanceof Error ? err.message : String(err));
  }

  // Fallback Mock Filtering
  let filtered = [...MOCK_MIKA_JOBS];

  const searchKeyword = (params.search || params.q || "").toLowerCase().trim();
  if (searchKeyword) {
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(searchKeyword) ||
        j.company.name.toLowerCase().includes(searchKeyword) ||
        j.department.name.toLowerCase().includes(searchKeyword) ||
        j.location.toLowerCase().includes(searchKeyword) ||
        (j.skills && j.skills.some((s) => s.toLowerCase().includes(searchKeyword)))
    );
  }

  if (params.department_id && params.department_id !== "all") {
    filtered = filtered.filter((j) => String(j.department.id) === String(params.department_id));
  }

  if (params.employment_type && params.employment_type !== "all") {
    filtered = filtered.filter(
      (j) => j.employment_type.toLowerCase() === params.employment_type!.toLowerCase()
    );
  }

  if (params.location && params.location !== "all") {
    filtered = filtered.filter((j) =>
      j.location.toLowerCase().includes(params.location!.toLowerCase())
    );
  }

  const page = Number(params.page) || 1;
  const perPage = Number(params.per_page) || 10;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / perPage) || 1;
  const startIndex = (page - 1) * perPage;
  const paginatedData = filtered.slice(startIndex, startIndex + perPage);

  return {
    success: true,
    data: paginatedData,
    meta: {
      current_page: page,
      per_page: perPage,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
    message: "Fallback Mock Data (Backend Laravel sedang offline)",
  };
}

/**
 * Mengambil detail satu lowongan beserta related_jobs
 */
export async function getMikaJobDetail(id: number | string): Promise<MikaJobDetail | null> {
  const baseUrl = getMikaApiBaseUrl();
  const url = `${baseUrl}/jobs/${id}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const json = await res.json();
      if (json && json.data) {
        const job = json.data as MikaJobDetail;
        if (Array.isArray(json.related_jobs)) {
          job.related_jobs = json.related_jobs;
        }
        return job;
      }
    }
  } catch (err) {
    console.warn(`[Mika Career] Job detail API failed (${url}), using fallback:`, err instanceof Error ? err.message : String(err));
  }

  // Fallback Mock
  const targetId = Number(id);
  const found = MOCK_MIKA_JOBS.find(
    (j) => j.id === targetId || String(j.id) === String(id)
  );

  if (!found) {
    // Jika mencari berdasarkan slug/id yang tidak cocok, ambil item pertama sebagai demo
    if (MOCK_MIKA_JOBS.length > 0) {
      return attachRelatedJobs(MOCK_MIKA_JOBS[0]);
    }
    return null;
  }

  return attachRelatedJobs(found);
}

/**
 * Mengambil daftar departemen untuk opsi dropdown filter
 */
export async function getMikaDepartments(): Promise<MikaDepartment[]> {
  const baseUrl = getMikaApiBaseUrl();
  const url = `${baseUrl}/departments`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        return json.data as MikaDepartment[];
      }
    }
  } catch (err) {
    console.warn(`[Mika Career] Departments API endpoint failed (${url}), attempting dynamic extraction from jobs:`, err instanceof Error ? err.message : String(err));
  }

  // Coba ekstraksi departemen dari data live /jobs jika endpoint /departments bermasalah
  try {
    const jobsRes = await fetch(`${baseUrl}/jobs?per_page=50`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (jobsRes.ok) {
      const jobsJson = await jobsRes.json();
      if (Array.isArray(jobsJson.data)) {
        const deptMap = new Map<number, MikaDepartment>();
        for (const item of jobsJson.data) {
          if (item.department && item.department.id) {
            deptMap.set(item.department.id, {
              id: item.department.id,
              name: item.department.name,
            });
          }
        }
        if (deptMap.size > 0) {
          return Array.from(deptMap.values());
        }
      }
    }
  } catch {
    // abaikan error dan gunakan mock
  }

  return MOCK_MIKA_DEPARTMENTS;
}
