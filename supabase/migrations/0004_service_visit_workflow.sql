-- Transactional technical visit workflow and private photo storage.
-- Apply manually in Supabase after review. This migration is not executed by the app.

create type public.visit_line_type as enum ('PRODUCT', 'MATERIAL', 'SERVICE', 'LABOR');

create table public.service_visit_materials (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.service_visits(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  part_id uuid references public.parts(id) on delete set null,
  line_type public.visit_line_type not null default 'MATERIAL',
  description text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit public.quote_unit not null default 'UNIDADE',
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  created_at timestamptz not null default now()
);

create table public.service_visit_services (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.service_visits(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  line_type public.visit_line_type not null default 'SERVICE',
  description text not null,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create index idx_service_visit_materials_visit on public.service_visit_materials(visit_id);
create index idx_service_visit_services_visit on public.service_visit_services(visit_id);

alter table public.service_visit_materials enable row level security;
alter table public.service_visit_services enable row level security;

create policy service_visit_materials_read on public.service_visit_materials for select to authenticated using (public.can_access_service_visit(visit_id));
create policy service_visit_materials_write on public.service_visit_materials for all to authenticated using (public.can_access_service_visit(visit_id)) with check (public.can_access_service_visit(visit_id));
create policy service_visit_services_read on public.service_visit_services for select to authenticated using (public.can_access_service_visit(visit_id));
create policy service_visit_services_write on public.service_visit_services for all to authenticated using (public.can_access_service_visit(visit_id)) with check (public.can_access_service_visit(visit_id));

create or replace function public.create_service_visit(
  p_client_id uuid,
  p_type public.service_visit_type,
  p_notes text,
  p_items jsonb,
  p_materials jsonb,
  p_services jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_company_id uuid;
  new_visit_id uuid;
  item jsonb;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select cm.company_id into current_company_id
  from public.company_members cm
  where cm.profile_id = current_user_id and cm.status = 'ACTIVE'
  order by cm.created_at asc limit 1;
  if current_company_id is null then raise exception 'COMPANY_REQUIRED' using errcode = '42501'; end if;

  if not exists (select 1 from public.clients c where c.id = p_client_id and c.company_id = current_company_id) then
    raise exception 'CLIENT_NOT_FOUND' using errcode = '23503';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'EQUIPMENT_REQUIRED' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if not exists (
      select 1 from public.equipment e
      where e.id = (item ->> 'equipment_id')::uuid
        and e.company_id = current_company_id
        and e.client_id = p_client_id
    ) then raise exception 'EQUIPMENT_NOT_FOUND' using errcode = '23503'; end if;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb) || coalesce(p_services, '[]'::jsonb)) loop
    if nullif(item ->> 'equipment_id', '') is not null and not exists (
      select 1 from public.equipment e
      where e.id = (item ->> 'equipment_id')::uuid
        and e.company_id = current_company_id
        and e.client_id = p_client_id
    ) then raise exception 'LINE_EQUIPMENT_NOT_FOUND' using errcode = '23503'; end if;
  end loop;

  insert into public.service_visits (company_id, client_id, technician_id, type, status, notes)
  values (current_company_id, p_client_id, current_user_id, p_type, 'COMPLETED', nullif(trim(p_notes), ''))
  returning id into new_visit_id;

  insert into public.service_visit_items (visit_id, equipment_id, diagnosis, recommendation, status)
  select new_visit_id, (value ->> 'equipment_id')::uuid, nullif(trim(value ->> 'diagnosis'), ''), nullif(trim(value ->> 'recommendation'), ''), coalesce((value ->> 'status')::public.service_visit_item_status, 'COMPLETED')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as value;

  insert into public.service_visit_materials (visit_id, equipment_id, line_type, description, quantity, unit, unit_price)
  select new_visit_id, nullif(value ->> 'equipment_id', '')::uuid, coalesce((value ->> 'line_type')::public.visit_line_type, 'MATERIAL'), trim(value ->> 'description'), (value ->> 'quantity')::numeric, coalesce((value ->> 'unit')::public.quote_unit, 'UNIDADE'), nullif(value ->> 'unit_price', '')::numeric
  from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb)) as value
  where nullif(trim(value ->> 'description'), '') is not null;

  insert into public.service_visit_services (visit_id, equipment_id, line_type, description, quantity, unit_price)
  select new_visit_id, nullif(value ->> 'equipment_id', '')::uuid, coalesce((value ->> 'line_type')::public.visit_line_type, 'SERVICE'), trim(value ->> 'description'), coalesce(nullif(value ->> 'quantity', '')::numeric, 1), coalesce(nullif(value ->> 'unit_price', '')::numeric, 0)
  from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) as value
  where nullif(trim(value ->> 'description'), '') is not null;

  update public.clients set last_visit_at = now() where id = p_client_id and company_id = current_company_id;
  return new_visit_id;
