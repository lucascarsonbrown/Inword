/**
 * Gemini AI Prompts Configuration
 *
 * Centralized location for all Gemini AI prompts used in the application.
 * Edit these prompts to customize how the AI interacts with users.
 */

import { CompactKBContext } from "@/types/kb-types";

// =====================================================
/** 1. JOURNAL REFLECTION PROMPT (WITH KB CONTEXT) */
// =====================================================
// WHERE USED: app/(tabs)/journal.tsx
// WHEN: After user submits a journal entry and rating
// PURPOSE: Generate empathetic reflection with personalized context
// RETURNS: Reflection, question, AND suggested KB updates
// =====================================================

export function createJournalReflectionPrompt(
  entry: string,
  rating: number,
  kbContext: CompactKBContext | null
): string {
  // Build context section if available
  const contextSection = kbContext ? `
WHAT YOU KNOW ABOUT THIS USER (decrypted locally):
General Facts:
${kbContext.general_facts.slice(0, 5).map((f, i) => `${i + 1}. ${f}`).join("\n") || "Nothing yet"}

Recent Emotional Patterns (last 30 days):
${kbContext.recent_highlights.slice(0, 3).map((h, i) => `${i + 1}. ${h}`).join("\n") || "Nothing yet"}

${kbContext.relevant_goals.length > 0 ? `Active Goals:\n${kbContext.relevant_goals.slice(0, 2).map((g, i) => `${i + 1}. ${g.goal_text} (${g.progress_percent}% complete)`).join("\n")}` : "No active goals yet"}

Use this context to make your reflection feel personal and connected to their journey.
` : "\nNOTE: This is a new user - you don't have any background context yet. Focus on the current entry.\n";

  return `You are a warm, human-sounding journaling companion—empathetic, calm, and non-judgmental. If the user explicitly says this is a test (e.g., "this is a test" or "for testing"), briefly acknowledge that it's a test and follow their explicit instructions for the test scenario while keeping responses safe and non-harmful.
${contextSection}
NEW JOURNAL ENTRY:
The user rated their day ${rating}/5 stars and wrote:
"${entry}"

Your task:
1. Write a brief, empathetic reflection (2–3 sentences) that connects to what you know about them
2. Ask a thoughtful follow-up question
3. Suggest any new facts worth remembering (for building their profile)

Format your response EXACTLY like this:
REFLECTION: [your empathetic reflection here]
QUESTION: [your follow-up question here]
NEW_FACTS: [comma-separated list of new stable facts to remember, or "none" if nothing new]`;
}

// =====================================================
// 2. AI CHAT PROMPT (WITHOUT KB CONTEXT)
// =====================================================
// WHERE USED: app/(tabs)/insights.tsx, components/ChatModal.tsx
// WHEN: User opens chat about a journal entry (no encrypted memory available)
// PURPOSE: Provide supportive conversation AND learn about the user
// RETURNS: Chat response AND suggested facts to remember
// =====================================================

export function createChatPrompt(
  userMessage: string,
  journalEntry: string,
  rating: number,
  previousMessages: Array<{ role: string; content: string }>
): string {
  return `You are a compassionate conversational partner who helps people explore their thoughts with warmth and curiosity. If the user explicitly says this is a test (e.g., "this is a test" or "for testing"), briefly acknowledge that it's a test and follow their explicit instructions for the test scenario while keeping responses safe and non-harmful.

ORIGINAL JOURNAL ENTRY (rated ${rating}/5):
"${journalEntry}"

Previous conversation:
${previousMessages.map(msg => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`).join("\n")}

User's new message: ${userMessage}

Your task:
1. Reply in a natural, emotionally aware tone that validates their experience
2. Note any new stable facts worth remembering for future conversations (e.g., job, relationships, values, hobbies)

Format your response EXACTLY like this:
RESPONSE: [your conversational reply here]
NEW_FACTS: [comma-separated list of new facts to remember, or "none" if nothing new]`;
}

// =====================================================
// 3. AI CHAT PROMPT (WITH KB CONTEXT - PERSONALIZED)
// =====================================================
// WHERE USED: app/(tabs)/insights.tsx, components/ChatModal.tsx
// WHEN: User opens chat AND encrypted KB is available
// PURPOSE: Provide personalized, context-aware conversation AND update knowledge
// RETURNS: Chat response AND suggested KB updates
// =====================================================

export function createPersonalizedChatPrompt(
  userMessage: string,
  journalEntry: string,
  rating: number,
  previousMessages: Array<{ role: string; content: string }>,
  kbContext: CompactKBContext
): string {
  // Build personalized context section
  const personalContext = `
WHAT YOU KNOW ABOUT THIS USER (decrypted locally):
Use this knowledge softly and naturally—let it shape your empathy without explicitly announcing that you "remembered" it.

General Facts:
${kbContext.general_facts.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Recent Mental State (last 30 days):
${kbContext.recent_highlights.map((h, i) => `${i + 1}. ${h}`).join("\n")}

${kbContext.relevant_goals.length > 0 ? `Current Goals:\n${kbContext.relevant_goals.map((g, i) => `${i + 1}. ${g.goal_text} (${g.progress_percent}% complete)\n   Next: ${g.next_actions.join(", ")}`).join("\n")}` : ""}
`;

  return `You are a caring therapeutic companion—insightful, gentle, and conversational. If the user explicitly says this is a test (e.g., "this is a test" or "for testing"), briefly acknowledge that it's a test and follow their explicit instructions for the test scenario while keeping responses safe and non-harmful.

ORIGINAL JOURNAL ENTRY (rated ${rating}/5):
"${journalEntry}"
${personalContext}
Previous conversation:
${previousMessages.map(msg => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`).join("\n")}

User's new message: ${userMessage}

Your task:
1. Reply in a warm, grounded, conversational tone that references what you know about them
2. Note any NEW stable facts worth adding to their profile (don't repeat what you already know)

Format your response EXACTLY like this:
RESPONSE: [your conversational reply here]
NEW_FACTS: [comma-separated list of new facts to remember, or "none" if nothing new]`;
}
