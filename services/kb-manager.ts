/**
 * Knowledge Base Manager
 *
 * Core business logic for managing encrypted AI memory.
 * Handles: fetch, decrypt, merge, encrypt, save.
 */

import { supabase } from "@/lib/supabase";
import { getUserEncryptionKey } from "@/lib/secure-storage";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  PrivateKB,
  GeneralKB,
  RecentStateKB,
  GoalsProgressKB,
  UserPrivateKBRow,
  EMPTY_GENERAL_KB,
  EMPTY_STATE_KB,
  EMPTY_GOALS_PROGRESS_KB,
  CompactKBContext,
} from "@/types/kb-types";
import { Goal } from "./database";

// =====================================================
// FETCH & DECRYPT
// =====================================================

/**
 * Fetch the user's encrypted KB from Supabase and decrypt it locally
 * @returns Decrypted KB or empty KB if none exists
 */
export async function fetchAndDecryptKB(): Promise<PrivateKB> {
  try {
    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get encryption key
    const encryptionKey = await getUserEncryptionKey();

    // Fetch encrypted KB from database (don't use .single() to avoid 406)
    const { data, error } = await supabase
      .from("user_private_kb")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching KB:", error);
      throw error;
    }

    // If no KB exists yet, return empty KB
    if (!data || data.length === 0) {
      console.log("📝 No KB found, returning empty KB");
      return {
        general: EMPTY_GENERAL_KB,
        state_recent: EMPTY_STATE_KB,
        goals_progress: EMPTY_GOALS_PROGRESS_KB,
      };
    }

    const row = data[0] as UserPrivateKBRow;

    // Decrypt each section
    const general: GeneralKB = row.general_cipher
      ? JSON.parse(await decrypt(row.general_cipher, encryptionKey))
      : EMPTY_GENERAL_KB;

    const state_recent: RecentStateKB = row.state_recent_cipher
      ? JSON.parse(await decrypt(row.state_recent_cipher, encryptionKey))
      : EMPTY_STATE_KB;

    const goals_progress: GoalsProgressKB = row.goals_progress_cipher
      ? JSON.parse(await decrypt(row.goals_progress_cipher, encryptionKey))
      : EMPTY_GOALS_PROGRESS_KB;

    return {
      general,
      state_recent,
      goals_progress,
    };
  } catch (error) {
    console.error("Error in fetchAndDecryptKB:", error);
    throw error;
  }
}

// =====================================================
// ENCRYPT & SAVE
// =====================================================

/**
 * Encrypt the KB and save it to Supabase
 * @param kb - The KB to save
 * @param retryOnConflict - Whether to retry once if version mismatch
 */
export async function encryptAndSaveKB(
  kb: PrivateKB,
  retryOnConflict = true
): Promise<void> {
  try {
    // Get user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Get encryption key
    const encryptionKey = await getUserEncryptionKey();

    // Encrypt each section
    const general_cipher = await encrypt(JSON.stringify(kb.general), encryptionKey);
    const state_recent_cipher = await encrypt(
      JSON.stringify(kb.state_recent),
      encryptionKey
    );
    const goals_progress_cipher = await encrypt(
      JSON.stringify(kb.goals_progress),
      encryptionKey
    );

    // Check if row exists (don't use .single() to avoid 406)
    const { data: existingRows } = await supabase
      .from("user_private_kb")
      .select("id, version")
      .eq("user_id", user.id);

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    if (existing) {
      // Update existing row with optimistic locking
      const { error } = await supabase
        .from("user_private_kb")
        .update({
          general_cipher,
          state_recent_cipher,
          goals_progress_cipher,
          version: existing.version + 1,
        })
        .eq("user_id", user.id)
        .eq("version", existing.version); // Optimistic lock

      if (error) {
        console.error("Error updating KB:", error);

        // If version conflict and retry is enabled, refetch and try again
        if (error.code === "PGRST116" && retryOnConflict) {
          console.log("⚠️ Version conflict detected, retrying...");
          const currentKB = await fetchAndDecryptKB();
          const mergedKB = mergeKBs(currentKB, kb);
          await encryptAndSaveKB(mergedKB, false); // Don't retry again
          return;
        }

        throw error;
      }

      console.log("✅ KB updated successfully");
    } else {
      // Insert new row
      const { error } = await supabase.from("user_private_kb").insert({
        user_id: user.id,
        general_cipher,
        state_recent_cipher,
        goals_progress_cipher,
        version: 1,
      });

      if (error) {
        console.error("Error inserting KB:", error);
        throw error;
      }

      console.log("✅ KB created successfully");
    }
  } catch (error) {
    console.error("Error in encryptAndSaveKB:", error);
    throw error;
  }
}

