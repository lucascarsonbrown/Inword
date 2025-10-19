import { supabase } from "@/lib/supabase";
import { getUserEncryptionKey } from "@/lib/secure-storage";
import { encrypt, decrypt } from "@/lib/encryption";

// =====================================================
// HELPER: Decrypt journal entries
// =====================================================
async function decryptJournalEntries(entries: any[]): Promise<JournalEntry[]> {
  if (entries.length === 0) return [];

  try {
    const encryptionKey = await getUserEncryptionKey();

    const decrypted = await Promise.all(
      entries.map(async (entry) => {
        // Try encrypted column first, fall back to plaintext (for migration)
        let entryText = entry.entry_text || "";

        if (entry.entry_text_encrypted) {
          try {
            entryText = await decrypt(entry.entry_text_encrypted, encryptionKey);
          } catch (err) {
            console.error("Failed to decrypt entry:", entry.id, err);
            entryText = "[Encrypted - cannot decrypt]";
          }
        }

        return {
          ...entry,
          entry_text: entryText,
        };
      })
    );

    return decrypted;
  } catch (error) {
    console.error("Error decrypting entries:", error);
    return entries; // Return as-is if decryption fails
  }
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_text: string;
  rating: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  journal_entry_id: string;
  reflection: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  journal_entry_id: string;
  role: "user" | "ai";
  content: string;
  created_at: string;
}

/**
 * Check if user has a journal entry for today (with decryption)
 */
export async function getTodayEntry(): Promise<JournalEntry | null> {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching today's entry:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // If table doesn't exist or RLS is blocking, return null instead of throwing
      if (error.code === "42P01" || error.code === "PGRST116") {
        console.warn("Table might not exist yet or no rows found. Please run the schema SQL.");
        return null;
      }

      throw error;
    }

    if (!data || data.length === 0) return null;

    // Decrypt entry
    const decrypted = await decryptJournalEntries(data);
    return decrypted[0];
  } catch (err) {
    console.error("Unexpected error in getTodayEntry:", err);
    return null; // Graceful fallback
  }
}

/**
 * Get all entries for a specific date (with decryption)
 */
export async function getEntriesByDate(date: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching entries by date:", error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  return await decryptJournalEntries(data);
}

/**
 * Get all entries for the current month (with decryption)
 */
export async function getMonthEntries(year: number, month: number): Promise<JournalEntry[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  if (error) {
    console.error("Error fetching month entries:", error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  return await decryptJournalEntries(data);
}

/**
 * Create a new journal entry (with client-side encryption)
 */
export async function createJournalEntry(
  entryText: string,
  rating: number
): Promise<JournalEntry> {
  console.log("📝 createJournalEntry called");
  console.log("   Entry length:", entryText.length);
  console.log("   Rating:", rating);

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("❌ User not authenticated");
    throw new Error("You must be signed in to create a journal entry");
  }

  console.log("✅ User authenticated:", user.id);
  console.log("   Email:", user.email);

  // Get encryption key and encrypt entry text
  console.log("🔐 Getting encryption key...");
  const encryptionKey = await getUserEncryptionKey();
  console.log("✅ Encryption key obtained");

  console.log("🔐 Encrypting entry text...");
  const entryTextEncrypted = await encrypt(entryText, encryptionKey);
  console.log("✅ Entry text encrypted, length:", entryTextEncrypted.length);

  const today = new Date().toISOString().split("T")[0];
  console.log("📅 Date:", today);

  console.log("💾 Inserting into journal_entries table...");
  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: user.id,
      entry_text_encrypted: entryTextEncrypted, // Store encrypted
      entry_text: "", // Keep empty for migration compatibility
      rating,
      date: today,
    })
    .select()
    .single();

  if (error) {
    console.error("❌ Error creating journal entry:", error);
    console.error("   Error code:", error.code);
    console.error("   Error message:", error.message);
    console.error("   Error details:", JSON.stringify(error, null, 2));

    // Check for common errors
    if (error.code === "42P01") {
      throw new Error("Database table 'journal_entries' does not exist. Please run the SQL schema in Supabase.");
    } else if (error.code === "PGRST116") {
      throw new Error("No rows returned. This might be an RLS policy issue.");
    } else {
      throw new Error(error.message || "Failed to create journal entry");
    }
  }

  console.log("✅ Journal entry created in database:", data.id);

  // Decrypt before returning to app
  const decryptedData = {
    ...data,
    entry_text: entryText, // Use original plaintext in memory
  };

  return decryptedData;
}

