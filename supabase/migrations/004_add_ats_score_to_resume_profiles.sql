alter table resume_profiles add column if not exists ats_score integer;
alter table resume_profiles add column if not exists ats_score_updated_at timestamptz;
