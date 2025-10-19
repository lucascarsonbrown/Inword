import { useState } from "react";
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
import Slider from "@react-native-community/slider";
import { supabase } from "@/lib/supabase";

interface Goal {
  text: string;
  timeframe: number;
  importance: number;
}

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([
    { text: "", timeframe: 12, importance: 3 },
    { text: "", timeframe: 12, importance: 3 },
    { text: "", timeframe: 12, importance: 3 },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const updateGoal = (index: number, field: keyof Goal, value: string | number) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setGoals(newGoals);
  };

  const addGoal = () => {
    if (goals.length < 5) {
      setGoals([...goals, { text: "", timeframe: 12, importance: 3 }]);
    }
  };

  const removeGoal = (index: number) => {
    if (goals.length > 1) {
      setGoals(goals.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async () => {
    // Filter out empty goals
    const validGoals = goals.filter((goal) => goal.text.trim() !== "");

    if (validGoals.length === 0) {
      Alert.alert("No Goals", "Please add at least one goal to continue.");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Insert all goals into database
      const { error } = await supabase.from("goals").insert(
        validGoals.map((goal) => ({
          user_id: user.id,
          text: goal.text,
          timeframe: goal.timeframe,
          importance: goal.importance,
        }))
      );

      if (error) {
        console.error("Error saving goals:", error);
        throw error;
      }

      // Navigate to home
      router.replace("/(tabs)/journal");
    } catch (error) {
      console.error("Error in onboarding:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to save goals. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcome = () => (
    <View style={styles.stepContainer}>
      <View style={styles.welcomeHeader}>
        <View style={styles.celestialIcon}>
          <Ionicons name="planet" size={64} color="#E0C3FC" />
          <View style={styles.planetGlow} />
        </View>
        <Text style={styles.welcomeTitle}>Welcome to InWord</Text>
        <Text style={styles.welcomeSubtitle}>
          Your journey to growth and fulfillment begins here
        </Text>
      </View>

      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeText}>
          Before we start your cosmic journey, let's set your intentions.
        </Text>
        <Text style={styles.welcomeText}>
          We'll ask you about your most important life goals so we can help you
          track your progress and stay aligned with what matters most.
        </Text>
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={() => setCurrentStep(1)}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.continueButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.continueButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Celestial decoration */}
      <View style={styles.celestialDecor}>
        <Ionicons name="star" size={12} color="rgba(224, 195, 252, 0.3)" />
        <Ionicons name="star" size={8} color="rgba(224, 195, 252, 0.2)" />
        <Ionicons name="star" size={10} color="rgba(224, 195, 252, 0.25)" />
      </View>
    </View>
  );

  const renderGoalsForm = () => (
    <View style={styles.stepContainer}>
      <View style={styles.header}>
        <View style={styles.celestialIcon}>
          <Ionicons name="telescope" size={32} color="#E0C3FC" />
          <View style={styles.sparkleGlow} />
        </View>
        <Text style={styles.title}>Your Life Goals</Text>
        <Text style={styles.subtitle}>
          What are the most important things you want to achieve?
        </Text>
      </View>

      <ScrollView style={styles.goalsContainer} showsVerticalScrollIndicator={false}>
        {goals.map((goal, index) => (
          <View key={index} style={styles.goalCard}>
            <LinearGradient
              colors={["rgba(102, 126, 234, 0.1)", "rgba(118, 75, 162, 0.1)"]}
              style={styles.goalCardGradient}
            >
              <View style={styles.goalHeader}>
                <Text style={styles.goalNumber}>Goal {index + 1}</Text>
                {goals.length > 1 && (
                  <TouchableOpacity onPress={() => removeGoal(index)}>
                    <Ionicons name="close-circle" size={24} color="#e74c3c" />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.goalInput}
                placeholder="What do you want to achieve?"
                placeholderTextColor="#8EA7E9"
                value={goal.text}
                onChangeText={(text) => updateGoal(index, "text", text)}
                multiline
              />

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  Timeframe: {goal.timeframe} {goal.timeframe === 1 ? "month" : "months"}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={120}
                  step={1}
                  value={goal.timeframe}
                  onValueChange={(value) => updateGoal(index, "timeframe", value)}
                  minimumTrackTintColor="#667eea"
                  maximumTrackTintColor="#3a3a52"
                  thumbTintColor="#E0C3FC"
                />
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  Importance: {goal.importance}/5 ⭐
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={5}
                  step={1}
                  value={goal.importance}
                  onValueChange={(value) => updateGoal(index, "importance", value)}
                  minimumTrackTintColor="#FFD700"
                  maximumTrackTintColor="#3a3a52"
                  thumbTintColor="#FFD700"
                />
              </View>
            </LinearGradient>
          </View>
        ))}

        {goals.length < 5 && (
          <TouchableOpacity style={styles.addGoalButton} onPress={addGoal}>
            <Ionicons name="add-circle-outline" size={20} color="#8EA7E9" />
            <Text style={styles.addGoalButtonText}>Add Another Goal</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(0)}
        >
          <Ionicons name="arrow-back" size={20} color="#8EA7E9" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <LinearGradient
            colors={isLoading ? ["#3a3a52", "#2d2d44"] : ["#667eea", "#764ba2"]}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.submitButtonText}>Saving...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitButtonText}>Complete Setup</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {currentStep === 0 ? renderWelcome() : renderGoalsForm()}
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
  stepContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 40,
  },
  celestialIcon: {
    position: "relative",
    marginBottom: 20,
  },
  planetGlow: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E0C3FC",
    opacity: 0.2,
    top: -18,
    left: -18,
  },
  sparkleGlow: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0C3FC",
    opacity: 0.2,
    top: -14,
    left: -14,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
    letterSpacing: 1,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#B8A4D6",
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 300,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
    textAlign: "center",
  },
  continueButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  continueButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
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
    maxWidth: 300,
  },
  goalsContainer: {
    flex: 1,
    marginBottom: 20,
  },
  goalCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    marginBottom: 16,
  },
  goalCardGradient: {
    padding: 16,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  goalNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#E0C3FC",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  goalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    padding: 12,
    fontSize: 15,
    color: "#fff",
    minHeight: 60,
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 13,
    color: "#8EA7E9",
    marginBottom: 8,
    fontWeight: "600",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  addGoalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(142, 167, 233, 0.5)",
    borderStyle: "dashed",
  },
  addGoalButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8EA7E9",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(142, 167, 233, 0.5)",
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8EA7E9",
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  celestialDecor: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
});
