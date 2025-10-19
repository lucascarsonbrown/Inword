/**
 * KB Extractor Prompts Configuration
 *
 * Centralized location for all AI prompts used in KB extraction.
 * Edit these prompts to customize how the AI analyzes journal entries.
 */

import { GeneralKB, RecentStateKB } from "@/types/kb-types";
import { JournalEntry, Goal } from "@/services/database";

// =====================================================
// 1. GENERAL FACTS EXTRACTOR PROMPT
// =====================================================
// WHERE USED: services/kb-extractors.ts → extractGeneralFacts()
// WHEN: After every journal entry is submitted
// PURPOSE: Extract stable, long-term facts about the user to build their profile
// =====================================================

export function createGeneralFactsPrompt(
  entry: JournalEntry,
  currentGeneral: GeneralKB
): string {
  return `You’re reading this journal entry to better understand the user as a person and gently update what you know about their life. Focus on durable details, not passing moods.

CURRENT KNOWLEDGE:
${JSON.stringify(currentGeneral, null, 2)}

NEW JOURNAL ENTRY:
"${entry.entry_text}"
Rating: ${entry.rating}/5

Your goal is to extract ONLY new, long-term facts worth remembering. Emphasize:
- Name or preferred alias (if mentioned)
- Biographical facts (job, location, education, hobbies)
- Relationships (family, friends, partners)
- Work/school information
- Regular routines or habits
- Preferences (communication style, learning style, etc.)
- Core values or beliefs
- Triggers or boundaries

GUIDELINES:
1. Only include facts that are STABLE (not temporary moods or one-off events)
2. Don’t repeat what’s already known
3. Keep each fact short and natural (5–12 words)
4. If nothing new, return empty arrays
5. Respond with valid JSON only—no markdown, no extra commentary

RESPOND WITH JSON IN THIS EXACT FORMAT:
{
  "name_or_alias": "string or empty",
  "bio": ["fact1", "fact2"],
  "relationships": ["relationship1"],
  "work_school": ["work fact"],
  "routines": ["routine"],
  "preferences": ["preference"],
  "values": ["value"],
  "triggers_boundaries": ["trigger or boundary"]
}`;
}

// =====================================================
// 2. RECENT STATE UPDATER PROMPT
// =====================================================
// WHERE USED: services/kb-extractors.ts → updateRecentState()
// WHEN: After every journal entry is submitted
// PURPOSE: Analyze last 30 days of entries to identify emotional patterns and mental state
// =====================================================

export function createRecentStatePrompt(
  recentEntries: JournalEntry[],
  currentState: RecentStateKB,
  avgMood: number | null
): string {
  // Create summary of entries
  const entrySummary = recentEntries
    .slice(-10) // Last 10 entries
    .map((e) => `[${e.date}] Rating ${e.rating}/5: "${e.entry_text.substring(0, 200)}..."`)
    .join("\n\n");

  return `You’re trying to understand how this person has been feeling over the past month by noticing patterns in mood, stress, wins, and challenges. Keep it human, clear, and concise.

CURRENT STATE ANALYSIS:
${JSON.stringify(currentState, null, 2)}

RECENT ENTRIES (Last 30 days):
${entrySummary}

Average mood score: ${avgMood?.toFixed(2) || "N/A"}/5

Please provide an updated snapshot of their recent emotional state.

FOCUS ON:
- Dominant emotions (3–5 that show up often)
- Notable highs (positive events, achievements, bright spots)
- Notable lows (challenges, setbacks, tough days)
- Current stressors (ongoing sources of strain)
- Protective factors (what’s helping them cope)
- Red flags (concerning patterns like isolation or sleep issues)
- Suggested focus areas (practical themes to work on next)

GUIDELINES:
1. Be concise (5–10 words per item)
2. Emphasize patterns over isolated moments
3. Give slightly more weight to the last week
4. If you see concerning patterns, include them under red_flags
5. Respond with valid JSON only—no markdown or extra commentary

RESPOND WITH JSON IN THIS EXACT FORMAT:
{
  "dominant_emotions": ["emotion1", "emotion2", "emotion3"],
  "mood_score_avg": ${avgMood},
  "highs": ["high1", "high2"],
  "lows": ["low1", "low2"],
  "stressors": ["stressor1", "stressor2"],
  "protective_factors": ["factor1", "factor2"],
  "red_flags": ["flag1 if any"],
  "suggested_focus": ["focus1", "focus2"]
}`;
}

// =====================================================
// 3. GOALS PROGRESS MAPPER PROMPT
// =====================================================
// WHERE USED: services/kb-extractors.ts → updateGoalsProgress()
// WHEN: After every journal entry is submitted
// PURPOSE: Track progress on each user goal by analyzing journal entries for mentions/progress
// =====================================================

export function createGoalsProgressPrompt(
  goals: Goal[],
  recentEntries: JournalEntry[]
): string {
  // Create summary of entries
  const entrySummary = recentEntries
    .slice(-10)
    .map((e) => `[${e.date}] "${e.entry_text.substring(0, 150)}..."`)
    .join("\n\n");

  const goalsText = goals.map((g, i) => `${i + 1}. [ID: ${g.id}] ${g.text}`).join("\n");

  return `You're looking through recent entries to notice any real movement—big or small—on the user's goals. Be realistic and grounded in what’s actually written.

USER'S GOALS:
${goalsText}

RECENT JOURNAL ENTRIES (Last 30 days):
${entrySummary}

For EACH goal, summarize whether it’s mentioned or advanced in the entries, and suggest gentle, practical next steps.

FOR EACH GOAL, PROVIDE:
- progress_notes: Brief notes on any clear progress (or empty if none)
- progress_percent: Estimate 0–100% (default to 0 if unknown)
- next_actions: 1–3 specific next steps
- risks_blockers: What might be getting in the way
- momentum_score: 0–10 for current momentum (0=stalled, 5=steady, 10=accelerating)

GUIDELINES:
1. Stay realistic and evidence-based
2. If a goal isn’t mentioned, keep progress_percent at 0 and note there's nothing new
3. Use momentum_score to reflect overall pace
4. Return a valid JSON object containing an array with one object per goal
5. MUST include ALL goals in the response

RESPOND WITH JSON IN THIS EXACT FORMAT:
{
  "goals": [
    {
      "goal_id": "goal-uuid-here",
      "progress_notes": ["note1", "note2"],
      "progress_percent": 25,
      "next_actions": ["action1", "action2"],
      "risks_blockers": ["blocker1"],
      "momentum_score": 5
    }
  ]
}`;
}
