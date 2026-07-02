import { Tabs } from "expo-router";
import React from "react";
import { ColorValue, Text } from "react-native";

const icon = (glyph: string) => ({ color }: { color: ColorValue }) =>
  <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF7A45",
        tabBarInactiveTintColor: "#8A94B0",
        tabBarStyle: {
          backgroundColor: "#141B2E",
          borderTopColor: "#283150",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: icon("☀️") }} />
      <Tabs.Screen name="goals" options={{ title: "Goals", tabBarIcon: icon("🎯") }} />
      <Tabs.Screen name="insights" options={{ title: "Insights", tabBarIcon: icon("📈") }} />
    </Tabs>
  );
}
