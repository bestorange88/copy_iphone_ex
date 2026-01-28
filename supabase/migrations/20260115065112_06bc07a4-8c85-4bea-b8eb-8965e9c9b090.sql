-- Create PWA installation statistics table
CREATE TABLE public.pwa_installations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  device_type VARCHAR(50) NOT NULL, -- ios, android, desktop
  browser VARCHAR(100),
  os_version VARCHAR(50),
  installed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  open_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pwa_installations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for anonymous tracking)
CREATE POLICY "Anyone can insert pwa installations"
ON public.pwa_installations
FOR INSERT
WITH CHECK (true);

-- Only authenticated users can view their own installations
CREATE POLICY "Users can view their own pwa installations"
ON public.pwa_installations
FOR SELECT
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create index for faster queries
CREATE INDEX idx_pwa_installations_device_type ON public.pwa_installations(device_type);
CREATE INDEX idx_pwa_installations_installed_at ON public.pwa_installations(installed_at);

-- Create trigger for updated_at
CREATE TRIGGER update_pwa_installations_updated_at
BEFORE UPDATE ON public.pwa_installations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();