/**
 * Create an insight for a journal entry (with client-side encryption)
 */
export async function createInsight(
  journalEntryId: string,
  reflection: string
): Promise<Insight> {
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create insights");
  }

  // Encrypt reflection
  const encryptionKey = await getUserEncryptionKey();
  const reflectionEncrypted = await encrypt(reflection, encryptionKey);

  const { data, error } = await supabase
    .from("insights")
    .insert({
      user_id: user.id,
      journal_entry_id: journalEntryId,
      reflection_encrypted: reflectionEncrypted,
      reflection: "", // Keep empty for migration
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating insight:", error);
    throw new Error(error.message || "Failed to create insight");
  }

  // Return with decrypted reflection
  return {
    ...data,
    reflection,
  };
}

/**
 * Get insight for a journal entry (with decryption)
 */
export async function getInsightByEntryId(journalEntryId: string): Promise<Insight | null> {
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("journal_entry_id", journalEntryId)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching insight:", error);
    throw error;
  }

  if (!data) return null;

  // Decrypt reflection if encrypted
  try {
    if (data.reflection_encrypted) {
      const encryptionKey = await getUserEncryptionKey();
      const decryptedReflection = await decrypt(data.reflection_encrypted, encryptionKey);
      return {
        ...data,
        reflection: decryptedReflection,
      };
    }
  } catch (err) {
    console.error("Failed to decrypt insight:", err);
    // Fall back to plaintext if decryption fails
  }

  return data;
}

/**
 * Get chat messages for a journal entry (with decryption)
 */
export async function getChatMessages(journalEntryId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("journal_entry_id", journalEntryId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching chat messages:", error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  // Decrypt messages if encrypted
  try {
    const encryptionKey = await getUserEncryptionKey();

    const decryptedMessages = await Promise.all(
      data.map(async (msg) => {
        // Try encrypted column first, fall back to plaintext
        let content = msg.content || "";

        if (msg.content_encrypted) {
          try {
            content = await decrypt(msg.content_encrypted, encryptionKey);
          } catch (err) {
            console.error("Failed to decrypt chat message:", msg.id, err);
            content = "[Encrypted - cannot decrypt]";
          }
        }

        return {
          ...msg,
          content,
        };
      })
    );

    return decryptedMessages;
  } catch (error) {
    console.error("Error decrypting chat messages:", error);
    return data; // Return as-is if decryption fails
  }
}

/**
 * Add a chat message (with client-side encryption)
 */
export async function addChatMessage(
  journalEntryId: string,
  role: "user" | "ai",
  content: string
): Promise<ChatMessage> {
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to add chat messages");
  }

  // Encrypt content
  const encryptionKey = await getUserEncryptionKey();
  const contentEncrypted = await encrypt(content, encryptionKey);

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      user_id: user.id,
      journal_entry_id: journalEntryId,
      role,
      content_encrypted: contentEncrypted,
      content: "", // Keep empty for migration
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding chat message:", error);
    throw new Error(error.message || "Failed to add chat message");
  }

  // Return with decrypted content
  return {
    ...data,
    content,
  };
}

/**
 * Get dates that have entries for calendar view
 */
export async function getEntryDates(year: number, month: number): Promise<string[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("journal_entries")
    .select("date")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Error fetching entry dates:", error);
    throw error;
  }

  // Return unique dates
  return [...new Set(data?.map((entry) => entry.date) || [])];
}

/**
 * Check if user has completed onboarding (has goals)
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (error) {
      console.error("Error checking onboarding status:", error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error("Error in hasCompletedOnboarding:", error);
    return false;
  }
}

export interface Goal {
  id: string;
  user_id: string;
  text: string;
  timeframe: number;
  importance: number;
  ai_progress: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all goals for the current user
 */
export async function getUserGoals(): Promise<Goal[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("importance", { ascending: false });

    if (error) {
      console.error("Error fetching goals:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getUserGoals:", error);
    return [];
  }
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  updates: Partial<Pick<Goal, "text" | "timeframe" | "importance" | "ai_progress">>
): Promise<Goal> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("goals")
    .update(updates)
    .eq("id", goalId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Error updating goal:", error);
    throw error;
  }

  return data;
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting goal:", error);
    throw error;
  }
}

/**
 * Create a new goal
 */
export async function createGoal(
  text: string,
  timeframe: number,
  importance: number
): Promise<Goal> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      text,
      timeframe,
      importance,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating goal:", error);
    throw error;
  }

  return data;
}
