import { useState } from "react";
import { Tabs } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SettingsModal from "@/components/SettingsModal";

export default function TabLayout() {
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#1a1a2e",
          },
          headerTintColor: "#E0C3FC",
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 20,
            letterSpacing: 1,
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setSettingsVisible(true)}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="settings" size={24} color="#E0C3FC" />
            </TouchableOpacity>
          ),
          tabBarActiveTintColor: "#E0C3FC",
          tabBarInactiveTintColor: "#8EA7E9",
          tabBarStyle: {
            backgroundColor: "#1a1a2e",
            borderTopColor: "#2d2d44",
            borderTopWidth: 1,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
      <Tabs.Screen
        name="journal"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vision-board"
        options={{
          title: "Vision Board",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="planet" size={size} color={color} />
          ),
        }}
      />
    </Tabs>

    <SettingsModal
      visible={settingsVisible}
      onClose={() => setSettingsVisible(false)}
    />
    </>
  );
}