// =====================================================
// MERGE LOGIC
// =====================================================

/**
 * Merge two KBs (for conflict resolution)
 * Strategy: Newer arrays override, numbers take max, strings take newer
 */
function mergeKBs(current: PrivateKB, incoming: PrivateKB): PrivateKB {
  return {
    general: {
      name_or_alias: incoming.general.name_or_alias || current.general.name_or_alias,
      bio: incoming.general.bio.length > 0 ? incoming.general.bio : current.general.bio,
      relationships:
        incoming.general.relationships.length > 0
          ? incoming.general.relationships
          : current.general.relationships,
      work_school:
        incoming.general.work_school.length > 0
          ? incoming.general.work_school
          : current.general.work_school,
      routines:
        incoming.general.routines.length > 0
          ? incoming.general.routines
          : current.general.routines,
      preferences:
        incoming.general.preferences.length > 0
          ? incoming.general.preferences
          : current.general.preferences,
      values:
        incoming.general.values.length > 0
          ? incoming.general.values
          : current.general.values,
      triggers_boundaries:
        incoming.general.triggers_boundaries.length > 0
          ? incoming.general.triggers_boundaries
          : current.general.triggers_boundaries,
    },
    state_recent: incoming.state_recent, // Always take newer state
    goals_progress: incoming.goals_progress, // Always take newer goals
  };
}

// =====================================================
// UPDATE KB (Merge new data into existing)
// =====================================================

/**
 * Update specific sections of the KB
 * @param updates - Partial KB updates
 */
export async function updateKB(updates: {
  general?: Partial<GeneralKB>;
  state_recent?: Partial<RecentStateKB>;
  goals_progress?: Partial<GoalsProgressKB>;
}): Promise<void> {
  try {
    // Fetch current KB
    const currentKB = await fetchAndDecryptKB();

    // Merge updates
    const updatedKB: PrivateKB = {
      general: { ...currentKB.general, ...updates.general },
      state_recent: { ...currentKB.state_recent, ...updates.state_recent },
      goals_progress: { ...currentKB.goals_progress, ...updates.goals_progress },
    };

    // Save
    await encryptAndSaveKB(updatedKB);
  } catch (error) {
    console.error("Error in updateKB:", error);
    throw error;
  }
}

// =====================================================
// SMART MERGE (AI-generated updates)
// =====================================================

/**
 * Intelligently merge AI-generated updates into existing KB
 * Deduplicates, limits array sizes, etc.
 */
