# How to Check if Database is Set Up

## Quick 2-Minute Check

### 1. Open Supabase Table Editor
Go to: https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/editor

### 2. Look for These Tables

In the left sidebar under "Tables", you should see:

```
✅ goals
✅ journal_entries
✅ insights
✅ chat_messages
✅ user_private_kb
```

### 3. Check the journal_entries Columns

Click on `journal_entries` table, then look at the column headers.

You should see these columns:
- id
- user_id
- entry_text (old, for migration)
- **entry_text_encrypted** ← THIS IS CRITICAL
- rating
- date
- created_at
- updated_at

---

## What You'll See:

### ✅ Database IS Set Up
Screenshot would show:
- 5 tables in the left sidebar
- journal_entries has `entry_text_encrypted` column
- insights has `reflection_encrypted` column
- chat_messages has `content_encrypted` column

### ❌ Database NOT Set Up
You'll see:
- "No tables found" message
- OR missing tables
- OR tables exist but no `_encrypted` columns

---

## If NOT Set Up:

You need to run the SQL scripts. Here's how:

### Step 1: Go to SQL Editor
https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/sql

### Step 2: Run Schema #1
1. Open file: `supabase-schema.sql` (in your project folder)
2. Copy ALL the text
3. Paste into SQL Editor
4. Click "Run" button (or press Cmd+Enter)
5. Wait for "Success" message

### Step 3: Run Schema #2
1. Open file: `supabase-encrypt-all-migration.sql`
2. Copy ALL the text
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success"

### Step 4: Run Schema #3
1. Open file: `supabase-private-kb-schema.sql`
2. Copy ALL the text
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success"

### Step 5: Verify
Go back to Table Editor and you should now see all 5 tables!

---

## Still Having Issues?

After running the SQL scripts:
1. Refresh the Table Editor page
2. Check that all 5 tables appear
3. Click on journal_entries and verify `entry_text_encrypted` column exists

If tables still don't show up:
- Check the SQL Editor for error messages
- Make sure you're looking at the correct Supabase project
- Try running the scripts again (they're safe to re-run)
