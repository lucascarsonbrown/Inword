import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  getTodayEntry,
  createJournalEntry,
  createInsight,
  getEntriesByDate,
  getUserGoals,
  JournalEntry,
} from "@/services/database";
import { generateReflection } from "@/services/gemini";
import { fetchAndDecryptKB, smartMergeKB, createCompactContext } from "@/services/kb-manager";
import { extractAllKBUpdates } from "@/services/kb-extractors";
import { updateGoalProgressFromKB } from "@/services/goal-progress";

export default function JournalScreen() {
  const [entry, setEntry] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [tempEntry, setTempEntry] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadTodayEntry();
  }, []);

  const loadTodayEntry = async () => {
    try {
      const entry = await getTodayEntry();
      setTodayEntry(entry);
    } catch (error) {
      console.error("Error loading today's entry:", error);
    } finally {
      setLoadingToday(false);
    }
  };

  const handleStartWriting = () => {
    setEntry("");
    setTodayEntry(null);
  };

  const handleReflect = () => {
    if (entry.trim()) {
      setTempEntry(entry);
      setShowRating(true);
    }
  };

  const handleRatingSubmit = async () => {
    console.log("🚀 Starting journal submission...");
    console.log("📝 Entry text length:", tempEntry.length);
    console.log("⭐ Rating:", rating);

    setIsLoading(true);

    try {
      // Load KB context for personalized reflection
      let kbContext = null;
      try {
        console.log("🔐 Loading KB context...");
        const kb = await fetchAndDecryptKB();
        const goals = await getUserGoals();
        kbContext = createCompactContext(kb, goals);
        console.log("✅ KB context loaded for reflection");
      } catch (err) {
        console.log("⚠️ Could not load KB context (new user or error):", err);
      }

      // Create journal entry in database
      console.log("💾 Creating journal entry in database...");
      const journalEntry = await createJournalEntry(tempEntry, rating);
      console.log("✅ Journal entry created:", journalEntry.id);

      // Generate AI reflection with KB context
      console.log("🤖 Generating AI reflection...");
      const response = await generateReflection(
        {
          entry: tempEntry,
          rating: rating,
        },
        kbContext
      );

      console.log("✅ AI reflection generated");
      console.log("🧠 Reflection new facts:", response.newFacts);

      // Save insight to database
      console.log("💾 Saving insight to database...");
      const fullReflection = `${response.reflection}\n\n${response.question}`;
      await createInsight(journalEntry.id, fullReflection);
      console.log("✅ Insight saved");

      // Update encrypted KB in background (includes new facts from reflection)
      console.log("🧠 Updating KB in background...");
      updateKBInBackground(journalEntry, response.newFacts).catch((err) => {
        console.error("❌ KB update failed (non-blocking):", err);
        console.error("Error details:", JSON.stringify(err, null, 2));
        // Don't show error to user - KB update is best-effort
      });

      // Reset form and reload today's entry BEFORE showing alert
      console.log("🔄 Resetting form and reloading today's entry...");
      resetForm();
      await loadTodayEntry();

      setIsLoading(false);
      console.log("✅ Journal submission complete!");

      // Navigate to Insights
      Alert.alert(
        "✨ Reflection Complete",
        "Your cosmic insights are ready! Check the Calendar tab.",
        [
          {
            text: "View Calendar",
            onPress: () => {
              router.push("/(tabs)/insights");
            },
          },
          {
            text: "Stay Here",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("❌❌❌ ERROR IN JOURNAL SUBMISSION ❌❌❌");
      console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Full error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");

      setIsLoading(false);

      Alert.alert(
        "Error Saving Journal Entry",
        error instanceof Error
          ? `${error.message}\n\nCheck the console for details.`
          : "Failed to save entry. Please check the console for details.",
        [{ text: "OK" }]
      );
    }
  };

  /**
   * Update KB in background after journal entry is created
   * This runs asynchronously and doesn't block the UI
   * @param journalEntry The journal entry that was just created
   * @param newFactsFromReflection Facts extracted from the AI reflection
   */
  const updateKBInBackground = async (journalEntry: JournalEntry, newFactsFromReflection: string[]) => {
    try {
      console.log("🧠 Updating encrypted KB...");

      // Get last 30 days of entries
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // Fetch recent entries (rough estimate - we'll filter by date range in future enhancement)
      const todayStr = today.toISOString().split("T")[0];
      const recentEntries: JournalEntry[] = [];

      // Get entries for the last 30 days (simple approach - iterate through days)
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const entries = await getEntriesByDate(dateStr);
        recentEntries.push(...entries);
      }

      // Get user's goals
      const goals = await getUserGoals();

      // Fetch current KB
      const currentKB = await fetchAndDecryptKB();

      // Extract KB updates using AI
      const kbUpdates = await extractAllKBUpdates(
        journalEntry,
        recentEntries,
        goals,
        currentKB
      );

      // Merge in the new facts from the reflection
      if (newFactsFromReflection.length > 0) {
        console.log("🧠 Adding reflection facts to KB:", newFactsFromReflection);
        kbUpdates.general = {
          ...kbUpdates.general,
          bio: [...(kbUpdates.general?.bio || []), ...newFactsFromReflection],
        };
      }

      // Smart merge and save
      await smartMergeKB(kbUpdates);

      console.log("✅ KB updated successfully");

      // Update goal progress in database
      console.log("📊 Updating goal progress...");
      await updateGoalProgressFromKB(goals, kbUpdates.goals_progress);
      console.log("✅ Goal progress updated");
    } catch (error) {
      console.error("Error updating KB:", error);
      // Throw to be caught by the catch in handleRatingSubmit
      throw error;
    }
  };

  const resetForm = () => {
    setEntry("");
    setTempEntry("");
    setShowRating(false);
    setRating(0);
  };

  const renderStar = (position: number) => {
    const isHalf = rating === position - 0.5;
    const isFull = rating >= position;

    return (
      <TouchableOpacity
        key={position}
        onPress={() => setRating(position)}
        onLongPress={() => setRating(position - 0.5)}
        style={styles.starButton}
      >
        <Ionicons
          name={isFull ? "star" : isHalf ? "star-half" : "star-outline"}
          size={48}
          color={isFull || isHalf ? "#FFD700" : "#8EA7E9"}
        />
      </TouchableOpacity>
    );
  };

  if (loadingToday) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E0C3FC" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (showRating) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.celestialIcon}>
              <Ionicons name="star" size={32} color="#FFD700" />
              <View style={styles.starGlow} />
            </View>
            <Text style={styles.title}>Rate Your Day</Text>
            <Text style={styles.subtitle}>How do you feel among the stars today?</Text>
          </View>

          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(renderStar)}
            </View>
            <Text style={styles.ratingHint}>
              Tap for full star • Long press for half star
            </Text>
            {rating > 0 && (
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingValue}>{rating}</Text>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.reflectButton,
              (rating === 0 || isLoading) && styles.reflectButtonDisabled,
            ]}
            onPress={handleRatingSubmit}
            disabled={rating === 0 || isLoading}
          >
            <LinearGradient
              colors={rating > 0 && !isLoading ? ["#667eea", "#764ba2"] : ["#3a3a52", "#2d2d44"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Generating Insights...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Submit Reflection</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={resetForm}>
            <Text style={styles.backButtonText}>← Back to Journal</Text>
          </TouchableOpacity>

          {/* Celestial decoration */}
          <View style={styles.celestialDecor}>
            <Ionicons name="planet-outline" size={16} color="rgba(224, 195, 252, 0.3)" />
            <Ionicons name="moon-outline" size={12} color="rgba(224, 195, 252, 0.2)" />
            <Ionicons name="star-outline" size={14} color="rgba(224, 195, 252, 0.25)" />
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Home page - check if journaled today
  if (todayEntry && !entry) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.celestialIcon}>
              <Ionicons name="moon" size={40} color="#E0C3FC" />
              <View style={styles.moonGlow} />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Your thoughts are among the stars</Text>
          </View>

          {/* Already journaled card */}
          <View style={styles.completedCard}>
            <LinearGradient
              colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.15)"]}
              style={styles.cardGradient}
            >
              <View style={styles.checkmarkContainer}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={32} color="#4ade80" />
                </View>
              </View>
              <Text style={styles.completedTitle}>Today's Entry Complete</Text>
              <Text style={styles.completedText}>
                You've already journaled today. Great job staying consistent!
              </Text>

              <View style={styles.entryPreview}>
                <Text style={styles.entryPreviewText} numberOfLines={3}>
                  {todayEntry.entry_text}
                </Text>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleStartWriting}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#8EA7E9" />
                  <Text style={styles.secondaryButtonText}>Add Another Entry</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => router.push("/(tabs)/insights")}
                >
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    style={styles.primaryButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="chatbubbles" size={18} color="#fff" />
                    <Text style={styles.primaryButtonText}>Chat About Entry</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* Celestial decoration */}
          <View style={styles.celestialDecor}>
            <Ionicons name="star" size={12} color="rgba(224, 195, 252, 0.3)" />
            <Ionicons name="star" size={8} color="rgba(224, 195, 252, 0.2)" />
            <Ionicons name="star" size={10} color="rgba(224, 195, 252, 0.25)" />
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Journal entry form
  return (
    <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.celestialIcon}>
              <Ionicons name="create-outline" size={32} color="#E0C3FC" />
              <View style={styles.moonGlow} />
            </View>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>
              {todayEntry ? "Continue your cosmic journey" : "Begin your cosmic journey"}
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind today?"
              placeholderTextColor="#8EA7E9"
              multiline
              value={entry}
              onChangeText={setEntry}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.reflectButton, !entry.trim() && styles.reflectButtonDisabled]}
            onPress={handleReflect}
            disabled={!entry.trim()}
          >
            <LinearGradient
              colors={entry.trim() ? ["#667eea", "#764ba2"] : ["#3a3a52", "#2d2d44"]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reflect</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Celestial decoration */}
          <View style={styles.celestialDecor}>
            <Ionicons name="planet-outline" size={16} color="rgba(224, 195, 252, 0.3)" />
            <Ionicons name="moon-outline" size={12} color="rgba(224, 195, 252, 0.2)" />
            <Ionicons name="star-outline" size={14} color="rgba(224, 195, 252, 0.25)" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#8EA7E9",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  celestialIcon: {
    position: "relative",
    marginBottom: 12,
  },
  starGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFD700",
    opacity: 0.2,
    top: -14,
    left: -14,
  },
  moonGlow: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E0C3FC",
    opacity: 0.15,
    top: -15,
    left: -15,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#B8A4D6",
    marginTop: 8,
    fontStyle: "italic",
    textAlign: "center",
  },
  completedCard: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(78, 222, 128, 0.3)",
    marginBottom: 20,
  },
  cardGradient: {
    padding: 32,
    alignItems: "center",
  },
  checkmarkContainer: {
    marginBottom: 20,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(78, 222, 128, 0.1)",
    borderWidth: 2,
    borderColor: "#4ade80",
    justifyContent: "center",
    alignItems: "center",
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  completedText: {
    fontSize: 14,
    color: "#B8A4D6",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  entryPreview: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
  },
  entryPreviewText: {
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
    fontStyle: "italic",
  },
  buttonGroup: {
    width: "100%",
    gap: 12,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(142, 167, 233, 0.5)",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8EA7E9",
  },
  primaryButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    padding: 20,
    marginBottom: 20,
    minHeight: 300,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
  },
  reflectButton: {
    borderRadius: 15,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  reflectButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  starsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 8,
  },
  ratingHint: {
    fontSize: 12,
    color: "#8EA7E9",
    fontStyle: "italic",
    marginBottom: 16,
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 8,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFD700",
  },
  backButton: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: "#8EA7E9",
    fontWeight: "600",
  },
  celestialDecor: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
});
