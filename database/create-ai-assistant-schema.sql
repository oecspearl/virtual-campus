-- AI Assistant Database Schema
-- This file creates the necessary tables for AI assistant functionality

-- AI Conversations Table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Messages Table
CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Usage Tracking Table
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_calls INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 4) DEFAULT 0.00,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- AI Context Cache Table
CREATE TABLE IF NOT EXISTS ai_context_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context_key VARCHAR(255) NOT NULL,
  context_data JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, context_key)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tracking_user_date ON ai_usage_tracking(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_user_key ON ai_context_cache(user_id, context_key);
CREATE INDEX IF NOT EXISTS idx_ai_context_cache_expires ON ai_context_cache(expires_at);

-- RLS Policies for AI Conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_context_cache ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view their own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON ai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only access messages from their conversations
CREATE POLICY "Users can view messages from their conversations" ON ai_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their conversations" ON ai_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages from their conversations" ON ai_messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their conversations" ON ai_messages
  FOR DELETE USING (
    conversation_id IN (
      SELECT id FROM ai_conversations WHERE user_id = auth.uid()
    )
  );

-- Users can only access their own usage tracking
CREATE POLICY "Users can view their own usage tracking" ON ai_usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage tracking" ON ai_usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage tracking" ON ai_usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only access their own context cache
CREATE POLICY "Users can view their own context cache" ON ai_context_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context cache" ON ai_context_cache
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context cache" ON ai_context_cache
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own context cache" ON ai_context_cache
  FOR DELETE USING (auth.uid() = user_id);

-- Functions for AI Assistant
CREATE OR REPLACE FUNCTION get_user_ai_usage_today(user_uuid UUID)
RETURNS TABLE(api_calls INTEGER, tokens_used INTEGER, cost_usd DECIMAL(10, 4)) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ut.api_calls, 0) as api_calls,
    COALESCE(ut.tokens_used, 0) as tokens_used,
    COALESCE(ut.cost_usd, 0.00) as cost_usd
  FROM ai_usage_tracking ut
  WHERE ut.user_id = user_uuid 
    AND ut.date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired context cache
CREATE OR REPLACE FUNCTION cleanup_expired_ai_context()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ai_context_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update AI usage
CREATE OR REPLACE FUNCTION update_ai_usage(
  user_uuid UUID,
  additional_calls INTEGER DEFAULT 1,
  additional_tokens INTEGER DEFAULT 0,
  additional_cost DECIMAL(10, 4) DEFAULT 0.00
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ai_usage_tracking (user_id, api_calls, tokens_used, cost_usd, date)
  VALUES (user_uuid, additional_calls, additional_tokens, additional_cost, CURRENT_DATE)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    api_calls = ai_usage_tracking.api_calls + additional_calls,
    tokens_used = ai_usage_tracking.tokens_used + additional_tokens,
    cost_usd = ai_usage_tracking.cost_usd + additional_cost,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ai_conversations TO authenticated;
GRANT ALL ON ai_messages TO authenticated;
GRANT ALL ON ai_usage_tracking TO authenticated;
GRANT ALL ON ai_context_cache TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_ai_usage_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_ai_context() TO authenticated;
GRANT EXECUTE ON FUNCTION update_ai_usage(UUID, INTEGER, INTEGER, DECIMAL) TO authenticated;
