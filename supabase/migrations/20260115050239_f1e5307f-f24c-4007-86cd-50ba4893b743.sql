-- Create user_transfers table for account transfer records
CREATE TABLE public.user_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account VARCHAR(50) NOT NULL,
  to_account VARCHAR(50) NOT NULL,
  currency VARCHAR(20) NOT NULL,
  amount NUMERIC NOT NULL,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view their own transfers
CREATE POLICY "Users can view their own transfers"
  ON public.user_transfers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own transfers
CREATE POLICY "Users can create their own transfers"
  ON public.user_transfers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_transfers_user_id ON public.user_transfers(user_id);
CREATE INDEX idx_user_transfers_created_at ON public.user_transfers(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_user_transfers_updated_at
  BEFORE UPDATE ON public.user_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();