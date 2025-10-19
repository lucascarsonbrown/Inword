import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface KBRequest {
  type: "general" | "recent_state" | "goals_progress" | "all";
  currentEntry?: any;
  recentEntries?: any[];
  goals?: any[];
  currentKB?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, currentEntry, recentEntries, goals, currentKB }: KBRequest =
      await req.json();

    // Get Gemini API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    let result: any = {};

    // Extract general facts
    if (type === "general" || type === "all") {
      const generalPrompt = `You're reading this journal entry to better understand the user as a person and gently update what you know about their life. Focus on durable details, not passing moods.

CURRENT KNOWLEDGE:
${JSON.stringify(currentKB?.general || {}, null, 2)}

NEW JOURNAL ENTRY:
"${currentEntry?.entry_text}"
Rating: ${currentEntry?.rating}/5

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
2. Don't repeat what's already known
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

      const generalResult = await model.generateContent(generalPrompt);
      const generalText = generalResult.response
        .text()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result.general = JSON.parse(generalText);
    }

    // Update recent state
    if (type === "recent_state" || type === "all") {
      const ratings = recentEntries?.map((e) => e.rating) || [];
      const avgMood =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;

      const entrySummary = (recentEntries || [])
        .slice(-10)
        .map(
          (e: any) =>
            `[${e.date}] Rating ${e.rating}/5: "${e.entry_text.substring(0, 200)}..."`
        )
        .join("\n\n");

      const statePrompt = `You're trying to understand how this person has been feeling over the past month by noticing patterns in mood, stress, wins, and challenges. Keep it human, clear, and concise.

CURRENT STATE ANALYSIS:
${JSON.stringify(currentKB?.state_recent || {}, null, 2)}

RECENT ENTRIES (Last 30 days):
${entrySummary}

Average mood score: ${avgMood?.toFixed(2) || "N/A"}/5

Please provide an updated snapshot of their recent emotional state.

FOCUS ON:
- Dominant emotions (3–5 that show up often)
- Notable highs (positive events, achievements, bright spots)
- Notable lows (challenges, setbacks, tough days)
- Current stressors (ongoing sources of strain)
- Protective factors (what's helping them cope)
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

      const stateResult = await model.generateContent(statePrompt);
      const stateText = stateResult.response
        .text()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result.state_recent = {
        ...JSON.parse(stateText),
        window: "last_30_days",
      };
    }

    // Update goals progress
    if (type === "goals_progress" || type === "all") {
      if (!goals || goals.length === 0) {
        result.goals_progress = {
          goals: [],
          updated_at: new Date().toISOString(),
        };
      } else {
        const entrySummary = (recentEntries || [])
          .slice(-10)
          .map((e: any) => `[${e.date}] "${e.entry_text.substring(0, 150)}..."`)
          .join("\n\n");

        const goalsText = goals
          .map((g: any, i: number) => `${i + 1}. [ID: ${g.id}] ${g.text}`)
          .join("\n");

        const goalsPrompt = `You're looking through recent entries to notice any real movement—big or small—on the user's goals. Be realistic and grounded in what's actually written.

USER'S GOALS:
${goalsText}

RECENT JOURNAL ENTRIES (Last 30 days):
${entrySummary}

For EACH goal, summarize whether it's mentioned or advanced in the entries, and suggest gentle, practical next steps.

FOR EACH GOAL, PROVIDE:
- progress_notes: Brief notes on any clear progress (or empty if none)
- progress_percent: Estimate 0–100% (default to 0 if unknown)
- next_actions: 1–3 specific next steps
- risks_blockers: What might be getting in the way
- momentum_score: 0–10 for current momentum (0=stalled, 5=steady, 10=accelerating)

GUIDELINES:
1. Stay realistic and evidence-based
2. If a goal isn't mentioned, keep progress_percent at 0 and note there's nothing new
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

        const goalsResult = await model.generateContent(goalsPrompt);
        const goalsText = goalsResult.response
          .text()
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsedGoals = JSON.parse(goalsText);
        result.goals_progress = {
          goals: parsedGoals.goals,
          updated_at: new Date().toISOString(),
        };
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
