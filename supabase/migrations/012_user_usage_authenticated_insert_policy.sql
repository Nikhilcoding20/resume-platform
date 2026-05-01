-- Ensure authenticated users can insert their own user_usage row.
-- Re-applies policy so projects missing it (or using an older definition) stay consistent.

alter table public.user_usage enable row level security;

drop policy if exists "Users can insert own usage row" on public.user_usage;

create policy "Users can insert own usage row" on public.user_usage
  for insert
  to authenticated
  with check (user_id = auth.uid()::text);
