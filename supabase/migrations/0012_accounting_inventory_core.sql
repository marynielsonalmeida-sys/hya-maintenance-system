-- TecFlow Dia 4: fiscal, compras, fornecedores e estoque.
-- Aplicar manualmente no Supabase após revisão. Não altera migrations anteriores.

do $$ begin create type public.fiscal_invoice_status as enum ('DRAFT', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED', 'EXTERNAL'); exception when duplicate_object then null; end $$;
do $$ begin create type public.purchase_invoice_status as enum ('IMPORTED', 'PENDING_REVIEW', 'POSTED', 'CANCELLED'); exception when duplicate_object then null; end $$;
do $$ begin create type public.inventory_movement_type as enum ('PURCHASE_IN', 'SERVICE_OUT', 'MANUAL_IN', 'MANUAL_OUT', 'ADJUSTMENT', 'RETURN_IN', 'RETURN_OUT'); exception when duplicate_object then null; end $$;
do $$ begin create type public.obligation_status as enum ('PENDING', 'READY', 'PAID', 'OVERDUE', 'NOT_APPLICABLE'); exception when duplicate_object then null; end $$;
do $$ begin create type public.accounting_document_category as enum ('FISCAL', 'COMPRA', 'RH', 'CONTABIL', 'CONTRATO', 'OUTRO'); exception when duplicate_object then null; end $$;

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  document text not null, legal_name text not null, trade_name text, phone text, email text, address text, city text, state text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, document)
);
create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  sku text, barcode text, name text not null, description text, unit text not null default 'UNIDADE', current_stock numeric(14,3) not null default 0 check (current_stock >= 0),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0), average_cost numeric(14,2) not null default 0 check (average_cost >= 0), sale_price numeric(14,2), active boolean not null default true,
  technical_part_id uuid references public.technical_parts(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, sku)
);
create table if not exists public.supplier_product_mappings (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, supplier_id uuid not null references public.suppliers(id) on delete cascade,
  product_id uuid not null references public.inventory_products(id) on delete cascade, supplier_description text not null, supplier_code text, created_at timestamptz not null default now(), unique (company_id, supplier_id, supplier_description)
);
create table if not exists public.purchase_invoices (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, supplier_id uuid references public.suppliers(id) on delete set null,
  access_key text not null, number text, series text, issued_at timestamptz, supplier_document text, supplier_name text, recipient_document text, total_amount numeric(14,2) not null default 0,
  status public.purchase_invoice_status not null default 'IMPORTED', xml_path text, pdf_path text, raw_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, access_key)
);
create table if not exists public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, purchase_invoice_id uuid not null references public.purchase_invoices(id) on delete cascade,
  product_id uuid references public.inventory_products(id) on delete set null, supplier_description text not null, supplier_code text, ncm text, cfop text, unit text, quantity numeric(14,3) not null default 0,
  unit_cost numeric(14,2) not null default 0, total_cost numeric(14,2) not null default 0, taxes jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, product_id uuid not null references public.inventory_products(id) on delete restrict,
  type public.inventory_movement_type not null, quantity numeric(14,3) not null check (quantity > 0), unit_cost numeric(14,2), source_type text, source_id uuid, notes text, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists public.fiscal_invoices (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, client_id uuid references public.clients(id) on delete set null, quote_id uuid references public.quotes(id) on delete set null, work_order_id uuid references public.work_orders(id) on delete set null,
  invoice_type text not null default 'SERVICE', status public.fiscal_invoice_status not null default 'DRAFT', number text, series text, access_key text, issued_at timestamptz, total_amount numeric(14,2) not null default 0, provider_code text, provider_message text, pdf_path text, xml_path text, external_reference text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.company_obligations (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, type text not null, title text not null, description text, due_date date, status public.obligation_status not null default 'PENDING', source text not null default 'MANUAL', reference_period text, amount numeric(14,2), paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.accounting_documents (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade, name text not null, category public.accounting_document_category not null default 'OUTRO', competence text, document_date date, notes text, storage_path text not null, created_at timestamptz not null default now()
);
create table if not exists public.fiscal_settings (
  company_id uuid primary key references public.companies(id) on delete cascade, municipal_registration text, state_registration text, tax_regime text, primary_cnae text, municipality_code text, has_employees boolean, provides_services boolean, sells_products boolean, fiscal_enabled boolean not null default false, provider_code text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists idx_suppliers_company on public.suppliers(company_id, legal_name);
create index if not exists idx_inventory_products_company on public.inventory_products(company_id, name);
create index if not exists idx_purchase_invoices_company on public.purchase_invoices(company_id, issued_at desc);
create index if not exists idx_purchase_invoice_items_invoice on public.purchase_invoice_items(purchase_invoice_id);
create index if not exists idx_inventory_movements_product on public.inventory_movements(company_id, product_id, created_at desc);
create index if not exists idx_fiscal_invoices_company on public.fiscal_invoices(company_id, created_at desc);
create index if not exists idx_company_obligations_due on public.company_obligations(company_id, due_date);

do $$ declare t text; begin
  foreach t in array array['suppliers','inventory_products','supplier_product_mappings','purchase_invoices','purchase_invoice_items','inventory_movements','fiscal_invoices','company_obligations','accounting_documents','fiscal_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.is_company_member(company_id))', t, t);
    execute format('drop policy if exists %I_manage on public.%I', t, t);
    execute format('create policy %I_manage on public.%I for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id))', t, t);
  end loop;
end $$;

grant select, insert, update, delete on public.suppliers, public.inventory_products, public.supplier_product_mappings, public.purchase_invoices, public.purchase_invoice_items, public.inventory_movements, public.fiscal_invoices, public.company_obligations, public.accounting_documents, public.fiscal_settings to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('fiscal-documents', 'fiscal-documents', false, 10485760, array['application/xml', 'text/xml', 'application/pdf']::text[]) on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists fiscal_documents_read on storage.objects;
create policy fiscal_documents_read on storage.objects for select to authenticated using (bucket_id = 'fiscal-documents' and public.is_company_member((storage.foldername(name))[1]::uuid));
drop policy if exists fiscal_documents_insert on storage.objects;
create policy fiscal_documents_insert on storage.objects for insert to authenticated with check (bucket_id = 'fiscal-documents' and public.can_manage_company((storage.foldername(name))[1]::uuid));
drop policy if exists fiscal_documents_delete on storage.objects;
create policy fiscal_documents_delete on storage.objects for delete to authenticated using (bucket_id = 'fiscal-documents' and public.can_manage_company((storage.foldername(name))[1]::uuid));

create or replace function public.post_purchase_invoice(p_invoice_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare invoice_company uuid; item_row record; old_stock numeric; old_cost numeric; new_stock numeric; new_cost numeric;
begin
  select company_id into invoice_company from public.purchase_invoices where id = p_invoice_id and status in ('IMPORTED', 'PENDING_REVIEW') for update;
  if invoice_company is null or not public.can_manage_company(invoice_company) then raise exception 'PURCHASE_INVOICE_NOT_ALLOWED'; end if;
  for item_row in select * from public.purchase_invoice_items where purchase_invoice_id = p_invoice_id loop
    if item_row.product_id is null then continue; end if;
    select current_stock, average_cost into old_stock, old_cost from public.inventory_products where id = item_row.product_id and company_id = invoice_company for update;
    if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
    new_stock := old_stock + item_row.quantity;
    new_cost := case when new_stock = 0 then 0 else ((old_stock * old_cost) + (item_row.quantity * item_row.unit_cost)) / new_stock end;
    update public.inventory_products set current_stock = new_stock, average_cost = round(new_cost, 2), updated_at = now() where id = item_row.product_id and company_id = invoice_company;
    insert into public.inventory_movements(company_id, product_id, type, quantity, unit_cost, source_type, source_id, created_by) values (invoice_company, item_row.product_id, 'PURCHASE_IN', item_row.quantity, item_row.unit_cost, 'PURCHASE_INVOICE', p_invoice_id, auth.uid());
  end loop;
  update public.purchase_invoices set status = 'POSTED', updated_at = now() where id = p_invoice_id and company_id = invoice_company;
end;
$$;
grant execute on function public.post_purchase_invoice(uuid) to authenticated;
