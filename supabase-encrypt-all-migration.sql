-- =====================================================
-- Full Encryption Migration
-- =====================================================
-- Adds encrypted columns for journal entries, insights, and chat messages
-- After this migration, all sensitive text will be encrypted client-side
-- =====================================================

-- Add encrypted columns to journal_entries
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS entry_text_encrypted TEXT;

-- Add encrypted columns to insights
ALTER TABLE insights
  ADD COLUMN IF NOT EXISTS reflection_encrypted TEXT;

-- Add encrypted columns to chat_messages
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS content_encrypted TEXT;

-- =====================================================
-- MIGRATION STRATEGY
-- =====================================================
-- For existing data:
-- 1. Keep old plaintext columns temporarily (entry_text, reflection, content)
-- 2. New entries will use encrypted columns
-- 3. App will try encrypted column first, fall back to plaintext
-- 4. After migration period, can drop plaintext columns
--
-- To complete migration (run later after all data is encrypted):
-- ALTER TABLE journal_entries DROP COLUMN entry_text;
-- ALTER TABLE insights DROP COLUMN reflection;
-- ALTER TABLE chat_messages DROP COLUMN content;
-- =====================================================

-- Add comment to document encryption
COMMENT ON COLUMN journal_entries.entry_text_encrypted IS 'Client-side encrypted journal entry text (AES-256-GCM)';
COMMENT ON COLUMN insights.reflection_encrypted IS 'Client-side encrypted AI reflection (AES-256-GCM)';
COMMENT ON COLUMN chat_messages.content_encrypted IS 'Client-side encrypted chat message content (AES-256-GCM)';
