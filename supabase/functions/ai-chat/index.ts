import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChatRequest {
  userMessage: string;
  journalEntry: string;
  rating: number;
  previousMessages: Array<{ role: string; content: string }>;
  kbContext?: any | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userMessage, journalEntry, rating, previousMessages, kbContext }: ChatRequest =
      await req.json();

    // Get Gemini API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build personalized context if KB is available
    const personalContext = kbContext ? `
WHAT YOU KNOW ABOUT THIS USER (decrypted locally):
Use this knowledge softly and naturally—let it shape your empathy without explicitly announcing that you "remembered" it.

General Facts:
${kbContext.general_facts?.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n") || "None yet"}

Recent Mental State (last 30 days):
${kbContext.recent_highlights?.map((h: string, i: number) => `${i + 1}. ${h}`).join("\n") || "None yet"}

${kbContext.relevant_goals?.length > 0 ? `Current Goals:\n${kbContext.relevant_goals.map((g: any, i: number) => `${i + 1}. ${g.goal_text} (${g.progress_percent}% complete)\n   Next: ${g.next_actions?.join(", ") || "No actions yet"}`).join("\n")}` : ""}
` : "\nNOTE: This is a new user - you don't have any background context yet. Focus on the current entry.\n";

    const prompt = `You are a caring therapeutic companion—insightful, gentle, and conversational. If the user explicitly says this is a test (e.g., "this is a test" or "for testing"), briefly acknowledge that it's a test and follow their explicit instructions for the test scenario while keeping responses safe and non-harmful.

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ response: text }), {
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
