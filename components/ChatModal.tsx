import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ChatMessage } from "@/contexts/AppContext";

interface ChatModalProps {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
}

export default function ChatModal({
  visible,
  onClose,
  messages,
  onSendMessage,
  isLoading,
}: ChatModalProps) {
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (inputText.trim() && !isLoading) {
      const message = inputText.trim();
      setInputText("");
      await onSendMessage(message);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat About Your Entry</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.chatContainer}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles" size={48} color="#4a4a68" />
                <Text style={styles.emptyText}>
                  Ask me anything about your journal entry!
                </Text>
              </View>
            ) : (
              messages.map((message) => (
                <View
                  key={message.id}
                  style={[
                    styles.messageBubble,
                    message.role === "user" ? styles.userBubble : styles.aiBubble,
                  ]}
                >
                  {message.role === "ai" && (
                    <Ionicons
                      name="sparkles"
                      size={16}
                      color="#E0C3FC"
                      style={styles.messageIcon}
                    />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.role === "user" ? styles.userText : styles.aiText,
                    ]}
                  >
                    {message.content}
                  </Text>
                </View>
              ))
            )}
            {isLoading && (
              <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#E0C3FC" />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor="#8EA7E9"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
            >
              <LinearGradient
                colors={inputText.trim() && !isLoading ? ["#667eea", "#764ba2"] : ["#3a3a52", "#2d2d44"]}
                style={styles.sendButtonGradient}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 195, 252, 0.2)",
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  placeholder: {
    width: 40,
  },
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#8EA7E9",
    marginTop: 16,
    textAlign: "center",
  },
  messageBubble: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(102, 126, 234, 0.3)",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(224, 195, 252, 0.15)",
    borderBottomLeftRadius: 4,
  },
  messageIcon: {
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#fff",
  },
  aiText: {
    color: "#E0C3FC",
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#B8A4D6",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(224, 195, 252, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#fff",
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    overflow: "hidden",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
