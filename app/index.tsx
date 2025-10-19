import { useState, useEffect } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { hasCompletedOnboarding } from "@/services/database";

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [completedOnboarding, setCompletedOnboarding] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      if (user && !authLoading) {
        const completed = await hasCompletedOnboarding();
        setCompletedOnboarding(completed);
        setCheckingOnboarding(false);
      } else if (!authLoading) {
        setCheckingOnboarding(false);
      }
    }

    checkOnboarding();
  }, [user, authLoading]);

  // Debug logging
  console.log("🔍 Index - Auth Loading:", authLoading);
  console.log("🔍 Index - Checking Onboarding:", checkingOnboarding);
  console.log("🔍 Index - User:", user ? "Logged in" : "Not logged in");
  console.log("🔍 Index - Completed Onboarding:", completedOnboarding);

  if (authLoading || checkingOnboarding) {
    return (
      <LinearGradient colors={["#0f0c29", "#302b63", "#24243e"]} style={styles.container}>
        <ActivityIndicator size="large" color="#E0C3FC" />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  // No auth required - anonymous user is created automatically
  if (!completedOnboarding) {
    console.log("🚀 Redirecting to onboarding - First time user");
    return <Redirect href="/onboarding" />;
  }

  console.log("✅ Redirecting to journal - Returning user");
  return <Redirect href="/(tabs)/journal" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#8EA7E9",
    marginTop: 16,
  },
});
