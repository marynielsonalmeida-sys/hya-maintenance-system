-- Authentication profile bootstrap and first-company onboarding.
-- Apply manually in Supabase after reviewing the SQL.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Usuário'),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        phone = coalesce(excluded.phone, public.profiles.phone),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.create_company_onboarding(
  p_name text,
  p_document text default null,
  p_phone text default null,
  p_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_company_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'COMPANY_NAME_REQUIRED' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.company_members
    where profile_id = current_user_id and status = 'ACTIVE'
  ) then
    raise exception 'COMPANY_ALREADY_EXISTS' using errcode = '23505';
  end if;

  insert into public.profiles (id, full_name)
  values (current_user_id, 'Usuário')
  on conflict (id) do nothing;

  insert into public.companies (name, document, phone, email)
  values (
    trim(p_name),
    nullif(trim(p_document), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_email), '')
  )
  returning id into new_company_id;

  insert into public.company_members (company_id, profile_id, role_code, status)
  values (new_company_id, current_user_id, 'OWNER', 'ACTIVE');

  return new_company_id;
end;
$$;

revoke all on function public.create_company_onboarding(text, text, text, text) from public;
grant execute on function public.create_company_onboarding(text, text, text, text) to authenticated;

