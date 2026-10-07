-- Technical data provenance and confidence. Apply manually after review.

create type public.technical_confidence_status as enum ('OFFICIAL_MANUFACTURER', 'FIELD_VERIFIED', 'UNVERIFIED');
create type public.technical_source_type as enum ('MANUFACTURER_DOCUMENT', 'FIELD_INSPECTION', 'MANUAL', 'PARTS_CATALOG', 'SCHEMATIC', 'SERVICE_BULLETIN', 'WEB_SOURCE', 'OTHER');

alter table public.technical_parts
  add column confidence_status public.technical_confidence_status not null default 'UNVERIFIED',
  add column source_type public.technical_source_type,
  add column source_document_id uuid,
  add column source_page text,
  add column source_url text,
  add column source_notes text,
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null;

alter table public.model_components
  add column confidence_status public.technical_confidence_status not null default 'UNVERIFIED',
  add column source_type public.technical_source_type,
  add column source_document_id uuid,
  add column source_page text,
  add column source_url text,
  add column source_notes text,
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null;

alter table public.model_parts
  add column confidence_status public.technical_confidence_status not null default 'UNVERIFIED',
  add column source_type public.technical_source_type,
  add column source_url text,
  add column source_notes text,
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null;

alter table public.technical_documents
  add column confidence_status public.technical_confidence_status not null default 'UNVERIFIED',
  add column source_type public.technical_source_type,
  add column source_document_id uuid references public.technical_documents(id) on delete set null,
  add column source_page text,
  add column source_notes text,
  add column verified_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null;

alter table public.technical_parts add constraint technical_parts_source_document_fk foreign key (source_document_id) references public.technical_documents(id) on delete set null;
alter table public.model_components add constraint model_components_source_document_fk foreign key (source_document_id) references public.technical_documents(id) on delete set null;

create table public.technical_specifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  equipment_model_id uuid references public.equipment_models(id) on delete cascade,
  technical_part_id uuid references public.technical_parts(id) on delete cascade,
  specification_key text not null,
  specification_value text not null,
  unit text,
  confidence_status public.technical_confidence_status not null default 'UNVERIFIED',
  source_type public.technical_source_type,
  source_document_id uuid references public.technical_documents(id) on delete set null,
  source_page text,
  source_url text,
  source_notes text,
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint technical_specification_owner_check check (num_nonnulls(equipment_model_id, technical_part_id) = 1)
);

create or replace function public.validate_technical_provenance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare source_company uuid;
declare owner_company uuid;
begin
  if new.confidence_status = 'OFFICIAL_MANUFACTURER' and
     new.source_document_id is null and new.source_url is null and
     new.source_page is null and new.source_notes is null then
    raise exception 'OFFICIAL_SOURCE_REQUIRED' using errcode = '23514';
  end if;

  if new.confidence_status = 'FIELD_VERIFIED' then
    new.verified_at := coalesce(new.verified_at, now());
    new.verified_by := coalesce(new.verified_by, auth.uid());
  end if;

  if new.source_document_id is not null then
    select d.company_id into source_company from public.technical_documents d where d.id = new.source_document_id;
    if source_company is null then raise exception 'SOURCE_DOCUMENT_NOT_FOUND' using errcode = '23503'; end if;
    if tg_table_name in ('technical_parts', 'technical_documents', 'technical_specifications') then
      owner_company := new.company_id;
    elsif tg_table_name in ('model_parts', 'model_components') then
      select m.company_id into owner_company from public.equipment_models m where m.id = new.model_id;
    end if;
    if owner_company is distinct from source_company then raise exception 'SOURCE_COMPANY_MISMATCH' using errcode = '23514'; end if;
  end if;
  return new;
end;
$$;

create trigger technical_parts_provenance_validate before insert or update on public.technical_parts for each row execute function public.validate_technical_provenance();
create trigger model_components_provenance_validate before insert or update on public.model_components for each row execute function public.validate_technical_provenance();
create trigger model_parts_provenance_validate before insert or update on public.model_parts for each row execute function public.validate_technical_provenance();
create trigger technical_documents_provenance_validate before insert or update on public.technical_documents for each row execute function public.validate_technical_provenance();
create trigger technical_specifications_provenance_validate before insert or update on public.technical_specifications for each row execute function public.validate_technical_provenance();
create trigger technical_specifications_set_updated_at before update on public.technical_specifications for each row execute function public.set_updated_at();

create index idx_technical_specs_model on public.technical_specifications(equipment_model_id);
create index idx_technical_specs_part on public.technical_specifications(technical_part_id);
create index idx_technical_specs_confidence on public.technical_specifications(company_id, confidence_status);

alter table public.technical_specifications enable row level security;
create policy technical_specifications_read on public.technical_specifications for select to authenticated using (public.is_company_member(company_id));
create policy technical_specifications_write on public.technical_specifications for all to authenticated
  using (public.can_manage_company(company_id))
  with check (
    public.can_manage_company(company_id)
    and (equipment_model_id is null or exists (select 1 from public.equipment_models m where m.id = equipment_model_id and m.company_id = company_id))
    and (technical_part_id is null or exists (select 1 from public.technical_parts p where p.id = technical_part_id and p.company_id = company_id))
    and (source_document_id is null or exists (select 1 from public.technical_documents d where d.id = source_document_id and d.company_id = company_id))
  );

drop policy if exists technical_parts_write on public.technical_parts;
create policy technical_parts_write on public.technical_parts for all to authenticated
  using (public.can_manage_company(company_id))
  with check (public.can_manage_company(company_id) and (source_document_id is null or exists (select 1 from public.technical_documents d where d.id = source_document_id and d.company_id = company_id)));

drop policy if exists technical_documents_write on public.technical_documents;
create policy technical_documents_write on public.technical_documents for all to authenticated using (public.can_manage_company(company_id)) with check (
  public.is_company_member(company_id)
  and (manufacturer_id is null or exists (select 1 from public.manufacturers mf where mf.id = manufacturer_id and mf.company_id = company_id))
  and (equipment_model_id is null or exists (select 1 from public.equipment_models em where em.id = equipment_model_id and em.company_id = company_id))
  and (source_document_id is null or exists (select 1 from public.technical_documents source where source.id = source_document_id and source.company_id = company_id))
);

drop policy if exists model_components_write on public.model_components;
create policy model_components_write on public.model_components for all to authenticated using (exists (select 1 from public.equipment_models m where m.id = model_id and public.can_manage_company(m.company_id))) with check (
  exists (select 1 from public.equipment_models m join public.technical_components c on c.id = component_id where m.id = model_id and m.company_id = c.company_id and public.can_manage_company(m.company_id))
  and (source_document_id is null or exists (select 1 from public.technical_documents d join public.equipment_models m on m.company_id = d.company_id where d.id = source_document_id and m.id = model_id))
);
