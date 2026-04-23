CREATE TABLE IF NOT EXISTS user_usage (
  id uuid default gen_random_uuid() primary key,
  user_id text unique,
  resumes_generated integer default 0,
  cover_letters_generated integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

alter table user_usage enable row level security;

create policy "Users can insert own usage row" on user_usage
  for insert with check (user_id = auth.uid()::text);

create policy "Users can view own usage" on user_usage
  for select using (user_id = auth.uid()::text);

create policy "Users can update own usage" on user_usage
  for update using (user_id = auth.uid()::text);
