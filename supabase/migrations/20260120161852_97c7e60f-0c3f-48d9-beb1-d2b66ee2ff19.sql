-- 1. 为 system_messages 表添加 RLS 策略允许插入
DROP POLICY IF EXISTS "Service role can insert messages" ON system_messages;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON system_messages;

-- 允许 service role 插入（Edge Function 使用 service role）
CREATE POLICY "Service role can insert messages" ON system_messages
  FOR INSERT WITH CHECK (true);

-- 允许用户读取自己的消息
DROP POLICY IF EXISTS "Users can read own messages" ON system_messages;
CREATE POLICY "Users can read own messages" ON system_messages
  FOR SELECT USING (auth.uid() = user_id);

-- 允许用户更新自己的消息（标记已读）
DROP POLICY IF EXISTS "Users can update own messages" ON system_messages;
CREATE POLICY "Users can update own messages" ON system_messages
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. 确保 profiles 表有 VIP 列（如果不存在则添加）
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_vip') THEN
    ALTER TABLE profiles ADD COLUMN is_vip BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'vip_level') THEN
    ALTER TABLE profiles ADD COLUMN vip_level INTEGER DEFAULT 0;
  END IF;
END $$;