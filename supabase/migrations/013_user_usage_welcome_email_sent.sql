-- Track welcome email after auth callback so inactive users (0/0 usage) don't get repeats.
alter table public.user_usage
  add column if not exists welcome_email_sent boolean not null default false;
