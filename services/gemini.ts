import { CompactKBContext } from "@/types/kb-types";
import { supabase } from "@/lib/supabase";

export interface JournalPromptData {
  entry: string;
  rating: number;
}

export interface GeminiResponse {
  reflection: string;
  question: string;
  newFacts: string[]; // New facts to add to KB
  fullResponse: string;
}

/**
 * Generates an AI reflection based on the user's journal entry and day rating
 * Now includes KB context for personalized reflections
 * Uses Supabase Edge Function to keep API key secure
 */
export async function generateReflection(
  data: JournalPromptData,
  kbContext?: CompactKBContext | null
): Promise<GeminiResponse> {
  console.log("🚀 generateReflection called with:", { rating: data.rating, entryLength: data.entry.length });

  try {
    console.log("📤 Sending request to Edge Function...");

    const { data: result, error } = await supabase.functions.invoke('generate-insights', {
      body: {
        entry: data.entry,
        rating: data.rating,
        kbContext: kbContext || null,
      },
    });

    if (error) {
      console.error("❌ Edge Function error:", error);
      throw error;
    }

    console.log("✅ Received response from Edge Function");
    console.log("📝 Response length:", result.fullResponse?.length);
    console.log("🧠 New facts extracted:", result.newFacts?.length);

    return result as GeminiResponse;
  } catch (error) {
    console.error("Error calling Edge Function:", error);
    throw new Error(
      "Failed to generate reflection. Please check your internet connection."
    );
  }
}

/**
 * Continues a conversation about a journal entry
 * Now includes encrypted KB context for personalized responses
 * Uses Supabase Edge Function to keep API key secure
 */
export async function chatWithAI(
  userMessage: string,
  journalEntry: string,
  rating: number,
  previousMessages: Array<{ role: string; content: string }>,
  kbContext?: CompactKBContext | null
): Promise<string> {
  console.log("💬 chatWithAI called with:", {
    messageLength: userMessage.length,
    historyLength: previousMessages.length,
    hasKBContext: !!kbContext
  });

  try {
    console.log("📤 Sending chat request to Edge Function...");

    const { data: result, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        userMessage,
        journalEntry,
        rating,
        previousMessages,
        kbContext: kbContext || null,
      },
    });

    if (error) {
      console.error("❌ Edge Function error:", error);
      throw error;
    }

    console.log("✅ Received chat response from Edge Function");
    return result.response;
  } catch (error) {
    console.error("Error calling Edge Function for chat:", error);
    throw new Error(
      "Failed to get AI response. Please check your internet connection."
    );
  }
}
