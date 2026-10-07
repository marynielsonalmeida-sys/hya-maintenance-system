-- Require and normalize CPF/CNPJ for newly created companies.
-- Existing companies with NULL document remain untouched until completed manually.

create or replace function public.normalize_company_tax_id(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(regexp_replace(coalesce(value, ''), '[^0-9]', '', 'g'), '');
$$;

create or replace function public.validate_company_tax_id(value text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare digits text := public.normalize_company_tax_id(value); sum integer := 0; weight integer; check_digit integer; remainder integer; index integer;
begin
  if digits is null then raise exception 'COMPANY_TAX_ID_REQUIRED' using errcode = '22023'; end if;
  if length(digits) = 11 then
    if digits ~ '^(.)\1+$' then raise exception 'CPF_INVALID' using errcode = '22023'; end if;
    for index in 1..9 loop sum := sum + substring(digits, index, 1)::integer * (11 - index); end loop;
    remainder := (sum * 10) % 11; check_digit := case when remainder = 10 then 0 else remainder end;
    if check_digit <> substring(digits, 10, 1)::integer then raise exception 'CPF_INVALID' using errcode = '22023'; end if;
    sum := 0;
    for index in 1..10 loop sum := sum + substring(digits, index, 1)::integer * (12 - index); end loop;
    remainder := (sum * 10) % 11; check_digit := case when remainder = 10 then 0 else remainder end;
    if check_digit <> substring(digits, 11, 1)::integer then raise exception 'CPF_INVALID' using errcode = '22023'; end if;
    return digits;
  elsif length(digits) = 14 then
    if digits ~ '^(.)\1+$' then raise exception 'CNPJ_INVALID' using errcode = '22023'; end if;
    sum := 0; weight := 5;
    for index in 1..12 loop sum := sum + substring(digits, index, 1)::integer * weight; weight := weight - 1; if weight < 2 then weight := 9; end if; end loop;
    remainder := sum % 11; check_digit := case when remainder < 2 then 0 else 11 - remainder end;
    if check_digit <> substring(digits, 13, 1)::integer then raise exception 'CNPJ_INVALID' using errcode = '22023'; end if;
    sum := 0; weight := 6;
    for index in 1..13 loop sum := sum + substring(digits, index, 1)::integer * weight; weight := weight - 1; if weight < 2 then weight := 9; end if; end loop;
    remainder := sum % 11; check_digit := case when remainder < 2 then 0 else 11 - remainder end;
    if check_digit <> substring(digits, 14, 1)::integer then raise exception 'CNPJ_INVALID' using errcode = '22023'; end if;
    return digits;
  end if;
  raise exception 'COMPANY_TAX_ID_INVALID' using errcode = '22023';
end;
$$;

create or replace function public.normalize_company_document_before_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.document is distinct from old.document then
    new.document := public.validate_company_tax_id(new.document);
  end if;
  return new;
end;
$$;

drop trigger if exists companies_normalize_document on public.companies;
create trigger companies_normalize_document before insert or update on public.companies for each row execute function public.normalize_company_document_before_write();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_document_format_check' and conrelid = 'public.companies'::regclass) then
    alter table public.companies add constraint companies_document_format_check check (document is null or document ~ '^[0-9]{11}$' or document ~ '^[0-9]{14}$') not valid;
  end if;
end;
$$;

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
declare current_user_id uuid := auth.uid(); new_company_id uuid; normalized_document text;
begin
  if current_user_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'COMPANY_NAME_REQUIRED' using errcode = '22023'; end if;
  normalized_document := public.validate_company_tax_id(p_document);
  if exists (select 1 from public.company_members where profile_id = current_user_id and status = 'ACTIVE') then raise exception 'COMPANY_ALREADY_EXISTS' using errcode = '23505'; end if;
  insert into public.profiles (id, full_name) values (current_user_id, 'Usuário') on conflict (id) do nothing;
  insert into public.companies (name, document, phone, email) values (trim(p_name), normalized_document, nullif(trim(p_phone), ''), nullif(trim(p_email), '')) returning id into new_company_id;
  insert into public.company_members (company_id, profile_id, role_code, status) values (new_company_id, current_user_id, 'OWNER', 'ACTIVE');
  return new_company_id;
end;
$$;

revoke all on function public.create_company_onboarding(text, text, text, text) from public;
grant execute on function public.create_company_onboarding(text, text, text, text) to authenticated;
