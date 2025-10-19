import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import ChatModal from "@/components/ChatModal";
import { chatWithAI } from "@/services/gemini";
import {
  getTodayEntry,
  getEntriesByDate,
  getEntryDates,
  getInsightByEntryId,
  getChatMessages,
  addChatMessage,
  getUserGoals,
  JournalEntry,
  Insight,
  ChatMessage as DBChatMessage,
} from "@/services/database";
import { fetchAndDecryptKB, createCompactContext } from "@/services/kb-manager";
import { CompactKBContext } from "@/types/kb-types";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

export default function InsightsScreen() {
  const [todayEntries, setTodayEntries] = useState<JournalEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<JournalEntry[]>([]);
  const [entryDates, setEntryDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [showInsight, setShowInsight] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<Insight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [kbContext, setKbContext] = useState<CompactKBContext | null>(null);

  useEffect(() => {
    loadData();
  }, [currentMonth]);

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [currentMonth])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Load today's entries
      const entries = await getEntriesByDate(today);
      setTodayEntries(entries);

      // Load entry dates for calendar
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const dates = await getEntryDates(year, month);
      setEntryDates(dates);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePress = async (date: string) => {
    try {
      setSelectedDate(date);
      const entries = await getEntriesByDate(date);
      setSelectedEntries(entries);
    } catch (error) {
      console.error("Error loading entries for date:", error);
    }
  };

  const handleViewInsight = async (entryId: string) => {
    try {
      setInsightLoading(true);
      setShowInsight(true);
      const insight = await getInsightByEntryId(entryId);
      setCurrentInsight(insight);
    } catch (error) {
      console.error("Error loading insight:", error);
    } finally {
      setInsightLoading(false);
    }
  };

  const handleOpenChat = async (entryId: string) => {
    setCurrentEntryId(entryId);
    setShowChat(true);

    // Load KB context in background
    loadKBContext().catch((err) => console.error("Failed to load KB context:", err));

    // Load existing chat messages
    try {
      const messages = await getChatMessages(entryId);
      setChatMessages(
        messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
        }))
      );

      // If no messages, generate initial AI prompt
      if (messages.length === 0) {
        setIsChatLoading(true);
        const entry = todayEntries.find((e) => e.id === entryId) ||
                      selectedEntries.find((e) => e.id === entryId);

        if (entry) {
          const initialPrompt = await chatWithAI(
            "Please ask me a thoughtful follow-up question about my journal entry to help me explore my thoughts deeper.",
            entry.entry_text,
            entry.rating,
            [],
            kbContext
          );

          const aiMsg = await addChatMessage(entryId, "ai", initialPrompt);
          setChatMessages([
            {
              id: aiMsg.id,
              role: "ai",
              content: aiMsg.content,
              timestamp: new Date(aiMsg.created_at),
            },
          ]);
        }
        setIsChatLoading(false);
      }
    } catch (error) {
      console.error("Error loading chat:", error);
      setIsChatLoading(false);
    }
  };

  const loadKBContext = async () => {
    try {
      console.log("🔐 Loading KB context for chat...");
      const kb = await fetchAndDecryptKB();
      const goals = await getUserGoals();
      const context = createCompactContext(kb, goals);
      setKbContext(context);
      console.log("✅ KB context loaded");
    } catch (error) {
      console.error("Error loading KB context:", error);
      // Don't throw - chat should work even without KB context
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!currentEntryId) return;

    const entry = todayEntries.find((e) => e.id === currentEntryId) ||
                  selectedEntries.find((e) => e.id === currentEntryId);
    if (!entry) return;

    try {
      // Add user message to DB
      const userMsg = await addChatMessage(currentEntryId, "user", message);
      setChatMessages((prev) => [
        ...prev,
        {
          id: userMsg.id,
          role: "user",
          content: userMsg.content,
          timestamp: new Date(userMsg.created_at),
        },
      ]);

      setIsChatLoading(true);

      // Get AI response with KB context
      const aiResponse = await chatWithAI(
        message,
        entry.entry_text,
        entry.rating,
        chatMessages.map((msg) => ({ role: msg.role, content: msg.content })),
        kbContext
      );

      // Add AI message to DB
      const aiMsg = await addChatMessage(currentEntryId, "ai", aiResponse);
      setChatMessages((prev) => [
        ...prev,
        {
          id: aiMsg.id,
          role: "ai",
          content: aiMsg.content,
          timestamp: new Date(aiMsg.created_at),
        },
      ]);
    } catch (error) {
      console.error("Error in chat:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isHalf = rating === i - 0.5;
      const isFull = rating >= i;
      stars.push(
        <Ionicons
          key={i}
          name={isFull ? "star" : isHalf ? "star-half" : "star-outline"}
          size={16}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    const weeks = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const hasEntry = entryDates.includes(date);
      const isSelected = selectedDate === date;
      const isToday = date === new Date().toISOString().split("T")[0];

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            isToday && styles.calendarDayToday,
            isSelected && styles.calendarDaySelected,
          ]}
          onPress={() => hasEntry && handleDatePress(date)}
          disabled={!hasEntry}
        >
          <Text
            style={[
              styles.calendarDayText,
              hasEntry && styles.calendarDayTextWithEntry,
              isSelected && styles.calendarDayTextSelected,
              isToday && styles.calendarDayTextToday,
            ]}
          >
            {day}
          </Text>
          {hasEntry && !isSelected && (
            <View style={styles.entryDot}>
              <Ionicons name="star" size={8} color="#FFD700" />
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Split into weeks
    while (days.length > 0) {
      weeks.push(
        <View key={weeks.length} style={styles.calendarWeek}>
          {days.splice(0, 7)}
        </View>
      );
    }

    return weeks;
  };

  const changeMonth = (direction: number) => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1)
    );
    setSelectedDate(null);
    setSelectedEntries([]);
  };

  if (loading) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E0C3FC" />
          <Text style={styles.loadingText}>Loading insights...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.celestialIcon}>
            <Ionicons name="sparkles" size={32} color="#E0C3FC" />
            <View style={styles.sparkleGlow} />
          </View>
          <Text style={styles.title}>Calendar</Text>
          <Text style={styles.subtitle}>Explore your cosmic journey</Text>
        </View>

        {/* Today's Entries Chat Section */}
        {todayEntries.length > 0 && (
          <View style={styles.todaySection}>
            <Text style={styles.sectionTitle}>Today's Reflections</Text>
            {todayEntries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <LinearGradient
                  colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.15)"]}
                  style={styles.entryCardGradient}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.starsRow}>{renderStars(entry.rating)}</View>
                    <Text style={styles.entryTime}>
                      {new Date(entry.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.entryText} numberOfLines={3}>
                    {entry.entry_text}
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.insightButton}
                      onPress={() => handleViewInsight(entry.id)}
                    >
                      <LinearGradient
                        colors={["#FFD700", "#FFA500"]}
                        style={styles.insightButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="sparkles" size={16} color="#fff" />
                        <Text style={styles.insightButtonText}>View Insights</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => handleOpenChat(entry.id)}
                    >
                      <LinearGradient
                        colors={["#667eea", "#764ba2"]}
                        style={styles.chatButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="chatbubbles" size={16} color="#fff" />
                        <Text style={styles.chatButtonText}>Chat</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}

        {/* Calendar Section */}
        <View style={styles.calendarSection}>
          <Text style={styles.sectionTitle}>Your Journey</Text>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
              <Ionicons name="chevron-back" size={24} color="#E0C3FC" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
              <Ionicons name="chevron-forward" size={24} color="#E0C3FC" />
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <View style={styles.calendar}>
            {/* Day headers */}
            <View style={styles.calendarWeek}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <View key={day} style={styles.calendarDayHeader}>
                  <Text style={styles.calendarDayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>
            {renderCalendar()}
          </View>
        </View>

        {/* Selected Date Entries */}
        {selectedDate && selectedEntries.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.sectionTitle}>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
            {selectedEntries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <LinearGradient
                  colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.15)"]}
                  style={styles.entryCardGradient}
                >
                  <View style={styles.entryHeader}>
                    <View style={styles.starsRow}>{renderStars(entry.rating)}</View>
                    <Text style={styles.entryTime}>
                      {new Date(entry.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.entryText}>{entry.entry_text}</Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.insightButton}
                      onPress={() => handleViewInsight(entry.id)}
                    >
                      <LinearGradient
                        colors={["#FFD700", "#FFA500"]}
                        style={styles.insightButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="sparkles" size={16} color="#fff" />
                        <Text style={styles.insightButtonText}>View Insights</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={() => handleOpenChat(entry.id)}
                    >
                      <LinearGradient
                        colors={["#667eea", "#764ba2"]}
                        style={styles.chatButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="chatbubbles" size={16} color="#fff" />
                        <Text style={styles.chatButtonText}>Chat</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}

        {/* Celestial decoration */}
        <View style={styles.celestialDecor}>
          <Ionicons name="planet-outline" size={16} color="rgba(224, 195, 252, 0.3)" />
          <Ionicons name="moon-outline" size={12} color="rgba(224, 195, 252, 0.2)" />
          <Ionicons name="star-outline" size={14} color="rgba(224, 195, 252, 0.25)" />
        </View>
      </ScrollView>

      {/* Insight Modal */}
      <Modal
        visible={showInsight}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInsight(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.insightModalContainer}>
            <LinearGradient
              colors={["#0f0c29", "#302b63", "#24243e"]}
              style={styles.insightModalGradient}
            >
              <View style={styles.insightModalHeader}>
                <View style={styles.insightIconContainer}>
                  <Ionicons name="sparkles" size={28} color="#FFD700" />
                  <View style={styles.insightGlow} />
                </View>
                <Text style={styles.insightModalTitle}>AI Insights</Text>
                <TouchableOpacity
                  onPress={() => setShowInsight(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close-circle" size={32} color="#8EA7E9" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.insightContent} showsVerticalScrollIndicator={false}>
                {insightLoading ? (
                  <View style={styles.insightLoadingContainer}>
                    <ActivityIndicator size="large" color="#E0C3FC" />
                    <Text style={styles.loadingText}>Loading insights...</Text>
                  </View>
                ) : currentInsight ? (
                  <View style={styles.insightTextContainer}>
                    <LinearGradient
                      colors={["rgba(255, 215, 0, 0.1)", "rgba(255, 165, 0, 0.1)"]}
                      style={styles.insightCard}
                    >
                      <Text style={styles.insightText}>{currentInsight.reflection}</Text>
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.noInsightContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#8EA7E9" />
                    <Text style={styles.noInsightText}>
                      No insights found for this entry.
                    </Text>
                  </View>
                )}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      {currentEntryId && (
        <ChatModal
          visible={showChat}
          onClose={() => {
            setShowChat(false);
            setChatMessages([]);
            setCurrentEntryId(null);
          }}
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
        />
      )}
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
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  celestialIcon: {
    position: "relative",
    marginBottom: 12,
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
  todaySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E0C3FC",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  entryCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    marginBottom: 12,
  },
  entryCardGradient: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  entryTime: {
    fontSize: 12,
    color: "#8EA7E9",
    fontWeight: "600",
  },
  entryText: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 22,
    marginBottom: 12,
  },
  chatButton: {
    borderRadius: 10,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  chatButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  calendarSection: {
    marginBottom: 32,
  },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  calendar: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.15)",
  },
  calendarWeek: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  calendarDayHeader: {
    width: 40,
    paddingVertical: 8,
    alignItems: "center",
  },
  calendarDayHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8EA7E9",
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    marginVertical: 4,
  },
  calendarDayToday: {
    backgroundColor: "rgba(224, 195, 252, 0.15)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.5)",
  },
  calendarDaySelected: {
    backgroundColor: "rgba(102, 126, 234, 0.3)",
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  calendarDayTextWithEntry: {
    color: "#fff",
    fontWeight: "700",
  },
  calendarDayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  calendarDayTextToday: {
    color: "#E0C3FC",
  },
  entryDot: {
    position: "absolute",
    bottom: 4,
  },
  selectedSection: {
    marginBottom: 32,
  },
  celestialDecor: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  insightButton: {
    borderRadius: 10,
    overflow: "hidden",
    flex: 1,
    minWidth: 120,
  },
  insightButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  insightButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  insightModalContainer: {
    width: "100%",
    maxWidth: 500,
    maxHeight: "80%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.3)",
  },
  insightModalGradient: {
    padding: 24,
    minHeight: 300,
  },
  insightModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  insightIconContainer: {
    position: "relative",
  },
  insightGlow: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFD700",
    opacity: 0.2,
    top: -11,
    left: -11,
  },
  insightModalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
    flex: 1,
    textAlign: "center",
    marginRight: 32,
  },
  closeButton: {
    padding: 4,
  },
  insightContent: {
    flex: 1,
  },
  insightLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
  },
  insightTextContainer: {
    paddingBottom: 20,
  },
  insightCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.3)",
  },
  insightText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#fff",
    letterSpacing: 0.3,
  },
  noInsightContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
  },
  noInsightText: {
    fontSize: 16,
    color: "#8EA7E9",
    textAlign: "center",
  },
});
