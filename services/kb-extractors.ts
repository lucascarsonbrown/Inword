/**
 * KB Extractors - AI-powered knowledge extraction from journal entries
 *
 * Uses Supabase Edge Functions to keep API keys secure
 */

import { supabase } from "@/lib/supabase";
import { GeneralKB, RecentStateKB, GoalsProgressKB } from "@/types/kb-types";
import { JournalEntry, Goal } from "./database";

/**
 * Run all KB extractors and return combined updates
 * Uses Supabase Edge Function to keep API key secure
 */
export async function extractAllKBUpdates(
  currentEntry: JournalEntry,
  recentEntries: JournalEntry[], // Last 30 days including current
  goals: Goal[],
  currentKB: {
    general: GeneralKB;
    state_recent: RecentStateKB;
    goals_progress: GoalsProgressKB;
  }
): Promise<{
  general: Partial<GeneralKB>;
  state_recent: Partial<RecentStateKB>;
  goals_progress: GoalsProgressKB;
}> {
  console.log("🧠 Extracting KB updates from journal entry...");

  try {
    const { data: result, error } = await supabase.functions.invoke('extract-kb', {
      body: {
        type: 'all',
        currentEntry,
        recentEntries,
        goals,
        currentKB,
      },
    });

    if (error) {
      console.error("❌ Edge Function error:", error);
      throw error;
    }

    console.log("✅ KB extraction complete");

    return {
      general: result.general || {},
      state_recent: result.state_recent || {},
      goals_progress: result.goals_progress || { goals: [], updated_at: new Date().toISOString() },
    };
  } catch (error) {
    console.error("Error in extractAllKBUpdates:", error);
    throw error;
  }
}
