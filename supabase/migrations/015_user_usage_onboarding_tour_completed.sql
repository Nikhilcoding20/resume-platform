-- Track first-time dashboard onboarding tour (shepherd.js).
alter table public.user_usage
  add column if not exists onboarding_tour_completed boolean not null default false;
