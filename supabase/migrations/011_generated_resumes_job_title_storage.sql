-- Extend generated_resumes for My Resumes library + PDF storage path
alter table public.generated_resumes add column if not exists job_title text;
alter table public.generated_resumes add column if not exists storage_path text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'generated_resumes'
      and column_name = 'template_name'
  ) then
    alter table public.generated_resumes rename column template_name to template;
  end if;
end $$;

create policy "Users can update own generated resumes" on public.generated_resumes
  for update using (auth.uid() = user_id);

create policy "Users can delete own generated resumes" on public.generated_resumes
  for delete using (auth.uid() = user_id);

-- Private bucket for per-user PDFs (path: {user_id}/{resume_id}.pdf)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resume-files', 'resume-files', false, 5242880, array['application/pdf']::text[])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "resume-files select own"
  on storage.objects for select to authenticated
  using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resume-files insert own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resume-files update own"
  on storage.objects for update to authenticated
  using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "resume-files delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = auth.uid()::text);
