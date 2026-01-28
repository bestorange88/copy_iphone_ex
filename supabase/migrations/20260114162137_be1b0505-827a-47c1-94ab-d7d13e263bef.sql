-- Add language preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'zh-CN';

-- Add comment for the column
COMMENT ON COLUMN public.profiles.language_preference IS 'User preferred language for emails and notifications (e.g., zh-CN, en, ja, ko)';