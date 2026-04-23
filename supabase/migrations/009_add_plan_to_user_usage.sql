-- Add plan column to user_usage. Values: 'free', 'pay_per_resume', 'monthly', 'one_time'
alter table user_usage add column if not exists plan text default 'free';
