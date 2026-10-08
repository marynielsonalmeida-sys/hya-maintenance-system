-- TecFlow Dia 3: dados comerciais, identidade visual e Storage privado de logos.
-- Aplicar manualmente no Supabase após revisão. Não altera migrations anteriores.

alter table public.companies
  add column if not exists postal_code text,
  add column if not exists street text,
  add column if not exists address_number text,
  add column if not exists complement text,
  add column if not exists neighborhood text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('company-assets', 'company-assets', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']::text[])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

grant select, update on public.companies to authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists company_assets_read on storage.objects;
create policy company_assets_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-assets'
    and public.is_company_member((storage.foldername(name))[1]::uuid)
  );

drop policy if exists company_assets_insert on storage.objects;
create policy company_assets_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-assets'
    and public.can_manage_company((storage.foldername(name))[1]::uuid)
  );

drop policy if exists company_assets_update on storage.objects;
create policy company_assets_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-assets'
    and public.can_manage_company((storage.foldername(name))[1]::uuid)
  )
  with check (
    bucket_id = 'company-assets'
    and public.can_manage_company((storage.foldername(name))[1]::uuid)
  );

drop policy if exists company_assets_delete on storage.objects;
create policy company_assets_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-assets'
    and public.can_manage_company((storage.foldername(name))[1]::uuid)
  );
