-- Visual service quotes linked to visits. Apply manually after review.

alter type public.quote_status add value if not exists 'CONVERTED';

alter table public.quotes
  add column service_visit_id uuid references public.service_visits(id) on delete set null,
  add column quote_number text,
  add column issued_at timestamptz not null default now();

update public.quotes set quote_number = 'ORC-' || upper(substr(replace(id::text, '-', ''), 1, 10)) where quote_number is null;
alter table public.quotes alter column quote_number set not null;
alter table public.quotes add constraint quotes_company_number_unique unique (company_id, quote_number);

alter table public.quote_items
  add column equipment_id uuid references public.equipment(id) on delete set null,
  add column item_type public.quote_item_type not null default 'MATERIAL',
  add column unit public.quote_unit not null default 'UNIDADE',
  add column technical_part_id uuid references public.technical_parts(id) on delete set null;

create table public.quote_photos (
  quote_id uuid not null references public.quotes(id) on delete cascade,
  photo_id uuid not null references public.service_photos(id) on delete cascade,
  primary key (quote_id, photo_id)
);

create index idx_quotes_visit on public.quotes(service_visit_id);
create index idx_quote_items_equipment on public.quote_items(equipment_id);
create index idx_quote_photos_photo on public.quote_photos(photo_id);

alter table public.quote_photos enable row level security;
create policy quote_photos_read on public.quote_photos for select to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.is_company_member(q.company_id)));
create policy quote_photos_write on public.quote_photos for all to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id))) with check (
  exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id))
  and exists (select 1 from public.service_photos p join public.quotes q on q.company_id = p.company_id where p.id = photo_id and q.id = quote_id)
);

drop policy if exists quotes_manage on public.quotes;
create policy quotes_manage on public.quotes for all to authenticated using (public.can_manage_company(company_id)) with check (
  public.can_manage_company(company_id)
  and (service_visit_id is null or exists (select 1 from public.service_visits v where v.id = service_visit_id and v.company_id = company_id and v.client_id = client_id))
);

drop policy if exists quote_items_manage on public.quote_items;
create policy quote_items_manage on public.quote_items for all to authenticated using (exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id))) with check (
  exists (select 1 from public.quotes q where q.id = quote_id and public.can_manage_company(q.company_id))
  and (equipment_id is null or exists (select 1 from public.equipment e join public.quotes q on q.company_id = e.company_id where e.id = equipment_id and q.id = quote_id))
  and (technical_part_id is null or exists (select 1 from public.technical_parts p join public.quotes q on q.company_id = p.company_id where p.id = technical_part_id and q.id = quote_id))
);
