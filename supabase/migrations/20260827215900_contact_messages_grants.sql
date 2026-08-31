-- Row-level security governs select, insert, update and delete, and nothing
-- else. Truncate is checked as a table privilege alone, so a role holding it
-- empties the table whatever the policies say -- and the browser bundle carries
-- the publishable key that speaks as anon. The privilege a message form needs
-- is insert; the rest are withdrawn rather than left standing behind a policy
-- that never applies to them.
revoke all on table public.contact_messages from anon, authenticated;
grant insert on table public.contact_messages to anon, authenticated;
