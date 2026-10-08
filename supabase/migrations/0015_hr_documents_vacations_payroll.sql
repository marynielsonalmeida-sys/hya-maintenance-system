-- TecFlow Dia 5: documentos de funcionários, férias, afastamentos e folha preliminar.
-- Aplicar manualmente após 0014.
alter table public.employees add column if not exists cpf text;
alter table public.employees add column if not exists admission_date date;
alter table public.employees add column if not exists employee_status text;
alter table public.employees add column if not exists weekly_hours numeric(6,2);
alter table public.employees add column if not exists notes text;

create table if not exists public.employee_documents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, document_type text not null, title text not null, storage_path text not null, document_date date, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.vacation_records (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, accrual_start date, accrual_end date, vacation_start date, vacation_end date,
  sold_days numeric(5,2) not null default 0, status text not null default 'PLANNED', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.employee_leaves (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, leave_type text not null, start_date date not null, end_date date, document_path text, status text not null default 'OPEN', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payroll_entries (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  payroll_period_id uuid not null references public.payroll_periods(id) on delete cascade, employee_id uuid not null references public.employees(id) on delete cascade,
  entry_type text not null, code text, description text not null, quantity numeric(14,3), amount numeric(14,2) not null default 0, notes text, created_at timestamptz not null default now()
);
do $$ declare t text; begin foreach t in array array['employee_documents','vacation_records','employee_leaves','payroll_entries'] loop execute format('alter table public.%I enable row level security', t); execute format('drop policy if exists %I_read on public.%I', t, t); execute format('create policy %I_read on public.%I for select to authenticated using (public.is_company_member(company_id))', t, t); execute format('drop policy if exists %I_manage on public.%I', t, t); execute format('create policy %I_manage on public.%I for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id))', t, t); end loop; end $$;
grant select, insert, update, delete on public.employee_documents, public.vacation_records, public.employee_leaves, public.payroll_entries to authenticated;
