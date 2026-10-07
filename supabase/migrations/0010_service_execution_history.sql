-- TecFlow Dia 2: execução real do serviço e histórico técnico derivado.
-- Aplicar manualmente no Supabase após revisão. Não altera migrations anteriores.

alter type public.service_photo_type add value if not exists 'DURING';
alter type public.photo_type add value if not exists 'DURING';

alter table public.work_orders
  add column if not exists quote_id uuid references public.quotes(id) on delete set null,
  add column if not exists service_visit_id uuid references public.service_visits(id) on delete set null;

alter table public.work_order_equipment
  add column if not exists diagnosis text,
  add column if not exists technical_notes text;

create unique index if not exists work_orders_quote_unique
  on public.work_orders(quote_id) where quote_id is not null;

create table if not exists public.work_order_execution_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete set null,
  technical_part_id uuid references public.technical_parts(id) on delete set null,
  product_id uuid,
  description text not null,
  quantity numeric(12, 3) not null default 1 check (quantity > 0),
  unit text not null default 'UNIDADE',
  unit_cost numeric(12, 2) check (unit_cost is null or unit_cost >= 0),
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  action text not null check (action in ('REPLACED', 'REPAIRED', 'ADJUSTED', 'INSPECTED', 'CLEANED', 'LUBRICATED', 'INSTALLED', 'REMOVED')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.work_order_photos
  add column if not exists caption text;

create index if not exists idx_work_order_execution_items_order
  on public.work_order_execution_items(work_order_id, created_at desc);
create index if not exists idx_work_order_execution_items_equipment
  on public.work_order_execution_items(equipment_id, created_at desc);
create index if not exists idx_work_orders_quote
  on public.work_orders(quote_id);

alter table public.work_order_execution_items enable row level security;

drop policy if exists work_order_execution_items_read on public.work_order_execution_items;
create policy work_order_execution_items_read on public.work_order_execution_items
  for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists work_order_execution_items_manage on public.work_order_execution_items;
create policy work_order_execution_items_manage on public.work_order_execution_items
  for all to authenticated
  using (public.can_access_work_order(work_order_id))
  with check (
    public.can_access_work_order(work_order_id)
    and public.is_company_member(company_id)
  );

grant select, insert, update, delete on public.work_order_execution_items to authenticated;
grant select, insert, update on public.work_orders to authenticated;
grant select, insert, update on public.work_order_equipment to authenticated;
grant select, insert on public.work_order_photos to authenticated;

create or replace function public.create_work_order_from_quote(p_quote_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_company_id uuid;
  quote_row public.quotes%rowtype;
  new_work_order_id uuid;
  mapped_type public.work_order_type;
begin
  select cm.company_id into current_company_id
  from public.company_members cm
  where cm.profile_id = auth.uid() and cm.status = 'ACTIVE'
  order by cm.created_at asc limit 1;

  if current_company_id is null then raise exception 'COMPANY_REQUIRED'; end if;

  select * into quote_row
  from public.quotes q
  where q.id = p_quote_id
    and q.company_id = current_company_id
    and q.status in ('APPROVED', 'CONVERTED');

  if not found then raise exception 'APPROVED_QUOTE_REQUIRED'; end if;
  if quote_row.work_order_id is not null then return quote_row.work_order_id; end if;

  mapped_type := case
    when quote_row.service_visit_id is null then 'CORRECTIVE'::public.work_order_type
    else (select case sv.type::text
      when 'PREVENTIVE' then 'PREVENTIVE'::public.work_order_type
      when 'INSTALLATION' then 'INSTALLATION'::public.work_order_type
      when 'INSPECTION' then 'INSPECTION'::public.work_order_type
      else 'CORRECTIVE'::public.work_order_type end
      from public.service_visits sv where sv.id = quote_row.service_visit_id)
  end;

  insert into public.work_orders (
    company_id, client_id, service_request_id, assigned_technician_id,
    type, status, diagnosis, quote_id, service_visit_id
  ) values (
    current_company_id, quote_row.client_id, null, auth.uid(),
    coalesce(mapped_type, 'CORRECTIVE'::public.work_order_type), 'Sourced from approved quote',
    quote_row.id, quote_row.service_visit_id
  ) returning id into new_work_order_id;

  insert into public.work_order_equipment (work_order_id, equipment_id, problem_description, diagnosis)
  select new_work_order_id, qe.equipment_id, svi.diagnosis, svi.diagnosis
  from public.quote_equipments qe
  left join public.service_visit_items svi
    on svi.visit_id = quote_row.service_visit_id and svi.equipment_id = qe.equipment_id
  where qe.quote_id = quote_row.id;

  if not found and quote_row.service_visit_id is not null then
    insert into public.work_order_equipment (work_order_id, equipment_id, problem_description, diagnosis)
    select new_work_order_id, svi.equipment_id, svi.diagnosis, svi.diagnosis
    from public.service_visit_items svi
    where svi.visit_id = quote_row.service_visit_id;
  end if;

  update public.quotes
  set work_order_id = new_work_order_id, status = 'CONVERTED'
  where id = quote_row.id and company_id = current_company_id;

  return new_work_order_id;
end;
$$;

grant execute on function public.create_work_order_from_quote(uuid) to authenticated;
