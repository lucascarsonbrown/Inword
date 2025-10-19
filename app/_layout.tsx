import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      console.log("🔄 Root Layout - Still loading...");
      return;
    }

    const inAuthGroup = segments[0] === "(tabs)";

    console.log("🔍 Root Layout - User:", user ? "Signed in" : "Signed out");
    console.log("🔍 Root Layout - Segments:", segments);
    console.log("🔍 Root Layout - In auth group:", inAuthGroup);

    if (!user && inAuthGroup) {
      // User is signed out but trying to access protected routes
      console.log("🚫 Redirecting to /auth - User signed out");
      router.replace("/auth");
    } else if (user && segments[0] === "auth") {
      // User is signed in but on auth page
      console.log("✅ Redirecting to journal - User signed in");
      router.replace("/(tabs)/journal");
    }
  }, [user, loading, segments]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppProvider>
        <RootLayoutNav />
      </AppProvider>
    </AuthProvider>
  );
}
