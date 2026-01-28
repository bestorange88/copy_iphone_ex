-- Create storage bucket for APK files
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-downloads', 'app-downloads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to APK files
CREATE POLICY "Anyone can view app downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-downloads');

-- Only service role can upload/delete (admin operations via edge function)
CREATE POLICY "Service role can manage app downloads"
ON storage.objects FOR ALL
USING (bucket_id = 'app-downloads' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'app-downloads' AND auth.role() = 'service_role');

-- Insert default app download config
INSERT INTO public.system_configs (config_key, config_value, description)
VALUES (
  'app_download',
  '{"android_url": "", "ios_url": "", "apk_file_url": "", "version": "1.0.0", "update_note": ""}'::jsonb,
  'App download configuration'
)
ON CONFLICT (config_key) DO NOTHING;