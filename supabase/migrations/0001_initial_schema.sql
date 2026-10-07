-- GYM MAINTENANCE / initial domain schema
-- Prepared for Supabase. This migration is intentionally not executed by the app yet.

create extension if not exists pgcrypto;

create type public.company_status as enum ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
create type public.app_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'VIEWER');
create type public.member_status as enum ('ACTIVE', 'INVITED', 'SUSPENDED');
create type public.equipment_status as enum ('ACTIVE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');
create type public.request_priority as enum ('LOW', 'NORMAL', 'HIGH', 'URGENT');
create type public.request_status as enum ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CANCELLED');
create type public.work_order_type as enum ('PREVENTIVE', 'CORRECTIVE', 'INSTALLATION', 'INSPECTION');
create type public.work_order_status as enum ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED');
create type public.work_order_equipment_status as enum ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.part_status as enum ('ACTIVE', 'INACTIVE', 'DISCONTINUED');
create type public.photo_type as enum ('BEFORE', 'AFTER', 'GENERAL');
create type public.quote_status as enum ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED');
create type public.financial_entry_type as enum ('INCOME', 'EXPENSE');
create type public.financial_entry_status as enum ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  email text,
  status public.company_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Role catalog is global; membership assigns one role to a user in a company.
create table public.user_roles (
  code public.app_role primary key,
  name text not null,
  description text not null
);

insert into public.user_roles (code, name, description) values
  ('OWNER', 'Owner', 'Controle total da empresa'),
  ('ADMIN', 'Administrador', 'Administração ampla da empresa'),
  ('MANAGER', 'Gestor', 'Gestão operacional'),
  ('TECHNICIAN', 'Técnico', 'Execução de ordens atribuídas'),
  ('VIEWER', 'Visualizador', 'Acesso somente leitura')
on conflict (code) do nothing;

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_code public.app_role not null references public.user_roles(code),
  status public.member_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, profile_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  trade_name text,
  document text,
  phone text,
  whatsapp text,
  email text,
  address text,
  city text,
  state text,
  notes text,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  asset_code text not null,
  name text not null,
  category text,
  brand text,
  model text,
  serial_number text,
  purchase_date date,
  installation_date date,
  location text,
  status public.equipment_status not null default 'ACTIVE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, asset_code)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete set null,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  description text not null,
  priority public.request_priority not null default 'NORMAL',
  status public.request_status not null default 'OPEN',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  service_request_id uuid references public.service_requests(id) on delete set null,
  assigned_technician_id uuid references public.profiles(id) on delete set null,
  type public.work_order_type not null,
  status public.work_order_status not null default 'DRAFT',
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  diagnosis text,
  solution text,
  customer_notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_order_equipment (
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  problem_description text,
  service_performed text,
  status public.work_order_equipment_status not null default 'PENDING',
  primary key (work_order_id, equipment_id)
);

create table public.technician_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  specialties text[] not null default '{}',
  active boolean not null default true
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  sku text,
  brand text,
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  sale_price numeric(12, 2) not null default 0 check (sale_price >= 0),
  stock_quantity numeric(12, 3) not null default 0 check (stock_quantity >= 0),
  minimum_stock numeric(12, 3) not null default 0 check (minimum_stock >= 0),
  status public.part_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);

create table public.work_order_parts (
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  primary key (work_order_id, part_id)
);

