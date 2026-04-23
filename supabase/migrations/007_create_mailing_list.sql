-- Newsletter / mailing list signups from signup page
CREATE TABLE IF NOT EXISTS mailing_list (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT mailing_list_email_unique UNIQUE (email)
);

ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;

-- Allow inserts from signup (anon before session, or authenticated after sign-up)
CREATE POLICY "Allow mailing list signup insert"
  ON mailing_list
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Optional: service role / dashboard reads via Supabase dashboard or server; no public SELECT
