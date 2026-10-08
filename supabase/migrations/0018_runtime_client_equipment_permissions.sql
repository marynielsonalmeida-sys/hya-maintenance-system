-- Runtime permissions for the quick client/equipment workflow.
-- Apply manually after reviewing. Existing RLS policies remain authoritative.
grant select, insert, update, delete on public.clients, public.equipment to authenticated;
