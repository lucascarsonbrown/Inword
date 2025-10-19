/**
 * Database Verification Script
 *
 * Run this to check if your Supabase database is properly set up.
 *
 * Usage:
 *   npx ts-node scripts/verify-database.ts
 */

import { supabase } from "../lib/supabase";

async function verifyDatabase() {
  console.log("🔍 Verifying Supabase Database Setup...\n");

  let allGood = true;

  // Check 1: Can we connect to Supabase?
  console.log("1️⃣ Testing Supabase connection...");
  try {
    const { data, error } = await supabase.from("journal_entries").select("count", { count: "exact", head: true });

    if (error) {
      if (error.code === "42P01") {
        console.log("   ❌ Table 'journal_entries' does not exist");
        console.log("   → You need to run supabase-schema.sql");
        allGood = false;
      } else {
        console.log("   ⚠️ Error:", error.message);
        console.log("   Code:", error.code);
        allGood = false;
      }
    } else {
      console.log("   ✅ Connected to Supabase successfully");
    }
  } catch (err) {
    console.log("   ❌ Connection failed:", err);
    allGood = false;
  }

  // Check 2: Do all required tables exist?
  console.log("\n2️⃣ Checking required tables...");
  const tables = ["journal_entries", "insights", "chat_messages", "goals", "user_private_kb"];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select("count", { count: "exact", head: true });

      if (error && error.code === "42P01") {
        console.log(`   ❌ Table '${table}' does not exist`);
        allGood = false;
      } else if (error) {
        console.log(`   ⚠️ Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`   ❌ Table '${table}' - Error checking`);
      allGood = false;
    }
  }

  // Check 3: Do encrypted columns exist?
  console.log("\n3️⃣ Checking encrypted columns...");
  try {
    const { error } = await supabase
      .from("journal_entries")
      .select("entry_text_encrypted")
      .limit(1);

    if (error && error.message.includes("entry_text_encrypted")) {
      console.log("   ❌ Column 'entry_text_encrypted' does not exist");
      console.log("   → You need to run supabase-encrypt-all-migration.sql");
      allGood = false;
    } else {
      console.log("   ✅ Encrypted columns exist");
    }
  } catch (err) {
    console.log("   ⚠️ Could not verify encrypted columns");
  }

  // Check 4: Can we authenticate?
  console.log("\n4️⃣ Checking authentication...");
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      console.log("   ✅ User is authenticated:", user.email);
    } else {
      console.log("   ⚠️ No user authenticated (this is OK if you haven't signed in yet)");
    }
  } catch (err) {
    console.log("   ❌ Auth check failed:", err);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  if (allGood) {
    console.log("✅ Database is properly configured!");
    console.log("\nYour app should work now. Try creating a journal entry.");
  } else {
    console.log("❌ Database setup incomplete");
    console.log("\n📋 Action Required:");
    console.log("1. Go to https://supabase.com/dashboard/project/dkhocivmblgkklofgmrp/sql");
    console.log("2. Run supabase-schema.sql");
    console.log("3. Run supabase-encrypt-all-migration.sql");
    console.log("4. Run supabase-private-kb-schema.sql");
    console.log("\nSee DATABASE_SETUP.md for detailed instructions.");
  }
  console.log("=".repeat(60) + "\n");
}

verifyDatabase().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
