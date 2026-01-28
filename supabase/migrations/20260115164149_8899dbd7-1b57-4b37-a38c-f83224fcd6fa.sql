-- Add return_type column to earn_products table
ALTER TABLE earn_products ADD COLUMN IF NOT EXISTS return_type text DEFAULT 'daily_interest';

-- Add return_type column to mining_products table
ALTER TABLE mining_products ADD COLUMN IF NOT EXISTS return_type text DEFAULT 'daily_interest';