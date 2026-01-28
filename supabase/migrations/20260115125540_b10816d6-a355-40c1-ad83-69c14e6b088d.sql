-- Add user_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_number SERIAL;

-- Create a sequence starting from 168001
CREATE SEQUENCE IF NOT EXISTS public.user_number_seq START WITH 168001;

-- Set the default for user_number to use this sequence
ALTER TABLE public.profiles ALTER COLUMN user_number SET DEFAULT nextval('public.user_number_seq');

-- Update existing profiles to have unique user numbers starting from 168001
DO $$
DECLARE
  r RECORD;
  counter INT := 168001;
BEGIN
  FOR r IN SELECT id FROM public.profiles ORDER BY created_at ASC
  LOOP
    UPDATE public.profiles SET user_number = counter WHERE id = r.id;
    counter := counter + 1;
  END LOOP;
  -- Set the sequence to continue from where we left off
  PERFORM setval('public.user_number_seq', counter);
END $$;

-- Add unique constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_number_unique UNIQUE (user_number);