-- Add kyc_level column to kyc_verifications table
-- 'basic' = 初级认证 (50,000 USDT limit)
-- 'advanced' = 高级认证 (unlimited)
ALTER TABLE public.kyc_verifications 
ADD COLUMN IF NOT EXISTS kyc_level TEXT NOT NULL DEFAULT 'basic';

-- Add trading limit columns for reference
ALTER TABLE public.kyc_verifications 
ADD COLUMN IF NOT EXISTS trading_limit NUMERIC DEFAULT 50000,
ADD COLUMN IF NOT EXISTS withdrawal_limit NUMERIC DEFAULT 50000;

-- Create a function to check KYC status and limits
CREATE OR REPLACE FUNCTION public.check_user_kyc_status(p_user_id UUID)
RETURNS TABLE (
  has_basic_kyc BOOLEAN,
  has_advanced_kyc BOOLEAN,
  kyc_status TEXT,
  trading_limit NUMERIC,
  withdrawal_limit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS (
      SELECT 1 FROM kyc_verifications 
      WHERE user_id = p_user_id 
      AND status = 'approved'
    ) as has_basic_kyc,
    EXISTS (
      SELECT 1 FROM kyc_verifications 
      WHERE user_id = p_user_id 
      AND status = 'approved' 
      AND kyc_level = 'advanced'
    ) as has_advanced_kyc,
    COALESCE(
      (SELECT status FROM kyc_verifications 
       WHERE user_id = p_user_id 
       ORDER BY 
         CASE WHEN kyc_level = 'advanced' THEN 0 ELSE 1 END,
         created_at DESC 
       LIMIT 1),
      'none'
    ) as kyc_status,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM kyc_verifications 
        WHERE user_id = p_user_id 
        AND status = 'approved' 
        AND kyc_level = 'advanced'
      ) THEN 999999999999::NUMERIC  -- Unlimited for advanced KYC
      WHEN EXISTS (
        SELECT 1 FROM kyc_verifications 
        WHERE user_id = p_user_id 
        AND status = 'approved'
      ) THEN 50000::NUMERIC
      ELSE 0::NUMERIC
    END as trading_limit,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM kyc_verifications 
        WHERE user_id = p_user_id 
        AND status = 'approved' 
        AND kyc_level = 'advanced'
      ) THEN 999999999999::NUMERIC  -- Unlimited for advanced KYC
      WHEN EXISTS (
        SELECT 1 FROM kyc_verifications 
        WHERE user_id = p_user_id 
        AND status = 'approved'
      ) THEN 50000::NUMERIC
      ELSE 0::NUMERIC
    END as withdrawal_limit;
END;
$$;

-- Create index for faster KYC lookups
CREATE INDEX IF NOT EXISTS idx_kyc_user_level ON public.kyc_verifications(user_id, kyc_level, status);