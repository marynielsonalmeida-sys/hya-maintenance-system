-- Field service provider core.
-- Apply manually in Supabase after review. This migration is intentionally not executed by the app.

create type public.service_visit_type as enum ('PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'INSTALLATION');
create type public.service_visit_status as enum ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.service_visit_item_status as enum ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
create type public.service_photo_type as enum ('PROBLEM', 'BEFORE', 'AFTER', 'GENERAL');
create type public.quote_item_type as enum ('PRODUCT', 'MATERIAL', 'SERVICE', 'LABOR');
create type public.quote_unit as enum ('UNIDADE', 'METRO', 'CENTIMETRO', 'METRO_QUADRADO', 'QUILO', 'LITRO', 'KIT');

alter table public.companies add column if not exists commercial_name text;
alter table public.companies add column if not exists legal_name text;
alter table public.companies add column if not exists logo_path text;
alter table public.companies add column if not exists whatsapp text;
alter table public.companies add column if not exists address text;
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists state text;
alter table public.companies add column if not exists website text;

alter table public.clients add column if not exists responsible_name text;
alter table public.clients add column if not exists last_visit_at timestamptz;
alter table public.equipment add column if not exists primary_photo_path text;

alter table public.quote_items add column if not exists item_type public.quote_item_type not null default 'MATERIAL';
alter table public.quote_items add column if not exists unit public.quote_unit not null default 'UNIDADE';

create table public.service_visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  technician_id uuid not null references public.profiles(id) on delete restrict,
  type public.service_visit_type not null,
  status public.service_visit_status not null default 'PLANNED',
  started_at timestamptz,
  finished_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_visit_items (
  visit_id uuid not null references public.service_visits(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  diagnosis text,
  recommendation text,
  status public.service_visit_item_status not null default 'PENDING',
  primary key (visit_id, equipment_id)
);

create table public.service_photos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  visit_id uuid references public.service_visits(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  type public.service_photo_type not null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table public.quote_equipments (
  quote_id uuid not null references public.quotes(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  primary key (quote_id, equipment_id)
);

create index idx_service_visits_company_client on public.service_visits(company_id, client_id, created_at desc);
create index idx_service_visits_technician on public.service_visits(technician_id, status);
create index idx_service_visit_items_equipment on public.service_visit_items(equipment_id);
create index idx_service_photos_visit on public.service_photos(visit_id, created_at desc);
create index idx_service_photos_equipment on public.service_photos(equipment_id, created_at desc);
create index idx_quote_equipments_equipment on public.quote_equipments(equipment_id);

create trigger service_visits_set_updated_at before update on public.service_visits for each row execute function public.set_updated_at();

create or replace function public.can_access_service_visit(target_visit_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.service_visits sv
    where sv.id = target_visit_id
      and (public.can_manage_company(sv.company_id) or sv.technician_id = auth.uid())
  );
$$;

alter table public.service_visits enable row level security;
alter table public.service_visit_items enable row level security;
alter table public.service_photos enable row level security;
alter table public.quote_equipments enable row level security;

create policy service_visits_read on public.service_visits for select to authenticated using (public.is_company_member(company_id));
create policy service_visits_write on public.service_visits for all to authenticated
  using (public.can_manage_company(company_id) or technician_id = auth.uid())
  with check (public.is_company_member(company_id) and (public.can_manage_company(company_id) or technician_id = auth.uid()));

create policy service_visit_items_read on public.service_visit_items for select to authenticated using (public.can_access_service_visit(visit_id));
create policy service_visit_items_write on public.service_visit_items for all to authenticated using (public.can_access_service_visit(visit_id)) with check (public.can_access_service_visit(visit_id));

create policy service_photos_read on public.service_photos for select to authenticated using (public.is_company_member(company_id));
create policy service_photos_write on public.service_photos for all to authenticated using (public.can_manage_company(company_id) or public.is_company_member(company_id)) with check (public.is_company_member(company_id));

create policy quote_equipments_read on public.quote_equipments for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.is_company_member(q.company_id)));
create policy quote_equipments_write on public.quote_equipments for all to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id))) with check (exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id)));

