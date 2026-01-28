-- 创建高级实名认证表
CREATE TABLE IF NOT EXISTS public.advanced_kyc_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  occupation TEXT,
  income_source TEXT,
  annual_income TEXT,
  investment_experience TEXT,
  investment_purpose TEXT,
  risk_acknowledgment BOOLEAN DEFAULT FALSE,
  aml_acknowledgment BOOLEAN DEFAULT FALSE,
  video_url TEXT,
  status TEXT DEFAULT 'pending',
  reject_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 启用 RLS
ALTER TABLE public.advanced_kyc_verifications ENABLE ROW LEVEL SECURITY;

-- 用户可以查看自己的记录
CREATE POLICY "Users can view own advanced KYC" ON public.advanced_kyc_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- 用户可以插入自己的记录
CREATE POLICY "Users can insert own advanced KYC" ON public.advanced_kyc_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己待审核的记录
CREATE POLICY "Users can update pending advanced KYC" ON public.advanced_kyc_verifications
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- 管理员可以查看所有记录
CREATE POLICY "Admins can view all advanced KYC" ON public.advanced_kyc_verifications
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 管理员可以更新所有记录
CREATE POLICY "Admins can update all advanced KYC" ON public.advanced_kyc_verifications
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role));