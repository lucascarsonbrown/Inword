import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InsightsRequest {
  entry: string;
  rating: number;
  kbContext?: any | null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { entry, rating, kbContext }: InsightsRequest = await req.json();

    // Get Gemini API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build context section if available
    const contextSection = kbContext ? `
WHAT YOU KNOW ABOUT THIS USER (decrypted locally):
General Facts:
${kbContext.general_facts?.slice(0, 5).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n") || "Nothing yet"}

Recent Emotional Patterns (last 30 days):
${kbContext.recent_highlights?.slice(0, 3).map((h: string, i: number) => `${i + 1}. ${h}`).join("\n") || "Nothing yet"}

${kbContext.relevant_goals?.length > 0 ? `Active Goals:\n${kbContext.relevant_goals.slice(0, 2).map((g: any, i: number) => `${i + 1}. ${g.goal_text} (${g.progress_percent}% complete)`).join("\n")}` : "No active goals yet"}

Use this context to make your reflection feel personal and connected to their journey.
` : "\nNOTE: This is a new user - you don't have any background context yet. Focus on the current entry.\n";

    const prompt = `You are a warm, human-sounding journaling companion—empathetic, calm, and non-judgmental. If the user explicitly says this is a test (e.g., "this is a test" or "for testing"), briefly acknowledge that it's a test and follow their explicit instructions for the test scenario while keeping responses safe and non-harmful.
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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    const reflectionMatch = text.match(/REFLECTION:\s*(.+?)(?=QUESTION:|NEW_FACTS:|$)/s);
    const questionMatch = text.match(/QUESTION:\s*(.+?)(?=NEW_FACTS:|$)/s);
    const newFactsMatch = text.match(/NEW_FACTS:\s*(.+?)$/s);

    const reflection = reflectionMatch
      ? reflectionMatch[1].trim()
      : text.split("\n")[0];
    const question = questionMatch
      ? questionMatch[1].trim()
      : "What aspects of today would you like to explore further?";

    // Parse new facts (comma-separated list)
    const newFactsText = newFactsMatch ? newFactsMatch[1].trim() : "none";
    const newFacts = newFactsText.toLowerCase() === "none" || newFactsText === ""
      ? []
      : newFactsText.split(",").map((f: string) => f.trim()).filter((f: string) => f.length > 0);

    return new Response(
      JSON.stringify({
        reflection,
        question,
        newFacts,
        fullResponse: text,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
