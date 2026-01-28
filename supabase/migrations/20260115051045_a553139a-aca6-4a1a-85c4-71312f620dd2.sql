-- Create deposit-screenshots bucket for deposit proof images
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-screenshots', 'deposit-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to deposit-screenshots bucket
CREATE POLICY "Users can upload deposit screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'deposit-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own screenshots
CREATE POLICY "Users can view own deposit screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deposit-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins (service role) to view all screenshots
CREATE POLICY "Service role can view all deposit screenshots"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'deposit-screenshots'
  AND auth.role() = 'service_role'
);