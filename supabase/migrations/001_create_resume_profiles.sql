-- Run this SQL in your Supabase SQL Editor to create the resume_profiles table

create table if not exists resume_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  full_name text,
  email text,
  phone_number text,
  city text,
  country text,
  work_experience jsonb default '[]',
  education jsonb default '[]',
  skills text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

alter table resume_profiles enable row level security;

create policy "Users can view own profile" on resume_profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on resume_profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on resume_profiles
  for update using (auth.uid() = user_id);
