-- First, drop policies that depend on user_id column
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON cs_messages;
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON cs_messages;
DROP POLICY IF EXISTS "Users can view own conversations" ON cs_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON cs_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON cs_conversations;

-- Change user_id column from UUID to TEXT to support guest users
ALTER TABLE cs_conversations 
ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- Recreate RLS policies with TEXT comparison
CREATE POLICY "Users can view own conversations" ON cs_conversations
FOR SELECT USING (
  user_id = auth.uid()::TEXT OR 
  user_id LIKE 'guest-%'
);

CREATE POLICY "Users can insert own conversations" ON cs_conversations
FOR INSERT WITH CHECK (
  user_id = auth.uid()::TEXT OR 
  user_id LIKE 'guest-%'
);

CREATE POLICY "Users can update own conversations" ON cs_conversations
FOR UPDATE USING (
  user_id = auth.uid()::TEXT OR 
  user_id LIKE 'guest-%'
);

-- Messages policies - allow access to messages in conversations user owns
CREATE POLICY "Users can view messages in own conversations" ON cs_messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM cs_conversations c 
    WHERE c.id = conversation_id 
    AND (c.user_id = auth.uid()::TEXT OR c.user_id LIKE 'guest-%')
  )
);

CREATE POLICY "Users can insert messages in own conversations" ON cs_messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM cs_conversations c 
    WHERE c.id = conversation_id 
    AND (c.user_id = auth.uid()::TEXT OR c.user_id LIKE 'guest-%')
  )
);