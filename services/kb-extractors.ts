/**
 * KB Extractors - AI-powered knowledge extraction from journal entries
 *
 * Uses structured prompts to extract and update different parts of the KB
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "@/services/gemini";
import { GeneralKB, RecentStateKB, GoalsProgressKB, GoalProgressItem } from "@/types/kb-types";
import { JournalEntry, Goal } from "./database";
import {
  createGeneralFactsPrompt,
  createRecentStatePrompt,
  createGoalsProgressPrompt,
} from "@/config/kb-prompts";

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// =====================================================
// 1. GENERAL FACTS EXTRACTOR
// =====================================================

/**
 * Extract stable, long-term facts about the user from journal entry
 */
export async function extractGeneralFacts(
  entry: JournalEntry,
  currentGeneral: GeneralKB
): Promise<Partial<GeneralKB>> {
  const prompt = createGeneralFactsPrompt(entry, currentGeneral);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON (remove markdown code blocks if present)
    const jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const extracted = JSON.parse(jsonText) as Partial<GeneralKB>;

    return extracted;
  } catch (error) {
    console.error("Error extracting general facts:", error);
    return {}; // Return empty on error
  }
}

// =====================================================
// 2. RECENT STATE UPDATER
// =====================================================

/**
 * Update recent mental/emotional state from last 30 days of entries
 */
export async function updateRecentState(
  recentEntries: JournalEntry[], // Last 30 days
  currentState: RecentStateKB
): Promise<Partial<RecentStateKB>> {
  // Calculate average mood
  const ratings = recentEntries.map((e) => e.rating);
  const avgMood = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  const prompt = createRecentStatePrompt(recentEntries, currentState, avgMood);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const extracted = JSON.parse(jsonText) as Partial<RecentStateKB>;

    return {
      ...extracted,
      window: "last_30_days",
    };
  } catch (error) {
    console.error("Error updating recent state:", error);
    return {}; // Return empty on error
  }
}

// =====================================================
// 3. GOALS PROGRESS MAPPER
// =====================================================

/**
 * Update progress on each user goal based on recent entries
 */
export async function updateGoalsProgress(
  goals: Goal[],
  recentEntries: JournalEntry[], // Last 30 days
  currentProgress: GoalsProgressKB
): Promise<GoalsProgressKB> {
  if (goals.length === 0) {
    return {
      goals: [],
      updated_at: new Date().toISOString(),
    };
  }

  const prompt = createGoalsProgressPrompt(goals, recentEntries);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const extracted = JSON.parse(jsonText) as { goals: GoalProgressItem[] };

    return {
      goals: extracted.goals,
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error updating goals progress:", error);
    return {
      goals: currentProgress.goals, // Keep current on error
      updated_at: new Date().toISOString(),
    };
  }
}

// =====================================================
// 4. ORCHESTRATOR - Run all extractors
// =====================================================

/**
 * Run all KB extractors and return combined updates
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
    // Run all extractors in parallel for speed
    const [generalUpdates, stateUpdates, goalsUpdates] = await Promise.all([
      extractGeneralFacts(currentEntry, currentKB.general),
      updateRecentState(recentEntries, currentKB.state_recent),
      updateGoalsProgress(goals, recentEntries, currentKB.goals_progress),
    ]);

    console.log("✅ KB extraction complete");

    return {
      general: generalUpdates,
      state_recent: stateUpdates,
      goals_progress: goalsUpdates,
    };
  } catch (error) {
    console.error("Error in extractAllKBUpdates:", error);
    throw error;
  }
}
