-- 創建站內公告表（用於跑馬燈顯示）
CREATE TABLE public.platform_notices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  link_url TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 添加索引
CREATE INDEX idx_platform_notices_active ON public.platform_notices (is_active, priority DESC);

-- 啟用 RLS
ALTER TABLE public.platform_notices ENABLE ROW LEVEL SECURITY;

-- 所有用戶可讀取活動公告
CREATE POLICY "Anyone can read active notices" 
  ON public.platform_notices 
  FOR SELECT 
  USING (is_active = true);

-- 添加觸發器自動更新 updated_at
CREATE TRIGGER update_platform_notices_updated_at
  BEFORE UPDATE ON public.platform_notices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();