create table public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  type public.photo_type not null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table public.work_order_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  signer_name text not null,
  signer_document text,
  signature_path text not null,
  signed_at timestamptz not null default now()
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete set null,
  status public.quote_status not null default 'DRAFT',
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  valid_until date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.quote_items (
  quote_id uuid not null references public.quotes(id) on delete cascade,
  line_number integer not null check (line_number > 0),
  description text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total numeric(12, 2) not null check (total >= 0),
  primary key (quote_id, line_number)
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid references public.clients(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  type public.financial_entry_type not null,
  category text not null,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date,
  paid_at timestamptz,
  status public.financial_entry_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_company_members_profile on public.company_members(profile_id);
create index idx_clients_company on public.clients(company_id);
create index idx_equipment_company_client on public.equipment(company_id, client_id);
create index idx_service_requests_company_status on public.service_requests(company_id, status);
create index idx_work_orders_company_status on public.work_orders(company_id, status);
create index idx_work_orders_assigned_technician on public.work_orders(assigned_technician_id);
create index idx_parts_company_status on public.parts(company_id, status);
create index idx_work_order_photos_work_order on public.work_order_photos(work_order_id);
create index idx_quotes_company_status on public.quotes(company_id, status);
create index idx_financial_entries_company_status on public.financial_entries(company_id, status);
create index idx_audit_logs_company_created on public.audit_logs(company_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger company_members_set_updated_at before update on public.company_members for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger equipment_set_updated_at before update on public.equipment for each row execute function public.set_updated_at();
create trigger work_orders_set_updated_at before update on public.work_orders for each row execute function public.set_updated_at();
create trigger parts_set_updated_at before update on public.parts for each row execute function public.set_updated_at();
create trigger financial_entries_set_updated_at before update on public.financial_entries for each row execute function public.set_updated_at();

-- RLS helpers are SECURITY DEFINER to avoid policy recursion through company_members.
create or replace function public.is_company_member(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.profile_id = auth.uid()
      and cm.status = 'ACTIVE'
  );
$$;

create or replace function public.can_manage_company(target_company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members cm
    where cm.company_id = target_company_id
      and cm.profile_id = auth.uid()
      and cm.status = 'ACTIVE'
      and cm.role_code in ('OWNER', 'ADMIN', 'MANAGER')
  );
$$;

create or replace function public.can_access_work_order(target_work_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.work_orders wo
    where wo.id = target_work_order_id
      and (public.can_manage_company(wo.company_id) or wo.assigned_technician_id = auth.uid())
  );
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.company_members enable row level security;
alter table public.clients enable row level security;
alter table public.equipment enable row level security;
alter table public.service_requests enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_equipment enable row level security;
alter table public.technician_profiles enable row level security;
alter table public.parts enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.work_order_photos enable row level security;
alter table public.work_order_signatures enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
alter table public.financial_entries enable row level security;
alter table public.audit_logs enable row level security;

create policy user_roles_read on public.user_roles for select to authenticated using (true);
create policy companies_read on public.companies for select to authenticated using (public.is_company_member(id));
create policy companies_manage on public.companies for update to authenticated using (public.can_manage_company(id)) with check (public.can_manage_company(id));
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or exists (select 1 from public.company_members cm where cm.profile_id = id and public.is_company_member(cm.company_id)));
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy company_members_read on public.company_members for select to authenticated using (profile_id = auth.uid() or public.is_company_member(company_id));
create policy company_members_manage on public.company_members for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));

-- Operational records: members can read their company; managers/admins can write.
create policy clients_read on public.clients for select to authenticated using (public.is_company_member(company_id));
create policy clients_write on public.clients for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy equipment_read on public.equipment for select to authenticated using (public.is_company_member(company_id));
create policy equipment_write on public.equipment for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy requests_read on public.service_requests for select to authenticated using (public.is_company_member(company_id));
create policy requests_write on public.service_requests for all to authenticated using (public.can_manage_company(company_id) or opened_by = auth.uid()) with check (public.is_company_member(company_id));
create policy work_orders_read on public.work_orders for select to authenticated using (public.is_company_member(company_id));
create policy work_orders_manage on public.work_orders for all to authenticated using (public.can_manage_company(company_id) or assigned_technician_id = auth.uid()) with check (public.is_company_member(company_id));
create policy technician_profiles_read on public.technician_profiles for select to authenticated using (public.is_company_member(company_id));
create policy technician_profiles_manage on public.technician_profiles for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy parts_read on public.parts for select to authenticated using (public.is_company_member(company_id));
create policy parts_manage on public.parts for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy photos_read on public.work_order_photos for select to authenticated using (public.is_company_member(company_id));
create policy photos_manage on public.work_order_photos for all to authenticated using (public.can_manage_company(company_id) or public.can_access_work_order(work_order_id)) with check (public.is_company_member(company_id));
create policy signatures_read on public.work_order_signatures for select to authenticated using (public.is_company_member(company_id));
create policy signatures_manage on public.work_order_signatures for all to authenticated using (public.can_manage_company(company_id) or public.can_access_work_order(work_order_id)) with check (public.is_company_member(company_id));
create policy financial_entries_read on public.financial_entries for select to authenticated using (public.is_company_member(company_id));
create policy financial_entries_manage on public.financial_entries for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy audit_logs_read on public.audit_logs for select to authenticated using (public.is_company_member(company_id));
create policy audit_logs_insert on public.audit_logs for insert to authenticated with check (public.is_company_member(company_id) and user_id = auth.uid());

create policy work_order_equipment_read on public.work_order_equipment for select to authenticated using (public.can_access_work_order(work_order_id));
create policy work_order_equipment_manage on public.work_order_equipment for all to authenticated using (public.can_access_work_order(work_order_id)) with check (public.can_access_work_order(work_order_id));
create policy work_order_parts_read on public.work_order_parts for select to authenticated using (public.can_access_work_order(work_order_id));
create policy work_order_parts_manage on public.work_order_parts for all to authenticated using (public.can_access_work_order(work_order_id)) with check (public.can_access_work_order(work_order_id));
create policy quotes_read on public.quotes for select to authenticated using (public.is_company_member(company_id));
create policy quotes_manage on public.quotes for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
create policy quote_items_read on public.quote_items for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.is_company_member(q.company_id)));
create policy quote_items_manage on public.quote_items for all to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id))) with check (exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id)));
