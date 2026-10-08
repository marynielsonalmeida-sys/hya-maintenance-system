-- TecFlow Pro: entitlements e fundação de RH/obrigações.
-- Aplicar manualmente após 0012. Não cria dados de negócio nem libera PRO automaticamente.

alter table public.companies add column if not exists plan_code text not null default 'BASIC';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'companies_plan_code_check' and conrelid = 'public.companies'::regclass) then
    alter table public.companies add constraint companies_plan_code_check check (plan_code in ('BASIC', 'PRO'));
  end if;
end $$;

create table if not exists public.company_feature_entitlements (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  feature_code text not null, enabled boolean not null default false, expires_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, feature_code)
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null, document text, birth_date date, phone text, email text, address text,
  hire_date date, job_title text, salary numeric(14,2), contract_type text, work_schedule text, status text not null default 'ACTIVE',
  pis_nis text, registration_number text, department text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, document)
);
create table if not exists public.employee_vacations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, starts_on date not null, ends_on date,
  status text not null default 'PLANNED', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.employee_absences (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade, absence_type text not null, starts_on date not null, ends_on date, document_path text, status text not null default 'OPEN', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  competence text not null, status text not null default 'DRAFT', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, competence)
);
create table if not exists public.esocial_events (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null, event_type text not null, status text not null default 'PREPARED', payload jsonb not null default '{}'::jsonb, error_message text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.payroll_guides (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  guide_type text not null, competence text not null, due_date date, amount numeric(14,2), status public.obligation_status not null default 'PENDING', file_path text, source text not null default 'MANUAL',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_company_entitlements_company on public.company_feature_entitlements(company_id, feature_code);
create index if not exists idx_employees_company on public.employees(company_id, status, full_name);
create index if not exists idx_vacations_company on public.employee_vacations(company_id, starts_on);
create index if not exists idx_guides_company on public.payroll_guides(company_id, due_date);

create or replace function public.has_company_feature(p_company_id uuid, p_feature_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.companies c where c.id = p_company_id and c.plan_code = 'PRO')
    or exists (select 1 from public.company_feature_entitlements e where e.company_id = p_company_id and e.feature_code = p_feature_code and e.enabled = true and (e.expires_at is null or e.expires_at > now()));
$$;

do $$ declare t text; begin
  foreach t in array array['company_feature_entitlements','employees','employee_vacations','employee_absences','payroll_periods','esocial_events','payroll_guides'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.is_company_member(company_id))', t, t);
    execute format('drop policy if exists %I_manage on public.%I', t, t);
    execute format('create policy %I_manage on public.%I for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id))', t, t);
  end loop;
end $$;

grant select, insert, update, delete on public.company_feature_entitlements, public.employees, public.employee_vacations, public.employee_absences, public.payroll_periods, public.esocial_events, public.payroll_guides to authenticated;
grant execute on function public.has_company_feature(uuid, text) to authenticated;
