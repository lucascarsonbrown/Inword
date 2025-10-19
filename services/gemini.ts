import { GoogleGenerativeAI } from "@google/generative-ai";
import { CompactKBContext } from "@/types/kb-types";
import {
  createJournalReflectionPrompt,
  createChatPrompt,
  createPersonalizedChatPrompt,
} from "@/config/gemini-prompts";

// In Expo, environment variables are available at build time
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

console.log("🔑 API Key status:", API_KEY ? "Found" : "Not found");
console.log("🔑 API Key length:", API_KEY?.length);

if (!API_KEY || API_KEY === "your_api_key_here") {
  console.warn(
    "⚠️ Gemini API key not configured. Please add EXPO_PUBLIC_GEMINI_API_KEY to your .env file"
  );
}

const genAI = API_KEY && API_KEY !== "your_api_key_here" ? new GoogleGenerativeAI(API_KEY) : null;

// Export API_KEY for use in other services (e.g., kb-extractors)
export const GEMINI_API_KEY = API_KEY || "";

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
 */
export async function generateReflection(
  data: JournalPromptData,
  kbContext?: CompactKBContext | null
): Promise<GeminiResponse> {
  console.log("🚀 generateReflection called with:", { rating: data.rating, entryLength: data.entry.length });

  if (!genAI) {
    console.error("❌ genAI is null - API key not initialized");
    throw new Error(
      "Gemini API not initialized. Please restart the Expo server after adding your API key to .env"
    );
  }

  // Create the structured prompt using centralized config
  const prompt = createJournalReflectionPrompt(data.entry, data.rating, kbContext || null);

  try {
    console.log("📤 Sending request to Gemini API...");
    // Use latest Gemini Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Received response from Gemini API");
    console.log("📝 Response length:", text.length);

    // Parse the response into reflection, question, and new facts
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
      : newFactsText.split(",").map(f => f.trim()).filter(f => f.length > 0);

    console.log("🧠 New facts extracted:", newFacts.length);

    return {
      reflection,
      question,
      newFacts,
      fullResponse: text,
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error(
      "Failed to generate reflection. Please check your API key and internet connection."
    );
  }
}

/**
 * Continues a conversation about a journal entry
 * Now includes encrypted KB context for personalized responses
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

  if (!genAI) {
    throw new Error(
      "Gemini API not initialized. Please restart the Expo server after adding your API key to .env"
    );
  }

  try {
    console.log("📤 Sending chat request to Gemini API...");
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Use centralized prompt config
    const contextPrompt = kbContext
      ? createPersonalizedChatPrompt(userMessage, journalEntry, rating, previousMessages, kbContext)
      : createChatPrompt(userMessage, journalEntry, rating, previousMessages);

    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Received chat response from Gemini API");
    return text;
  } catch (error) {
    console.error("Error calling Gemini API for chat:", error);
    throw new Error(
      "Failed to get AI response. Please check your API key and internet connection."
    );
  }
}
