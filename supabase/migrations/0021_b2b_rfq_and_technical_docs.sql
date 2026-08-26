-- 0021_b2b_rfq_and_technical_docs.sql
-- Fitur B2B: Request for Quotation (RFQ), Dokumen Teknis, Lead Capture

-- ---------------------------------------------------------------------------
-- 1. Tabel technical_documents
-- ---------------------------------------------------------------------------
create table if not exists public.technical_documents (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.products(id) on delete cascade,
  title text not null,
  file_type text not null check (file_type in ('datasheet','manual','cad_3d','certificate','software_firmware')),
  file_url text not null,
  file_size_kb integer,
  requires_lead boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_techdocs_product on public.technical_documents (product_id);

alter table public.technical_documents enable row level security;

drop policy if exists "techdocs_public_select" on public.technical_documents;
create policy "techdocs_public_select" on public.technical_documents
  for select using (true);

drop policy if exists "techdocs_staff_all" on public.technical_documents;
create policy "techdocs_staff_all" on public.technical_documents
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- 2. Tabel quotation_requests (RFQ)
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_requests (
  id uuid primary key default gen_random_uuid(),
  rfq_code text unique not null,
  product_id text references public.products(id) on delete set null,
  company_name text not null,
  pic_name text not null,
  email text not null,
  phone_number text not null,
  estimated_quantity integer not null check (estimated_quantity > 0),
  target_date date,
  notes text,
  status text not null default 'pending' check (status in ('pending','reviewed','quoted','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_rfq_status on public.quotation_requests (status);
create index if not exists idx_rfq_created on public.quotation_requests (created_at desc);

alter table public.quotation_requests enable row level security;

drop policy if exists "rfq_public_insert" on public.quotation_requests;
create policy "rfq_public_insert" on public.quotation_requests
  for insert with check (true);

drop policy if exists "rfq_staff_select" on public.quotation_requests;
create policy "rfq_staff_select" on public.quotation_requests
  for select to authenticated
  using (public.is_staff());

drop policy if exists "rfq_staff_update" on public.quotation_requests;
create policy "rfq_staff_update" on public.quotation_requests
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

drop policy if exists "rfq_staff_delete" on public.quotation_requests;
create policy "rfq_staff_delete" on public.quotation_requests
  for delete to authenticated
  using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 3. Tabel document_download_leads
-- ---------------------------------------------------------------------------
create table if not exists public.document_download_leads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.technical_documents(id) on delete cascade,
  full_name text not null,
  work_email text not null,
  company_name text not null,
  phone_number text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_docleads_doc on public.document_download_leads (document_id);

alter table public.document_download_leads enable row level security;

drop policy if exists "docleads_public_insert" on public.document_download_leads;
create policy "docleads_public_insert" on public.document_download_leads
  for insert with check (true);

drop policy if exists "docleads_staff_select" on public.document_download_leads;
create policy "docleads_staff_select" on public.document_download_leads
  for select to authenticated
  using (public.is_staff());

drop policy if exists "docleads_staff_all" on public.document_download_leads;
create policy "docleads_staff_all" on public.document_download_leads
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff());
