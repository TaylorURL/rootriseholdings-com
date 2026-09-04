-- When a call was told to somebody.
--
-- The sweep announced whatever it had just published, which tied the alert to
-- the pass that found it: one unreachable minute and that call was never
-- mentioned again, while the record went on holding it as though everything
-- had gone out. A reader whose phone stayed silent had no way to tell a quiet
-- market from a message that died in flight, and neither did anyone looking
-- into it afterwards - which is the same shape of silence the sweep log was
-- added to break, one layer further out.
--
-- One nullable timestamp turns the announcement into an outbox. A pass sends
-- what is standing and unstamped rather than what it happened to mint, stamps
-- what reached somebody, and leaves the rest for the next pass two minutes
-- later. A delivery failure becomes a delay, and a call held back by the
-- per-pass cap is queued rather than dropped.
--
-- It is deliberately not part of what a call *is*. Nothing scores against it,
-- no surface ranks by it, and a deployment whose code does not know about it
-- writes rows with it null - which is the correct reading anyway: nobody has
-- been told.
alter table public.signals add column if not exists notified_at timestamptz;

-- The only question asked of this column: what is standing that nobody has
-- been told about, newest first. It is asked every two minutes for the life of
-- the desk and the answer is almost always empty, which is exactly the query a
-- partial index is for.
create index if not exists signals_unannounced_idx
  on public.signals (emitted_at desc)
  where notified_at is null and status in ('live', 'filled');
