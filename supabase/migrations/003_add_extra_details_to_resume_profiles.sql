alter table resume_profiles add column if not exists linkedin_url text;
alter table resume_profiles add column if not exists portfolio_url text;
alter table resume_profiles add column if not exists projects jsonb default '[]';
alter table resume_profiles add column if not exists certifications jsonb default '[]';