export async function smartMergeKB(aiUpdates: {
  general?: Partial<GeneralKB>;
  state_recent?: Partial<RecentStateKB>;
  goals_progress?: GoalsProgressKB;
}): Promise<void> {
  try {
    const currentKB = await fetchAndDecryptKB();

    // Merge general facts (deduplicate, limit to ~20 items per array)
    const mergedGeneral: GeneralKB = {
      name_or_alias: aiUpdates.general?.name_or_alias || currentKB.general.name_or_alias,
      bio: dedupeAndLimit([...currentKB.general.bio, ...(aiUpdates.general?.bio || [])], 10),
      relationships: dedupeAndLimit(
        [...currentKB.general.relationships, ...(aiUpdates.general?.relationships || [])],
        15
      ),
      work_school: dedupeAndLimit(
        [...currentKB.general.work_school, ...(aiUpdates.general?.work_school || [])],
        10
      ),
      routines: dedupeAndLimit(
        [...currentKB.general.routines, ...(aiUpdates.general?.routines || [])],
        10
      ),
      preferences: dedupeAndLimit(
        [...currentKB.general.preferences, ...(aiUpdates.general?.preferences || [])],
        10
      ),
      values: dedupeAndLimit(
        [...currentKB.general.values, ...(aiUpdates.general?.values || [])],
        10
      ),
      triggers_boundaries: dedupeAndLimit(
        [
          ...currentKB.general.triggers_boundaries,
          ...(aiUpdates.general?.triggers_boundaries || []),
        ],
        10
      ),
    };

    // Merge recent state (replace most fields, keep year_summary)
    const mergedStateRecent: RecentStateKB = {
      window: "last_30_days",
      dominant_emotions:
        aiUpdates.state_recent?.dominant_emotions || currentKB.state_recent.dominant_emotions,
      mood_score_avg:
        aiUpdates.state_recent?.mood_score_avg ?? currentKB.state_recent.mood_score_avg,
      highs: aiUpdates.state_recent?.highs || currentKB.state_recent.highs,
      lows: aiUpdates.state_recent?.lows || currentKB.state_recent.lows,
      stressors: aiUpdates.state_recent?.stressors || currentKB.state_recent.stressors,
      protective_factors:
        aiUpdates.state_recent?.protective_factors || currentKB.state_recent.protective_factors,
      red_flags: aiUpdates.state_recent?.red_flags || currentKB.state_recent.red_flags,
      suggested_focus:
        aiUpdates.state_recent?.suggested_focus || currentKB.state_recent.suggested_focus,
      year_summary: currentKB.state_recent.year_summary, // Keep existing year summary
    };

    // Merge goals progress (replace entirely with AI updates)
    const mergedGoalsProgress: GoalsProgressKB =
      aiUpdates.goals_progress || currentKB.goals_progress;

    const updatedKB: PrivateKB = {
      general: mergedGeneral,
      state_recent: mergedStateRecent,
      goals_progress: mergedGoalsProgress,
    };

    await encryptAndSaveKB(updatedKB);
    console.log("✅ KB smart-merged successfully");
  } catch (error) {
    console.error("Error in smartMergeKB:", error);
    throw error;
  }
}

// =====================================================
// COMPACT CONTEXT (for AI chat)
// =====================================================

/**
 * Create a compact context summary for AI chat
 * @param kb - Full KB
 * @param currentGoals - User's current goals from database
 * @returns Compact context object
 */
export function createCompactContext(kb: PrivateKB, currentGoals: Goal[]): CompactKBContext {
  // Extract 3-7 key general facts
  const general_facts: string[] = [];
  if (kb.general.name_or_alias) general_facts.push(`Name: ${kb.general.name_or_alias}`);
  general_facts.push(...kb.general.bio.slice(0, 3));
  general_facts.push(...kb.general.values.slice(0, 2));
  general_facts.push(...kb.general.preferences.slice(0, 2));

  // Extract 2-4 highlights from recent state
  const recent_highlights: string[] = [];
  if (kb.state_recent.dominant_emotions.length > 0) {
    recent_highlights.push(
      `Recent emotions: ${kb.state_recent.dominant_emotions.slice(0, 3).join(", ")}`
    );
  }
  if (kb.state_recent.mood_score_avg !== null) {
    recent_highlights.push(`Avg mood (30d): ${kb.state_recent.mood_score_avg.toFixed(1)}/5`);
  }
  recent_highlights.push(...kb.state_recent.highs.slice(0, 2));
  recent_highlights.push(...kb.state_recent.stressors.slice(0, 2));

  // Extract 1-2 relevant goals
  const relevant_goals = kb.goals_progress.goals
    .slice(0, 2)
    .map((gp) => {
      const goal = currentGoals.find((g) => g.id === gp.goal_id);
      return {
        goal_text: goal?.text || "Unknown goal",
        progress_percent: gp.progress_percent,
        next_actions: gp.next_actions.slice(0, 2),
      };
    })
    .filter((g) => g.goal_text !== "Unknown goal");

  return {
    general_facts: general_facts.slice(0, 7),
    recent_highlights: recent_highlights.slice(0, 4),
    relevant_goals,
  };
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Deduplicate array and limit to max items (keeping most recent)
 */
function dedupeAndLimit(arr: string[], maxItems: number): string[] {
  const unique = Array.from(new Set(arr));
  return unique.slice(-maxItems); // Keep most recent
}

/**
 * Delete the user's KB (WARNING: Irreversible!)
 */
export async function deleteKB(): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { error } = await supabase.from("user_private_kb").delete().eq("user_id", user.id);

    if (error) {
      console.error("Error deleting KB:", error);
      throw error;
    }

    console.log("🗑️ KB deleted");
  } catch (error) {
    console.error("Error in deleteKB:", error);
    throw error;
  }
}
