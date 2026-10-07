-- Technical equipment library for field-service providers.
-- Apply manually in Supabase after review. This migration is not executed by the app.

create type public.equipment_model_category as enum ('TREADMILL', 'CROSSOVER', 'BIKE', 'ELLIPTICAL', 'LEG_PRESS', 'LEG_EXTENSION', 'LEG_CURL', 'CHEST_PRESS', 'FREE_WEIGHT', 'OTHER');
create type public.technical_document_type as enum ('MANUAL', 'PARTS_CATALOG', 'SCHEMATIC', 'SERVICE_BULLETIN', 'OTHER');

create table public.manufacturers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.equipment_models (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  manufacturer_id uuid not null references public.manufacturers(id) on delete restrict,
  category public.equipment_model_category not null default 'OTHER',
  model_name text not null,
  model_code text,
  description text,
  photo_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, manufacturer_id, model_name)
);

create table public.technical_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  parent_component_id uuid references public.technical_components(id) on delete set null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.technical_parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  code text,
  part_type text not null default 'MATERIAL',
  description text,
  unit public.quote_unit not null default 'UNIDADE',
  specification jsonb not null default '{}'::jsonb,
  manufacturer_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.model_components (
  model_id uuid not null references public.equipment_models(id) on delete cascade,
  component_id uuid not null references public.technical_components(id) on delete cascade,
  notes text,
  primary key (model_id, component_id)
);

create table public.model_parts (
  model_id uuid not null references public.equipment_models(id) on delete cascade,
  part_id uuid not null references public.technical_parts(id) on delete cascade,
  component_id uuid references public.technical_components(id) on delete set null,
  quantity numeric(12, 3) check (quantity is null or quantity > 0),
  technical_value text,
  notes text,
  is_recommended boolean not null default true,
  source_document_id uuid,
  source_page text,
  primary key (model_id, part_id)
);

create table public.technical_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  manufacturer_id uuid references public.manufacturers(id) on delete set null,
  equipment_model_id uuid references public.equipment_models(id) on delete set null,
  title text not null,
  document_type public.technical_document_type not null default 'OTHER',
  file_path text,
  source_url text,
  version text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.model_parts add constraint model_parts_source_document_fk foreign key (source_document_id) references public.technical_documents(id) on delete set null;
alter table public.equipment add column if not exists equipment_model_id uuid references public.equipment_models(id) on delete set null;

create index idx_manufacturers_company on public.manufacturers(company_id, name);
create index idx_equipment_models_company on public.equipment_models(company_id, model_name);
create index idx_equipment_models_code on public.equipment_models(company_id, model_code);
create index idx_technical_components_company on public.technical_components(company_id, name);
create index idx_technical_parts_company on public.technical_parts(company_id, name);
create index idx_technical_parts_specification on public.technical_parts using gin(specification);
create index idx_model_parts_part on public.model_parts(part_id);
create index idx_documents_model on public.technical_documents(equipment_model_id);
create index idx_equipment_model on public.equipment(equipment_model_id);

create trigger manufacturers_set_updated_at before update on public.manufacturers for each row execute function public.set_updated_at();
create trigger equipment_models_set_updated_at before update on public.equipment_models for each row execute function public.set_updated_at();
create trigger technical_components_set_updated_at before update on public.technical_components for each row execute function public.set_updated_at();
create trigger technical_parts_set_updated_at before update on public.technical_parts for each row execute function public.set_updated_at();
create trigger technical_documents_set_updated_at before update on public.technical_documents for each row execute function public.set_updated_at();

alter table public.manufacturers enable row level security;
alter table public.equipment_models enable row level security;
alter table public.technical_components enable row level security;
alter table public.technical_parts enable row level security;
alter table public.model_components enable row level security;
alter table public.model_parts enable row level security;
alter table public.technical_documents enable row level security;

drop policy if exists equipment_write on public.equipment;
create policy equipment_write on public.equipment for all to authenticated
  using (public.can_manage_company(company_id))
  with check (public.can_manage_company(company_id) and (equipment_model_id is null or exists (select 1 from public.equipment_models em where em.id = equipment_model_id and em.company_id = company_id)));

create policy manufacturers_read on public.manufacturers for select to authenticated using (public.is_company_member(company_id));
create policy manufacturers_write on public.manufacturers for all to authenticated using (public.can_manage_company(company_id)) with check (public.is_company_member(company_id));
create policy equipment_models_read on public.equipment_models for select to authenticated using (public.is_company_member(company_id));
create policy equipment_models_write on public.equipment_models for all to authenticated using (public.can_manage_company(company_id)) with check (public.is_company_member(company_id) and exists (select 1 from public.manufacturers mf where mf.id = manufacturer_id and mf.company_id = company_id));
create policy technical_components_read on public.technical_components for select to authenticated using (public.is_company_member(company_id));
create policy technical_components_write on public.technical_components for all to authenticated using (public.can_manage_company(company_id)) with check (public.is_company_member(company_id) and (parent_component_id is null or exists (select 1 from public.technical_components parent where parent.id = parent_component_id and parent.company_id = company_id)));
create policy technical_parts_read on public.technical_parts for select to authenticated using (public.is_company_member(company_id));
create policy technical_parts_write on public.technical_parts for all to authenticated using (public.can_manage_company(company_id)) with check (public.is_company_member(company_id));

create policy model_components_read on public.model_components for select to authenticated using (exists (select 1 from public.equipment_models m where m.id = model_id and public.is_company_member(m.company_id)));
create policy model_components_write on public.model_components for all to authenticated using (exists (select 1 from public.equipment_models m where m.id = model_id and public.can_manage_company(m.company_id))) with check (exists (select 1 from public.equipment_models m join public.technical_components c on c.id = component_id where m.id = model_id and m.company_id = c.company_id and public.can_manage_company(m.company_id)));
create policy model_parts_read on public.model_parts for select to authenticated using (exists (select 1 from public.equipment_models m where m.id = model_id and public.is_company_member(m.company_id)));
create policy model_parts_write on public.model_parts for all to authenticated using (exists (select 1 from public.equipment_models m where m.id = model_id and public.can_manage_company(m.company_id))) with check (exists (select 1 from public.equipment_models m join public.technical_parts p on p.id = part_id where m.id = model_id and m.company_id = p.company_id and public.can_manage_company(m.company_id)) and (component_id is null or exists (select 1 from public.technical_components c join public.equipment_models m on m.company_id = c.company_id where c.id = component_id and m.id = model_id)) and (source_document_id is null or exists (select 1 from public.technical_documents d join public.equipment_models m on m.company_id = d.company_id where d.id = source_document_id and m.id = model_id)));

create policy technical_documents_read on public.technical_documents for select to authenticated using (public.is_company_member(company_id));
create policy technical_documents_write on public.technical_documents for all to authenticated using (public.can_manage_company(company_id)) with check (public.is_company_member(company_id) and (manufacturer_id is null or exists (select 1 from public.manufacturers mf where mf.id = manufacturer_id and mf.company_id = company_id)) and (equipment_model_id is null or exists (select 1 from public.equipment_models em where em.id = equipment_model_id and em.company_id = company_id)));

