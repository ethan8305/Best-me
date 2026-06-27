import { Stack } from "expo-router";
import React from "react";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0B1020" },
      }}
    />
  );
}
