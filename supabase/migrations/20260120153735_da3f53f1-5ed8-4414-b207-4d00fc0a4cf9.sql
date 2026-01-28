-- Create system_messages table
CREATE TABLE public.system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_system_messages_user_id ON public.system_messages(user_id);
CREATE INDEX idx_system_messages_is_read ON public.system_messages(user_id, is_read);

-- Enable RLS
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view their own system messages"
ON public.system_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own system messages"
ON public.system_messages
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_messages;