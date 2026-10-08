-- TecFlow Dia 5: portal contábil, vínculos autorizados e solicitações de documentos.
-- Aplicar manualmente após 0015.
create table if not exists public.accounting_firms (
  id uuid primary key default gen_random_uuid(), legal_name text not null, document text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.accounting_firm_members (
  id uuid primary key default gen_random_uuid(), accounting_firm_id uuid not null references public.accounting_firms(id) on delete cascade, profile_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null default 'ACCOUNTANT', created_at timestamptz not null default now(), unique (accounting_firm_id, profile_id)
);
create table if not exists public.accounting_client_links (
  id uuid primary key default gen_random_uuid(), accounting_firm_id uuid not null references public.accounting_firms(id) on delete cascade, company_id uuid not null references public.companies(id) on delete cascade,
  status text not null default 'PENDING', invited_by uuid references public.profiles(id) on delete set null, accepted_at timestamptz, created_at timestamptz not null default now(), unique (accounting_firm_id, company_id)
);
create table if not exists public.accounting_contacts (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, email text not null, phone text, firm_name text,
  status text not null default 'PENDING', invited_at timestamptz not null default now(), accepted_at timestamptz, created_at timestamptz not null default now(), unique (company_id, email)
);
create table if not exists public.accounting_contact_permissions (
  id uuid primary key default gen_random_uuid(), accounting_contact_id uuid not null references public.accounting_contacts(id) on delete cascade, module_code text not null, enabled boolean not null default false, unique (accounting_contact_id, module_code)
);
create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, accounting_firm_id uuid references public.accounting_firms(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null, title text not null, description text, category text not null default 'OUTRO', due_date date, status text not null default 'REQUESTED', uploaded_document_id uuid references public.accounting_documents(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.accounting_firm_members enable row level security;
alter table public.accounting_client_links enable row level security;
alter table public.accounting_contacts enable row level security;
alter table public.accounting_contact_permissions enable row level security;
alter table public.document_requests enable row level security;
create policy accounting_firms_read on public.accounting_firms for select to authenticated using (exists (select 1 from public.accounting_firm_members fm where fm.accounting_firm_id = id and fm.profile_id = auth.uid()) or exists (select 1 from public.accounting_client_links cl where cl.accounting_firm_id = id and public.is_company_member(cl.company_id)));
create policy accounting_firm_members_read on public.accounting_firm_members for select to authenticated using (profile_id = auth.uid() or exists (select 1 from public.accounting_client_links cl where cl.accounting_firm_id = accounting_firm_id and public.is_company_member(cl.company_id)));
create policy accounting_client_links_read on public.accounting_client_links for select to authenticated using (public.is_company_member(company_id) or exists (select 1 from public.accounting_firm_members fm where fm.accounting_firm_id = accounting_firm_id and fm.profile_id = auth.uid()));
create policy accounting_contact_permissions_read on public.accounting_contact_permissions for select to authenticated using (exists (select 1 from public.accounting_contacts ac where ac.id = accounting_contact_id and public.is_company_member(ac.company_id)));
create policy accounting_contacts_read on public.accounting_contacts for select to authenticated using (public.is_company_member(company_id));
create policy accounting_contacts_manage on public.accounting_contacts for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy document_requests_read on public.document_requests for select to authenticated using (public.is_company_member(company_id));
create policy document_requests_manage on public.document_requests for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
grant select, insert, update, delete on public.accounting_firms, public.accounting_firm_members, public.accounting_client_links, public.accounting_contacts, public.accounting_contact_permissions, public.document_requests to authenticated;
