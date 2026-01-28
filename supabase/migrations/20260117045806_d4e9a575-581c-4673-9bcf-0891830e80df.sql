-- Create email_verifications table for email verification codes
CREATE TABLE IF NOT EXISTS public.email_verifications (
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can manage email_verifications"
ON public.email_verifications
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Allow insert from edge functions
CREATE POLICY "Allow insert for verification"
ON public.email_verifications
FOR INSERT
WITH CHECK (true);

-- Allow update for verification
CREATE POLICY "Allow update for verification"
ON public.email_verifications
FOR UPDATE
USING (true);

-- Allow select for checking verification
CREATE POLICY "Allow select for verification"
ON public.email_verifications
FOR SELECT
USING (true);