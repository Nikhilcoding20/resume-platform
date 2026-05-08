-- Dedupe Pro welcome emails per Stripe subscription (webhook may fire twice).
alter table subscriptions add column if not exists pro_welcome_email_subscription_id text;
