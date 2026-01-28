-- Add Google Authenticator (TOTP) fields to admin_users table
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS totp_secret TEXT,
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.admin_users.totp_secret IS 'Encrypted TOTP secret for Google Authenticator';
COMMENT ON COLUMN public.admin_users.totp_enabled IS 'Whether 2FA is enabled for this admin';