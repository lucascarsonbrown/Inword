-- =====================================================
-- Private Knowledge Base (Encrypted AI Memory)
-- =====================================================
-- This table stores encrypted AI memory about each user.
-- All data is encrypted client-side before being stored.
-- Even admins cannot read the plaintext data.
-- =====================================================

-- Drop existing table and policies if they exist (for safe re-runs)
DROP POLICY IF EXISTS "Users can only access their own KB" ON user_private_kb;
DROP POLICY IF EXISTS "Users can insert their own KB" ON user_private_kb;
DROP POLICY IF EXISTS "Users can update their own KB" ON user_private_kb;
DROP TABLE IF EXISTS user_private_kb;

-- Create the encrypted KB table
CREATE TABLE user_private_kb (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Encrypted memory sections (stored as base64-encoded ciphertext)
  general_cipher TEXT,
  state_recent_cipher TEXT,
  goals_progress_cipher TEXT,

  -- Optional: encrypted key backup (wrapped with user passphrase)
  encrypted_key_backup TEXT,

  -- Versioning for optimistic concurrency
  version INTEGER DEFAULT 1 NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure one row per user
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE user_private_kb ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT their own KB
CREATE POLICY "Users can only access their own KB"
  ON user_private_kb
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can INSERT their own KB (first time)
CREATE POLICY "Users can insert their own KB"
  ON user_private_kb
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can UPDATE their own KB
CREATE POLICY "Users can update their own KB"
  ON user_private_kb
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_private_kb_user_id ON user_private_kb(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_private_kb_updated_at
  BEFORE UPDATE ON user_private_kb
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- IMPORTANT PRIVACY NOTE
-- =====================================================
-- This table stores ENCRYPTED data only.
-- The encryption keys are stored locally on user devices.
-- No one, including database administrators, can decrypt
-- this data without the user's device-specific key.
-- =====================================================
