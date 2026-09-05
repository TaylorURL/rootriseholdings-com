-- The journal, moved off the browser and onto the account.
--
-- Everything a reader types into this desk - every trade, the starting equity,
-- the prop firms and their limits, the point values, the day plans - has lived
-- in one browser's local storage under `rr.journal.v1` and nowhere else. That
-- is a record with two faults people paying for a desk should not have to work
-- around: it is empty on the phone they check at lunch, and it is gone for good
-- when a profile is cleared, a laptop is replaced, or a browser decides the
-- quota is up. The signals record was moved off local storage for the same
-- reason. This is the other half of that.
--
-- One row per account holding the whole record as jsonb, rather than a table of
-- trades and a table of firms and a table of plans. The store already treats
-- the journal as one versioned document: every mutation flows through
-- saveJournal, the app reads the whole thing into state on load, and the backup
-- file a reader can download is that same document byte for byte. Normalising
-- it would buy nothing today, would put the export format and the table shape
-- on separate tracks that must be kept in step forever, and would turn the
-- migration below from a copy into a translation.
--
-- The cost of that choice, stated plainly: two devices editing at once resolve
-- last-writer-wins over the whole document rather than per trade. The client
-- merges rather than overwrites when it finds a record on both sides, so the
-- realistic version of that - a phone and a laptop a few minutes apart - keeps
-- both sets of trades. Two browsers editing the same trade in the same minute
-- is the case that resolves in one direction, and for a single-owner trading
-- journal that is a fair trade for a schema the export file cannot drift from.

create table if not exists public.journals (
  -- The account is the key. One journal per person, and the row goes when the
  -- account does rather than being left behind pointing at a user that is gone.
  user_id uuid primary key references auth.users (id) on delete cascade,
  record jsonb not null,
  -- When a browser's local record was first carried up to this account. It is
  -- kept because the migration is the one moment the two copies can disagree
  -- and nobody would otherwise be able to say afterwards which side won.
  migrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.journals enable row level security;

-- Every policy is scoped to the row whose key is the caller's own id, which is
-- the whole of the access rule here: a journal is private to the person who
-- wrote it, and there is no reader on this table who is not its author. The
-- insert policy checks the same thing with `with check`, so a signed-in caller
-- cannot create a row under somebody else's id.
drop policy if exists "a reader sees only their own journal" on public.journals;
create policy "a reader sees only their own journal"
  on public.journals
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "a reader creates only their own journal" on public.journals;
create policy "a reader creates only their own journal"
  on public.journals
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "a reader updates only their own journal" on public.journals;
create policy "a reader updates only their own journal"
  on public.journals
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- `updated_at` is what the client compares to decide whether the copy it holds
-- is behind, so it cannot be a value the client supplies - a browser with a
-- wrong clock would otherwise be able to make a stale record look current and
-- win every merge. The database stamps it on the way in.
create or replace function public.stamp_journal_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists journals_stamp_updated_at on public.journals;
create trigger journals_stamp_updated_at
  before update on public.journals
  for each row
  execute function public.stamp_journal_updated_at();

-- Stated from zero rather than trimmed, which is the posture signals had to be
-- corrected into: new tables in this schema inherit default privileges handing
-- anon and authenticated everything, and truncate is not a row operation, so no
-- policy stands in front of it. Delete is withheld too - nothing in the app
-- deletes a journal, and an account being removed takes its row through the
-- cascade above rather than through a grant.
revoke all on public.journals from anon;
revoke all on public.journals from authenticated;
grant select, insert, update on public.journals to authenticated;
