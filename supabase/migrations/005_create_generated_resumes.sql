create table if not exists generated_resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  template_name text,
  created_at timestamptz default now()
);

alter table generated_resumes enable row level security;

create policy "Users can view own generated resumes" on generated_resumes
  for select using (auth.uid() = user_id);

create policy "Users can insert own generated resumes" on generated_resumes
  for insert with check (auth.uid() = user_id);
