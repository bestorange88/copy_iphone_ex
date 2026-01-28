-- Create mining products table
CREATE TABLE public.mining_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  daily_rate NUMERIC NOT NULL DEFAULT 0,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC,
  period_days INTEGER NOT NULL DEFAULT 1,
  is_free BOOLEAN DEFAULT false,
  expected_profit NUMERIC NOT NULL DEFAULT 0,
  icon_type TEXT DEFAULT 'cpu',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user mining rentals table
CREATE TABLE public.user_mining_rentals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.mining_products(id),
  amount NUMERIC NOT NULL,
  daily_profit NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_profit_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mining_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mining_rentals ENABLE ROW LEVEL SECURITY;

-- Mining products policies (public read)
CREATE POLICY "Anyone can view active mining products"
ON public.mining_products FOR SELECT
USING (is_active = true);

-- User mining rentals policies
CREATE POLICY "Users can view their own rentals"
ON public.user_mining_rentals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rentals"
ON public.user_mining_rentals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rentals"
ON public.user_mining_rentals FOR UPDATE
USING (auth.uid() = user_id);

-- Insert default mining products
INSERT INTO public.mining_products (name, description, daily_rate, min_amount, max_amount, period_days, is_free, expected_profit, icon_type, sort_order) VALUES
('體驗礦機', '免費體驗3天，每日產出3 USDT', 0, 0, 0, 3, true, 9, 'gift', 1),
('FPGA 礦機', '高效能FPGA芯片，穩定收益', 0.5, 1000, 10000, 30, false, 0, 'cpu', 2),
('IPFS 礦機', '分布式存儲挖礦，收益更高', 0.8, 10000, 50000, 30, false, 0, 'hard-drive', 3),
('GPU 礦機', '頂級GPU算力，極致收益', 1.2, 50000, 100000, 30, false, 0, 'server', 4);

-- Trigger for updated_at
CREATE TRIGGER update_mining_products_updated_at
BEFORE UPDATE ON public.mining_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_mining_rentals_updated_at
BEFORE UPDATE ON public.user_mining_rentals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();