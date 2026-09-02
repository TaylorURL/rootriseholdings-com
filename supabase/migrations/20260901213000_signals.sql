-- The published signal record.
--
-- Until now the record lived in each browser's local storage, which meant two
-- things that cannot both be true of a record people are asked to pay for: it
-- said something different on every device, and it only existed for as long as
-- a tab was open to write it. The sweep now runs on the host and writes here,
-- so there is one record, it is the same one everywhere, and a call found at
-- three in the morning is still found when nobody is looking.

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  symbol text not null,
  timeframe text not null,
  side text not null check (side in ('BUY', 'SELL')),
  entry double precision not null,
  stop double precision not null,
  target double precision not null,
  target2 double precision,
  target3 double precision,
  reward_to_risk double precision not null,
  grade text not null,
  setup text not null,
  continuation double precision,
  reversal_risk double precision,
  alignment text,
  reasons jsonb not null default '[]'::jsonb,
  emitted_at timestamptz not null,
  -- The feed the levels were minted against. A call is only scored against the
  -- venue that produced it, because the desk's three gold sources do not agree
  -- to the dollar and in one case not to sixty-five of them.
  venue text,
  price_at_emit double precision,
  status text not null default 'live'
    check (status in ('live', 'filled', 'target', 'stop', 'expired')),
  filled_at timestamptz,
  resolved_at timestamptz,
  realised_r double precision,
  updated_at timestamptz not null default now()
);

-- The record is read newest-first and filtered by what is still standing, which
-- is the whole of how any surface asks for it.
create index if not exists signals_emitted_at_idx on public.signals (emitted_at desc);
create index if not exists signals_status_idx on public.signals (status);

-- A call is published once. The engine already refuses to republish a
-- fingerprint it is still holding, but the engine is one process among however
-- many the host decides to run, and two sweeps overlapping would each believe
-- they were the first. This is what actually makes it true. It is partial
-- rather than total because a setup that genuinely re-forms after settling is a
-- new call and has to be allowed to publish again.
create unique index if not exists signals_standing_fingerprint_idx
  on public.signals (fingerprint)
  where status in ('live', 'filled');

alter table public.signals enable row level security;

-- Reading the record is what a subscription buys, so it is for signed-in
-- readers. Nothing but the service role writes: the sweep is the only author,
-- and a record its own readers could edit would not be worth showing anyone.
drop policy if exists "signed-in readers see the record" on public.signals;
create policy "signed-in readers see the record"
  on public.signals
  for select
  to authenticated
  using (true);

revoke insert, update, delete on public.signals from anon, authenticated;
grant select on public.signals to authenticated;
