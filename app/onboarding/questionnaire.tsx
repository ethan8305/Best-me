import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CATEGORY_META } from "../../src/theme/categories";
import { useAppStore } from "../../src/stores/useAppStore";
import { WELLNESS_CATEGORIES, Category } from "../../src/types";

const RHYTHMS: { key: string; label: string; window: { start: number; end: number } }[] = [
  { key: "early", label: "Early bird (6–21)", window: { start: 360, end: 1260 } },
  { key: "standard", label: "Standard (7–22)", window: { start: 420, end: 1320 } },
  { key: "night", label: "Night owl (9–24)", window: { start: 540, end: 1440 } },
];

/** Step 2: structured needs — which wellness needs to honor + daily rhythm. */
export default function Questionnaire() {
  const params = useLocalSearchParams<{ name?: string; summary?: string }>();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [selected, setSelected] = useState<Category[]>(["movement", "family", "rest"]);
  const [rhythm, setRhythm] = useState("standard");

  const toggle = (cat: Category) =>
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const finish = () => {
    const window = RHYTHMS.find((r) => r.key === rhythm)!.window;
    completeOnboarding({
      name: params.name ?? "",
      summary: params.summary ?? "",
      dayWindow: window,
      desiredCategories: selected,
    });
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <ScrollView contentContainerClassName="flex-grow px-6 py-8">
        <Text className="text-3xl font-bold text-white">
          What does a balanced day need?
        </Text>
        <Text className="mt-3 text-muted">
          Pick the needs Best me should always protect. A day only keeps your streak
          when you honor your work and at least one of these.
        </Text>

        <View className="mt-6 flex-row flex-wrap">
          {WELLNESS_CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const on = selected.includes(cat);
            return (
              <Pressable
                key={cat}
                onPress={() => toggle(cat)}
                className={`mb-3 mr-3 rounded-2xl px-4 py-3 ${on ? "bg-card" : "bg-surface"}`}
                style={on ? { borderColor: meta.color, borderWidth: 2 } : undefined}
              >
                <Text className="text-white font-semibold">
                  {meta.emoji} {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-6 mb-2 text-white font-semibold">Your daily rhythm</Text>
        {RHYTHMS.map((r) => (
          <Pressable
            key={r.key}
            onPress={() => setRhythm(r.key)}
            className={`mb-2 rounded-2xl px-4 py-3 ${
              rhythm === r.key ? "bg-flame" : "bg-card"
            }`}
          >
            <Text
              className={`font-semibold ${rhythm === r.key ? "text-ink" : "text-white"}`}
            >
              {r.label}
            </Text>
          </Pressable>
        ))}

        <View className="flex-1" />

        <Pressable onPress={finish} className="mt-8 rounded-2xl bg-flame py-4">
          <Text className="text-center text-base font-bold text-ink">
            Build my first day
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
