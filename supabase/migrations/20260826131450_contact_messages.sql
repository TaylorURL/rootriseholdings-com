create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  message text not null check (char_length(message) between 1 and 4000)
);

alter table public.contact_messages enable row level security;

drop policy if exists "anyone may send a message" on public.contact_messages;
create policy "anyone may send a message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

revoke select, update, delete on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
