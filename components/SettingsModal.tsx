import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { user } = useAuth();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={["#1a1a2e", "#16213e", "#0f0c29"]}
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Settings</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#E0C3FC" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Device Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Storage</Text>

                <View style={styles.userInfo}>
                  <View style={styles.userIconContainer}>
                    <Ionicons name="phone-portrait" size={60} color="#E0C3FC" />
                  </View>
                  <View style={styles.userDetails}>
                    <Text style={styles.userEmail}>Device Storage</Text>
                    <Text style={styles.userStatus}>All data stored locally & encrypted</Text>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>End-to-End Encryption</Text>
                    <Text style={styles.infoValue}>Your journal is encrypted on this device</Text>
                  </View>
                </View>
              </View>

              {/* App Info Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <View style={styles.infoItem}>
                  <Ionicons name="planet" size={24} color="#E0C3FC" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>InWord</Text>
                    <Text style={styles.infoValue}>Version 1.0.0</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Ionicons name="information-circle" size={24} color="#E0C3FC" />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Your journey to growth</Text>
                    <Text style={styles.infoValue}>and fulfillment</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(224, 195, 252, 0.1)",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#E0C3FC",
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
  },
  userIconContainer: {
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: "#8EA7E9",
  },
  notSignedInContainer: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.2)",
  },
  notSignedInText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginTop: 12,
  },
  notSignedInSubtext: {
    fontSize: 14,
    color: "#8EA7E9",
    marginTop: 8,
    textAlign: "center",
    maxWidth: 250,
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  signInButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  signInButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  signOutButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  signOutButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  signOutButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(224, 195, 252, 0.1)",
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  infoValue: {
    fontSize: 14,
    color: "#8EA7E9",
    marginTop: 2,
  },
});
