/**
 * Knowledge Base Type Definitions
 *
 * These define the structure of the AI's private memory about the user.
 * All data conforming to these types is encrypted before storage.
 */

// =====================================================
// A. GENERAL FACTS (Long-term, stable information)
// =====================================================
export interface GeneralKB {
  name_or_alias: string;
  bio: string[]; // e.g., ["Software engineer", "Lives in NYC", "Loves hiking"]
  relationships: string[]; // e.g., ["Married to Alex", "Close with mom", "Best friend: Jordan"]
  work_school: string[]; // e.g., ["Works at TechCorp", "Studying computer science"]
  routines: string[]; // e.g., ["Morning meditation", "Gym 3x/week", "Evening reading"]
  preferences: string[]; // e.g., ["Prefers text over calls", "Night owl", "Visual learner"]
  values: string[]; // e.g., ["Honesty", "Growth mindset", "Family first"]
  triggers_boundaries: string[]; // e.g., ["Avoid topics about X", "Sensitive about Y"]
}

// =====================================================
// B. RECENT MENTAL STATE (Rolling 30-day window)
// =====================================================
export interface RecentStateKB {
  window: "last_30_days";
  dominant_emotions: string[]; // e.g., ["anxious", "hopeful", "stressed"]
  mood_score_avg: number | null; // Average rating from last 30 days (1-5)
  highs: string[]; // e.g., ["Got promoted", "Had great date", "Finished project"]
  lows: string[]; // e.g., ["Fight with partner", "Missed deadline", "Felt isolated"]
  stressors: string[]; // e.g., ["Work deadlines", "Financial worries", "Family tension"]
  protective_factors: string[]; // e.g., ["Exercise routine", "Therapy sessions", "Supportive friends"]
  red_flags: string[]; // e.g., ["Increasing isolation", "Sleep problems", "Loss of interest"]
  suggested_focus: string[]; // e.g., ["Stress management", "Relationship communication", "Sleep hygiene"]
  year_summary?: string; // Optional: lightweight summary of last year for context
}

// =====================================================
// C. GOALS PROGRESS (Tied to user's goals)
// =====================================================
export interface GoalProgressItem {
  goal_id: string; // References goals table
  progress_notes: string[]; // e.g., ["Made progress on resume", "Applied to 3 jobs"]
  progress_percent: number; // 0-100
  next_actions: string[]; // e.g., ["Schedule mock interview", "Update LinkedIn"]
  risks_blockers: string[]; // e.g., ["Lack of time", "Feeling unmotivated", "Need more skills"]
  momentum_score: number; // 0-10, how much momentum on this goal
}

export interface GoalsProgressKB {
  goals: GoalProgressItem[];
  updated_at: string; // ISO timestamp
}

// =====================================================
// COMBINED KB STRUCTURE
// =====================================================
export interface PrivateKB {
  general: GeneralKB;
  state_recent: RecentStateKB;
  goals_progress: GoalsProgressKB;
}

// =====================================================
// DATABASE ROW (Encrypted)
// =====================================================
export interface UserPrivateKBRow {
  id: string;
  user_id: string;
  general_cipher: string | null;
  state_recent_cipher: string | null;
  goals_progress_cipher: string | null;
  encrypted_key_backup: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// EMPTY/DEFAULT KB (for new users)
// =====================================================
export const EMPTY_GENERAL_KB: GeneralKB = {
  name_or_alias: "",
  bio: [],
  relationships: [],
  work_school: [],
  routines: [],
  preferences: [],
  values: [],
  triggers_boundaries: [],
};

export const EMPTY_STATE_KB: RecentStateKB = {
  window: "last_30_days",
  dominant_emotions: [],
  mood_score_avg: null,
  highs: [],
  lows: [],
  stressors: [],
  protective_factors: [],
  red_flags: [],
  suggested_focus: [],
};

export const EMPTY_GOALS_PROGRESS_KB: GoalsProgressKB = {
  goals: [],
  updated_at: new Date().toISOString(),
};

export const EMPTY_KB: PrivateKB = {
  general: EMPTY_GENERAL_KB,
  state_recent: EMPTY_STATE_KB,
  goals_progress: EMPTY_GOALS_PROGRESS_KB,
};

// =====================================================
// COMPACT CONTEXT (for AI chat)
// =====================================================
export interface CompactKBContext {
  general_facts: string[]; // 3-7 key facts
  recent_highlights: string[]; // 2-4 highlights
  relevant_goals: Array<{
    goal_text: string;
    progress_percent: number;
    next_actions: string[];
  }>; // 1-2 goals
}
