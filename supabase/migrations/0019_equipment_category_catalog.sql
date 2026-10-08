-- Base catalog for field-service equipment categories.
-- Apply manually after review. Does not create company-specific business data.
do $$
begin
  alter type public.equipment_model_category add value if not exists 'BICICLETA_VERTICAL';
  alter type public.equipment_model_category add value if not exists 'BICICLETA_HORIZONTAL';
  alter type public.equipment_model_category add value if not exists 'SPINNING';
  alter type public.equipment_model_category add value if not exists 'ESCADA';
  alter type public.equipment_model_category add value if not exists 'REMO';
  alter type public.equipment_model_category add value if not exists 'SIMULADOR_ESQUI';
  alter type public.equipment_model_category add value if not exists 'ESTACAO_MUSCULACAO';
  alter type public.equipment_model_category add value if not exists 'HACK';
  alter type public.equipment_model_category add value if not exists 'SMITH';
  alter type public.equipment_model_category add value if not exists 'SUPINO';
  alter type public.equipment_model_category add value if not exists 'CADEIRA_EXTENSORA';
  alter type public.equipment_model_category add value if not exists 'CADEIRA_FLEXORA';
  alter type public.equipment_model_category add value if not exists 'MESA_FLEXORA';
  alter type public.equipment_model_category add value if not exists 'ADUTOR_ABDUTOR';
  alter type public.equipment_model_category add value if not exists 'PANTURRILHA';
  alter type public.equipment_model_category add value if not exists 'PUXADA';
  alter type public.equipment_model_category add value if not exists 'REMADA';
  alter type public.equipment_model_category add value if not exists 'DESENVOLVIMENTO';
  alter type public.equipment_model_category add value if not exists 'MAQUINA_GLUTEO';
  alter type public.equipment_model_category add value if not exists 'MULTIESTACAO';
end $$;

create table if not exists public.equipment_category_catalog (
  code text primary key,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

insert into public.equipment_category_catalog (code, label, sort_order) values
  ('TREADMILL', 'Esteira', 10), ('BICICLETA_VERTICAL', 'Bicicleta vertical', 20),
  ('BICICLETA_HORIZONTAL', 'Bicicleta horizontal', 30), ('SPINNING', 'Spinning', 40),
  ('ELLIPTICAL', 'Elíptico', 50), ('ESCADA', 'Escada', 60), ('REMO', 'Remo', 70),
  ('SIMULADOR_ESQUI', 'Simulador de esqui', 80), ('ESTACAO_MUSCULACAO', 'Estação de musculação', 90),
  ('CROSSOVER', 'Crossover', 100), ('LEG_PRESS', 'Leg press', 110), ('HACK', 'Hack', 120),
  ('SMITH', 'Smith', 130), ('SUPINO', 'Supino', 140), ('CADEIRA_EXTENSORA', 'Cadeira extensora', 150),
  ('CADEIRA_FLEXORA', 'Cadeira flexora', 160), ('MESA_FLEXORA', 'Mesa flexora', 170),
  ('ADUTOR_ABDUTOR', 'Adutor/abdutor', 180), ('PANTURRILHA', 'Panturrilha', 190),
  ('PUXADA', 'Puxada', 200), ('REMADA', 'Remada', 210), ('DESENVOLVIMENTO', 'Desenvolvimento', 220),
  ('MAQUINA_GLUTEO', 'Máquina glúteo', 230), ('MULTIESTACAO', 'Multiestação', 240),
  ('OTHER', 'Outro', 999)
on conflict (code) do update set label = excluded.label, sort_order = excluded.sort_order, active = true;

alter table public.equipment_category_catalog enable row level security;
drop policy if exists equipment_category_catalog_read on public.equipment_category_catalog;
create policy equipment_category_catalog_read on public.equipment_category_catalog for select to authenticated using (true);
grant select on public.equipment_category_catalog to authenticated;
