# Database Setup Guide

## Overview
Your app uses Supabase as the backend database with client-side encryption. All sensitive data (journal entries, insights, chat messages) is encrypted on your device before being sent to Supabase.

## ⚠️ IMPORTANT: Database Schema Setup Required

For your app to work, you **MUST** run the SQL schema files in your Supabase dashboard. Without this, the app cannot save any data.

## Setup Steps

### 1. Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/sql
2. Click on "SQL Editor" in the left sidebar

### 2. Run the Base Schema

1. Open the file `supabase-schema.sql` in your project
2. Copy ALL the contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see a success message

**This creates:**
- `goals` table
- `journal_entries` table
- `insights` table
- `chat_messages` table
- All necessary indexes and Row Level Security (RLS) policies

### 3. Run the Encryption Migration

1. Open the file `supabase-encrypt-all-migration.sql` in your project
2. Copy ALL the contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see a success message

**This adds:**
- `entry_text_encrypted` column to `journal_entries`
- `reflection_encrypted` column to `insights`
- `content_encrypted` column to `chat_messages`

### 4. Run the Private KB Schema

1. Open the file `supabase-private-kb-schema.sql` in your project
2. Copy ALL the contents
3. Paste into the Supabase SQL Editor
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see a success message

**This creates:**
- `user_private_kb` table for storing your encrypted knowledge base

## Verification

After running all three SQL files, verify the tables exist:

1. In Supabase dashboard, go to "Table Editor"
2. You should see these tables:
   - ✅ goals
   - ✅ journal_entries
   - ✅ insights
   - ✅ chat_messages
   - ✅ user_private_kb

3. Click on `journal_entries` and verify it has these columns:
   - id
   - user_id
   - entry_text (for migration)
   - **entry_text_encrypted** (this is what the app uses)
   - rating
   - date
   - created_at
   - updated_at

## Security Features

### Row Level Security (RLS)
All tables have RLS enabled, which means:
- Users can ONLY see their own data
- The database enforces this at the SQL level
- Even if someone steals your API key, they can't access other users' data

### Client-Side Encryption
- All sensitive text is encrypted on your device before sending to Supabase
- Encryption key is stored in iOS Keychain / Android Keystore (never leaves your device)
- Even Supabase admins cannot read your journal entries
- Algorithm: AES-256-GCM (industry standard)

## Troubleshooting

### "No data showing up in the app"
- ✅ Make sure you ran ALL THREE SQL files (base schema, encryption migration, KB schema)
- ✅ Check that you're logged in (check the auth tab in app)
- ✅ Check the Expo console logs for any errors

### "Error creating journal entry"
- ✅ Run the SQL scripts again (they're safe to re-run)
- ✅ Check that RLS policies exist (they should be created automatically)
- ✅ Make sure you're authenticated in the app

### "Cannot decrypt entries"
- This means your encryption key was lost (usually after reinstalling the app)
- Unfortunately, encrypted data cannot be recovered without the key
- This is a security feature - even you cannot decrypt your old data without the key

## What Happens When You Create a Journal Entry

1. You type your journal entry in the app
2. The app generates a random encryption key (stored in device keychain)
3. Your entry text is encrypted with AES-256-GCM
4. The encrypted text is sent to Supabase
5. Supabase stores the encrypted text
6. When you view the entry, it's decrypted on your device
7. The plaintext never touches Supabase servers

## Database Schema Files

- **supabase-schema.sql** - Base tables and RLS policies
- **supabase-encrypt-all-migration.sql** - Adds encrypted columns
- **supabase-private-kb-schema.sql** - Knowledge base table
- **supabase-schema-safe.sql** - (Alternative, check what this contains if needed)

## Need Help?

If you're still having issues:
1. Check the console logs in Expo
2. Verify all tables exist in Supabase Table Editor
3. Try signing out and back in
4. Make sure your .env file has the correct Supabase credentials
