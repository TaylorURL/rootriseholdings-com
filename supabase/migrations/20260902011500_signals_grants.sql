-- Take back what the schema's own defaults handed out.
--
-- The table was created with an explicit revoke of insert, update and delete,
-- which read as sufficient and was not. New tables in this schema inherit
-- default privileges that grant anon and authenticated everything, so what the
-- revoke left behind was select, references, trigger and truncate - and
-- truncate is not a row operation, so no row-level security policy stands in
-- front of it. A reader holding it could empty the record the desk asks people
-- to judge it by, which is the one thing the table exists to make impossible.
--
-- So the grants are stated from zero rather than trimmed: nothing for anon,
-- which reads nothing here and has no policy to read through anyway, and
-- select alone for a signed-in reader. Everything else stays with the service
-- role the sweep writes under. This is the posture contact_messages already
-- has; signals should have been created with it.

revoke all on public.signals from anon;
revoke all on public.signals from authenticated;
grant select on public.signals to authenticated;
