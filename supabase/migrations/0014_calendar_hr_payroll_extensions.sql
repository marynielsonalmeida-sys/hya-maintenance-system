-- TecFlow Dia 5: calendário, alertas internos e extensões de RH/folha.
-- Aplicar manualmente após 0013. Nenhum registro de negócio é criado.

do $$ begin create type public.calendar_event_category as enum ('FISCAL','GUIA','BOLETO','FORNECEDOR','PARCELAMENTO','FUNCIONARIO','FERIAS','DOCUMENTO','OBRIGACAO','OUTRO'); exception when duplicate_object then null; end $$;
do $$ begin create type public.calendar_event_status as enum ('UPCOMING','DUE_SOON','DUE_TODAY','OVERDUE','PAID','COMPLETED','CANCELLED','WAITING_CONFIRMATION'); exception when duplicate_object then null; end $$;
do $$ begin create type public.notification_channel as enum ('IN_APP','EMAIL','WHATSAPP'); exception when duplicate_object then null; end $$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  title text not null, description text, category public.calendar_event_category not null default 'OUTRO', due_date date not null,
  amount numeric(14,2), status public.calendar_event_status not null default 'UPCOMING', source_type text, source_id uuid,
  responsible_user_id uuid references public.profiles(id) on delete set null, paid_at timestamptz, completed_at timestamptz,
  attachment_path text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.calendar_alert_rules (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  days_before integer not null check (days_before >= 0), channel public.notification_channel not null default 'IN_APP', enabled boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (company_id, days_before, channel)
);
create table if not exists public.in_app_notifications (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.companies(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade, title text not null, body text not null, event_id uuid references public.calendar_events(id) on delete cascade,
  read_at timestamptz, created_at timestamptz not null default now()
);

alter table public.payroll_guides add column if not exists line_digitable text;
alter table public.payroll_guides add column if not exists receipt_path text;
alter table public.payroll_guides add column if not exists paid_at timestamptz;
alter table public.payroll_guides add column if not exists paid_amount numeric(14,2);

create index if not exists idx_calendar_events_company_due on public.calendar_events(company_id, due_date, status);
create index if not exists idx_notifications_recipient on public.in_app_notifications(company_id, recipient_id, read_at);

do $$ declare t text; begin
  foreach t in array array['calendar_events','calendar_alert_rules','in_app_notifications'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.is_company_member(company_id))', t, t);
    execute format('drop policy if exists %I_manage on public.%I', t, t);
    execute format('create policy %I_manage on public.%I for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id))', t, t);
  end loop;
end $$;
alter table public.payroll_guides enable row level security;
drop policy if exists payroll_guides_read on public.payroll_guides;
create policy payroll_guides_read on public.payroll_guides for select to authenticated using (public.is_company_member(company_id));
drop policy if exists payroll_guides_manage on public.payroll_guides;
create policy payroll_guides_manage on public.payroll_guides for all to authenticated using (public.can_manage_company(company_id)) with check (public.can_manage_company(company_id));
grant select, insert, update, delete on public.calendar_events, public.calendar_alert_rules, public.in_app_notifications, public.payroll_guides to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('accounting-documents', 'accounting-documents', false, 10485760, array['application/pdf','application/xml','image/jpeg','image/png']::text[]) on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists accounting_documents_read on storage.objects;
create policy accounting_documents_read on storage.objects for select to authenticated using (bucket_id = 'accounting-documents' and public.is_company_member((storage.foldername(name))[1]::uuid));
drop policy if exists accounting_documents_insert on storage.objects;
create policy accounting_documents_insert on storage.objects for insert to authenticated with check (bucket_id = 'accounting-documents' and public.can_manage_company((storage.foldername(name))[1]::uuid));
drop policy if exists accounting_documents_delete on storage.objects;
create policy accounting_documents_delete on storage.objects for delete to authenticated using (bucket_id = 'accounting-documents' and public.can_manage_company((storage.foldername(name))[1]::uuid));
