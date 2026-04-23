create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  job_description text not null,
  interview_type text not null,
  difficulty text not null,
  questions jsonb default '[]',
  prep_guide jsonb default '{}',
  answers jsonb default '[]',
  scores jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table interview_sessions enable row level security;

create policy "Users can view own interview sessions" on interview_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own interview sessions" on interview_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own interview sessions" on interview_sessions
  for update using (auth.uid() = user_id);
