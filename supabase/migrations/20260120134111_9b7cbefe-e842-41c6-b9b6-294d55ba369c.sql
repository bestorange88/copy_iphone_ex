-- Add vip_level column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0;