-- TecFlow fechamento Dia 5: deduplicação de alertas internos.
-- Aplicar manualmente após 0016. Não cria notificações.
create unique index if not exists idx_in_app_notifications_event_title on public.in_app_notifications(event_id, title) where event_id is not null;
