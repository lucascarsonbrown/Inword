import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUserGoals,
  updateGoal,
  deleteGoal as deleteGoalDB,
  createGoal as createGoalDB,
  Goal as DBGoal,
} from "@/services/database";
import { parseGoalProgress, GoalProgressData } from "@/services/goal-progress";

export interface Goal {
  id: string;
  text: string;
  timeframe: number; // in months: 1-120+ (1 month to 10 years)
  importance: number; // 1-5 stars
  aiProgress?: string; // AI-generated progress notes (to be implemented)
}

export default function VisionBoardScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadGoals();
    }, [])
  );

  const loadGoals = async () => {
    try {
      setLoading(true);
      const dbGoals = await getUserGoals();
      const formattedGoals: Goal[] = dbGoals.map((g) => ({
        id: g.id,
        text: g.text,
        timeframe: g.timeframe,
        importance: g.importance,
        aiProgress: g.ai_progress || undefined,
      }));
      setGoals(formattedGoals);
    } catch (error) {
      console.error("Error loading goals:", error);
      Alert.alert("Error", "Failed to load goals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoalPress = (goal: Goal) => {
    setSelectedGoal(goal);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal({ ...goal });
  };

  const handleSaveGoal = async () => {
    if (!editingGoal) return;

    setSaving(true);
    try {
      // Check if this is a new goal (temporary ID) or existing
      const isNew = editingGoal.id.startsWith("temp-");

      if (isNew) {
        // Create new goal in database
        const newGoal = await createGoalDB(
          editingGoal.text,
          editingGoal.timeframe,
          editingGoal.importance
        );
        // Remove temp goal and add real one
        setGoals(goals.map((g) =>
          g.id === editingGoal.id
            ? {
                id: newGoal.id,
                text: newGoal.text,
                timeframe: newGoal.timeframe,
                importance: newGoal.importance,
                aiProgress: newGoal.ai_progress || undefined,
              }
            : g
        ));
      } else {
        // Update existing goal
        await updateGoal(editingGoal.id, {
          text: editingGoal.text,
          timeframe: editingGoal.timeframe,
          importance: editingGoal.importance,
        });
        setGoals(goals.map((g) => (g.id === editingGoal.id ? editingGoal : g)));
      }

      setEditingGoal(null);
      setSettingsVisible(false);
    } catch (error) {
      console.error("Error saving goal:", error);
      Alert.alert("Error", "Failed to save goal. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewGoal = () => {
    const newGoal: Goal = {
      id: `temp-${Date.now()}`,
      text: "New Goal",
      timeframe: 12, // 1 year default
      importance: 3,
    };
    setGoals([...goals, newGoal]);
    setEditingGoal(newGoal);
  };

  // Convert slider value (0-100) to months using exponential scale
  const sliderToMonths = (value: number): number => {
    // Exponential scale: 1 month to 120 months (10 years)
    // Formula: months = 1 * (120^(value/100))
    const months = Math.round(Math.pow(120, value / 100));
    return Math.max(1, Math.min(120, months));
  };

  // Convert months to slider value (0-100)
  const monthsToSlider = (months: number): number => {
    // Inverse of exponential: value = 100 * log(months) / log(120)
    if (months <= 1) return 0;
    if (months >= 120) return 100;
    return (Math.log(months) / Math.log(120)) * 100;
  };

  const formatTimeframe = (months: number): string => {
    if (months < 12) {
      return months === 1 ? "1 month" : `${months} months`;
    } else if (months === 12) {
      return "1 year";
    } else if (months < 120) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (remainingMonths === 0) {
        return `${years} years`;
      } else {
        return `${years}y ${remainingMonths}m`;
      }
    } else {
      return "10+ years";
    }
  };

  const handleDeleteGoal = async (id: string) => {
    Alert.alert(
      "Delete Goal",
      "Are you sure you want to delete this goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              // Only delete from DB if it's not a temp goal
              if (!id.startsWith("temp-")) {
                await deleteGoalDB(id);
              }
              setGoals(goals.filter((g) => g.id !== id));
              setEditingGoal(null);
            } catch (error) {
              console.error("Error deleting goal:", error);
              Alert.alert("Error", "Failed to delete goal. Please try again.");
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const renderStars = (importance: number, editable: boolean = false, onPress?: (rating: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = importance >= i;
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => editable && onPress?.(i)}
          disabled={!editable}
        >
          <Ionicons
            name={isFull ? "star" : "star-outline"}
            size={editable ? 28 : 16}
            color="#FFD700"
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getTimeframeIcon = (months: number) => {
    if (months <= 3) return "calendar";
    if (months <= 12) return "calendar-outline";
    if (months <= 36) return "time";
    return "planet";
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E0C3FC" />
          <Text style={styles.loadingText}>Loading your goals...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="planet" size={32} color="#E0C3FC" />
          <Text style={styles.title}>Vision Board</Text>
          <Text style={styles.subtitle}>Your path to growth and fulfillment</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setSettingsVisible(true)}>
          <Ionicons name="settings" size={24} color="#E0C3FC" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.goalsContainer} contentContainerStyle={styles.goalsContent}>
        {goals.map((goal, index) => (
          <TouchableOpacity
            key={goal.id}
            onPress={() => handleGoalPress(goal)}
            activeOpacity={0.8}
          >
            <View style={styles.goalCard}>
              <LinearGradient
                colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.15)"]}
                style={styles.goalGradient}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleRow}>
                    <Ionicons
                      name={getTimeframeIcon(goal.timeframe)}
                      size={20}
                      color="#E0C3FC"
                    />
                    <Text style={styles.goalText}>{goal.text}</Text>
                  </View>
                  <View style={styles.starsRow}>{renderStars(goal.importance)}</View>
                </View>

                <View style={styles.goalMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#8EA7E9" />
                    <Text style={styles.metaText}>{formatTimeframe(goal.timeframe)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Goal Detail Modal - Full Screen */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={selectedGoal !== null}
        onRequestClose={() => setSelectedGoal(null)}
      >
        <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
          <View style={styles.detailScreenHeader}>
            <TouchableOpacity onPress={() => setSelectedGoal(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.detailScreenTitle}>Goal Details</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.detailScrollView} contentContainerStyle={styles.detailScrollContent}>
            {selectedGoal && (
              <>
                <View style={styles.detailGoalCard}>
                  <LinearGradient
                    colors={["rgba(102, 126, 234, 0.2)", "rgba(118, 75, 162, 0.2)"]}
                    style={styles.detailGoalGradient}
                  >
                    <View style={styles.detailGoalIcon}>
                      <Ionicons
                        name={getTimeframeIcon(selectedGoal.timeframe)}
                        size={40}
                        color="#E0C3FC"
                      />
                    </View>
                    <Text style={styles.detailGoalText}>{selectedGoal.text}</Text>
                  </LinearGradient>
                </View>

                <View style={styles.detailMetaSection}>
                  <View style={styles.detailMetaCard}>
                    <Text style={styles.detailMetaLabel}>Importance</Text>
                    <View style={styles.detailStarsRow}>
                      {renderStars(selectedGoal.importance)}
                    </View>
                  </View>

                  <View style={styles.detailMetaCard}>
                    <Text style={styles.detailMetaLabel}>Timeframe</Text>
                    <Text style={styles.detailMetaValue}>
                      {formatTimeframe(selectedGoal.timeframe)}
                    </Text>
                  </View>
                </View>

                <View style={styles.aiProgressCard}>
                  <View style={styles.aiProgressHeader}>
                    <Ionicons name="analytics" size={24} color="#E0C3FC" />
                    <Text style={styles.aiProgressTitle}>AI Progress Tracking</Text>
                  </View>
                  <Text style={styles.aiProgressSubtitle}>
                    Insights based on your journal entries
                  </Text>

                  {(() => {
                    const progressData = parseGoalProgress(selectedGoal.aiProgress || null);

                    if (!progressData) {
                      return (
                        <View style={styles.aiProgressContent}>
                          <Ionicons name="sparkles-outline" size={32} color="#8EA7E9" style={{ alignSelf: 'center', marginBottom: 12 }} />
                          <Text style={styles.noProgressText}>
                            No progress data yet. Keep journaling to see AI-generated insights about your progress toward this goal!
                          </Text>
                        </View>
                      );
                    }

                    return (
                      <>
                        {/* Progress Bar Section */}
                        <View style={styles.progressBarSection}>
                          <View style={styles.progressBarHeader}>
                            <Text style={styles.progressPercentLabel}>Progress</Text>
                            <Text style={styles.progressPercentValue}>{progressData.percent}%</Text>
                          </View>

                          {/* Progress Bar Track */}
                          <View style={styles.progressBarTrack}>
                            <LinearGradient
                              colors={
                                progressData.percent === 0
                                  ? ["#3a3a52", "#2d2d44"]
                                  : progressData.percent < 30
                                  ? ["#667eea", "#764ba2"]
                                  : progressData.percent < 70
                                  ? ["#FFD700", "#FFA500"]
                                  : ["#4ade80", "#22c55e"]
                              }
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[
                                styles.progressBarFill,
                                { width: `${progressData.percent}%` }
                              ]}
                            />
                          </View>

                          {/* Momentum Indicator */}
                          {progressData.momentum_score > 0 && (
                            <View style={styles.momentumIndicator}>
                              <Ionicons
                                name={
                                  progressData.momentum_score >= 7
                                    ? "flame"
                                    : progressData.momentum_score >= 4
                                    ? "trending-up"
                                    : "footsteps"
                                }
                                size={16}
                                color={
                                  progressData.momentum_score >= 7
                                    ? "#FF6B6B"
                                    : progressData.momentum_score >= 4
                                    ? "#FFD700"
                                    : "#8EA7E9"
                                }
                              />
                              <Text style={styles.momentumText}>
                                {progressData.momentum_score >= 7
                                  ? "High Momentum"
                                  : progressData.momentum_score >= 4
                                  ? "Steady Pace"
                                  : "Building Momentum"}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* AI Message */}
                        <View style={styles.aiMessageSection}>
                          <Text style={styles.aiMessageText}>
                            {progressData.message}
                          </Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
          <View style={styles.settingsHeader}>
            <TouchableOpacity onPress={() => setSettingsVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.settingsTitle}>Manage Goals</Text>
            <TouchableOpacity onPress={handleAddNewGoal}>
              <Ionicons name="add-circle" size={28} color="#E0C3FC" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsList}>
            {goals.map((goal) => (
              <View key={goal.id} style={styles.settingsGoalCard}>
                {editingGoal?.id === goal.id ? (
                  <View style={styles.editingCard}>
                    <TextInput
                      style={styles.editInput}
                      value={editingGoal.text}
                      onChangeText={(text) =>
                        setEditingGoal({ ...editingGoal, text })
                      }
                      placeholder="Goal text"
                      placeholderTextColor="#8EA7E9"
                    />

                    <Text style={styles.editLabel}>Importance</Text>
                    <View style={styles.starsRow}>
                      {renderStars(editingGoal.importance, true, (rating) =>
                        setEditingGoal({ ...editingGoal, importance: rating })
                      )}
                    </View>

                    <Text style={styles.editLabel}>Timeframe</Text>
                    <View style={styles.sliderContainer}>
                      <Text style={styles.timeframeDisplay}>
                        {formatTimeframe(editingGoal.timeframe)}
                      </Text>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={100}
                        step={1}
                        value={monthsToSlider(editingGoal.timeframe)}
                        onValueChange={(value) =>
                          setEditingGoal({ ...editingGoal, timeframe: sliderToMonths(value) })
                        }
                        minimumTrackTintColor="#667eea"
                        maximumTrackTintColor="rgba(255, 255, 255, 0.2)"
                        thumbTintColor="#E0C3FC"
                      />
                      <View style={styles.sliderLabels}>
                        <Text style={styles.sliderLabel}>1 month</Text>
                        <Text style={styles.sliderLabel}>10+ years</Text>
                      </View>
                    </View>

                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteGoal(editingGoal.id)}
                      >
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSaveGoal}
                        disabled={saving}
                      >
                        <LinearGradient
                          colors={saving ? ["#3a3a52", "#2d2d44"] : ["#667eea", "#764ba2"]}
                          style={styles.saveButtonGradient}
                        >
                          {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.goalSummary}
                    onPress={() => handleEditGoal(goal)}
                  >
                    <Text style={styles.goalSummaryText}>{goal.text}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#8EA7E9" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
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
  },
  settingsButton: {
    padding: 8,
  },
  goalsContainer: {
    flex: 1,
  },
  goalsContent: {
    padding: 20,
    gap: 16,
  },
  goalCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.3)",
    marginBottom: 16,
  },
  goalGradient: {
    padding: 20,
  },
  goalHeader: {
    marginBottom: 12,
  },
  goalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  goalText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    lineHeight: 24,
  },
  starsRow: {
    flexDirection: "row",
    gap: 4,
  },
  goalMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#8EA7E9",
    fontWeight: "500",
  },
  progressSection: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: "#B8A4D6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressText: {
    fontSize: 14,
    color: "#E0C3FC",
    lineHeight: 20,
    fontStyle: "italic",
  },
  detailScreenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 195, 252, 0.2)",
  },
  detailScreenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  backButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  detailScrollView: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 20,
  },
  detailGoalCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.3)",
    marginBottom: 24,
  },
  detailGoalGradient: {
    padding: 32,
    alignItems: "center",
  },
  detailGoalIcon: {
    marginBottom: 16,
  },
  detailGoalText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 32,
  },
  detailMetaSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  detailMetaCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    padding: 20,
    alignItems: "center",
  },
  detailMetaLabel: {
    fontSize: 12,
    color: "#B8A4D6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailStarsRow: {
    flexDirection: "row",
    gap: 6,
  },
  detailMetaValue: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "700",
  },
  aiProgressCard: {
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.3)",
    padding: 24,
  },
  aiProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  aiProgressTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E0C3FC",
  },
  aiProgressSubtitle: {
    fontSize: 13,
    color: "#B8A4D6",
    fontStyle: "italic",
    marginBottom: 20,
  },
  aiProgressContent: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 16,
  },
  aiProgressText: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 24,
  },
  noProgressText: {
    fontSize: 15,
    color: "#B8A4D6",
    lineHeight: 24,
    textAlign: "center",
    fontStyle: "italic",
  },
  progressBarSection: {
    marginTop: 16,
    marginBottom: 20,
  },
  progressBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressPercentLabel: {
    fontSize: 14,
    color: "#B8A4D6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressPercentValue: {
    fontSize: 28,
    color: "#E0C3FC",
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 6,
    minWidth: 4,
  },
  momentumIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  momentumText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  aiMessageSection: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    borderRadius: 12,
    padding: 16,
  },
  aiMessageText: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 24,
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 195, 252, 0.2)",
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  settingsList: {
    flex: 1,
    padding: 20,
  },
  settingsGoalCard: {
    marginBottom: 12,
  },
  goalSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
  },
  goalSummaryText: {
    fontSize: 16,
    color: "#fff",
    flex: 1,
    fontWeight: "600",
  },
  editingCard: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.3)",
  },
  editInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    padding: 16,
    fontSize: 16,
    color: "#fff",
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 12,
    color: "#B8A4D6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 20,
  },
  timeframeDisplay: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E0C3FC",
    textAlign: "center",
    marginBottom: 16,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 11,
    color: "#8EA7E9",
    fontWeight: "500",
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255, 59, 48, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.5)",
    alignItems: "center",
  },
  deleteButtonText: {
    fontSize: 15,
    color: "#ff3b30",
    fontWeight: "700",
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
  },
});
