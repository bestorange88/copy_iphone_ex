-- Add early redemption columns to mining_products table
ALTER TABLE public.mining_products 
ADD COLUMN IF NOT EXISTS early_redemption_fee numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS allow_early_redemption boolean DEFAULT true;