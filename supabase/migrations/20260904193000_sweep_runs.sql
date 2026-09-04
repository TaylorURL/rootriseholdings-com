-- What the sweep did, every time it ran.
--
-- The signals table records what the desk found. Nothing recorded that it had
-- looked, and those are different facts that produce the same screen: a sweep
-- that read nine instruments and judged none of them worth calling leaves the
-- record exactly as empty as a sweep whose every feed read failed, or one that
-- never ran at all. For three days the second of those was true and it read, to
-- everyone including the people who built it, as a quiet market. A row per pass
-- is what makes the difference legible - to a reader on the terminal, to
-- whoever is asked why nothing has published, and to the sweep itself, which
-- can now be seen to be alive without anything having to be found.
--
-- It is deliberately small and deliberately append-only. Nothing derives from
-- it and nothing waits on it; a pass that cannot write here still publishes.
create table if not exists public.sweep_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  -- Where the pass pointed its feed reads. The one fault this table exists to
  -- have caught was an origin the deployment could not reach itself on, so the
  -- origin is the first column worth having.
  origin text,
  -- How many instruments the pass set out to read, against how many answered.
  -- Equal is healthy; a gap is the market feed failing, whatever the record
  -- looks like underneath.
  instruments integer not null default 0,
  read integer not null default 0,
  published integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  -- Every instrument that did not answer, with the reason it gave.
  unread jsonb not null default '[]'::jsonb,
  -- Every instrument that answered and was still not fit to publish from - a
  -- series the feed served out of its own memory, or one whose higher
  -- timeframes both failed. These count toward `read`, because they were read
  -- and standing calls are scored against them, so without this column a pass
  -- reports nine of nine while some of that nine was not the market.
  withheld jsonb not null default '[]'::jsonb,
  ok boolean not null default true,
  ms integer,
  created_at timestamptz not null default now()
);

-- The only question anyone asks of this table is what the last pass did.
create index if not exists sweep_runs_ran_at_idx on public.sweep_runs (ran_at desc);

alter table public.sweep_runs enable row level security;

-- Read by the same people who read the record, and written by the same author.
-- A reader who could write here could tell the desk it had swept when it had
-- not, which is the exact lie this table exists to make impossible.
drop policy if exists "signed-in readers see the sweep log" on public.sweep_runs;
create policy "signed-in readers see the sweep log"
  on public.sweep_runs
  for select
  to authenticated
  using (true);

revoke insert, update, delete on public.sweep_runs from anon, authenticated;
grant select on public.sweep_runs to authenticated;