end;
$$;

revoke all on function public.create_service_visit(uuid, public.service_visit_type, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_service_visit(uuid, public.service_visit_type, text, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.create_client_quick(
  p_name text,
  p_responsible_name text default null,
  p_phone text default null,
  p_email text default null,
  p_city text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare current_user_id uuid := auth.uid(); current_company_id uuid; new_client_id uuid;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select cm.company_id into current_company_id from public.company_members cm where cm.profile_id = current_user_id and cm.status = 'ACTIVE' order by cm.created_at asc limit 1;
  if current_company_id is null then raise exception 'COMPANY_REQUIRED' using errcode = '42501'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'CLIENT_NAME_REQUIRED' using errcode = '22023'; end if;
  insert into public.clients (company_id, name, responsible_name, phone, whatsapp, email, city)
  values (current_company_id, trim(p_name), nullif(trim(p_responsible_name), ''), nullif(trim(p_phone), ''), nullif(trim(p_phone), ''), nullif(trim(p_email), ''), nullif(trim(p_city), ''))
  returning id into new_client_id;
  return new_client_id;
end;
$$;
revoke all on function public.create_client_quick(text, text, text, text, text) from public;
grant execute on function public.create_client_quick(text, text, text, text, text) to authenticated;

create or replace function public.create_equipment_quick(
  p_client_id uuid,
  p_name text,
  p_category text default null,
  p_brand text default null,
  p_model text default null,
  p_serial_number text default null,
  p_location text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare current_user_id uuid := auth.uid(); current_company_id uuid; new_equipment_id uuid; next_asset_code text;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select cm.company_id into current_company_id from public.company_members cm where cm.profile_id = current_user_id and cm.status = 'ACTIVE' order by cm.created_at asc limit 1;
  if current_company_id is null then raise exception 'COMPANY_REQUIRED' using errcode = '42501'; end if;
  if not exists (select 1 from public.clients c where c.id = p_client_id and c.company_id = current_company_id) then raise exception 'CLIENT_NOT_FOUND' using errcode = '23503'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'EQUIPMENT_NAME_REQUIRED' using errcode = '22023'; end if;
  next_asset_code := 'EQ-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  insert into public.equipment (company_id, client_id, asset_code, name, category, brand, model, serial_number, location)
  values (current_company_id, p_client_id, next_asset_code, trim(p_name), nullif(trim(p_category), ''), nullif(trim(p_brand), ''), nullif(trim(p_model), ''), nullif(trim(p_serial_number), ''), nullif(trim(p_location), ''))
  returning id into new_equipment_id;
  return new_equipment_id;
end;
$$;
revoke all on function public.create_equipment_quick(uuid, text, text, text, text, text, text) from public;
grant execute on function public.create_equipment_quick(uuid, text, text, text, text, text, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('service-photos', 'service-photos', false)
on conflict (id) do nothing;

create policy service_photos_storage_read on storage.objects for select to authenticated using (
  bucket_id = 'service-photos' and public.is_company_member(((storage.foldername(name))[1])::uuid)
);
create policy service_photos_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'service-photos' and public.is_company_member(((storage.foldername(name))[1])::uuid)
);
create policy service_photos_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'service-photos' and public.can_manage_company(((storage.foldername(name))[1])::uuid)
);

