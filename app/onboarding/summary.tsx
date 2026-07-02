import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStore } from "../../src/stores/useAppStore";

/** Step 1: a warm intro + a free-text "what matters right now" summary. */
export default function Summary() {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const exploreWithSeed = useAppStore((s) => s.exploreWithSeed);

  return (
    <SafeAreaView className="flex-1 bg-ink">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerClassName="flex-grow px-6 py-8">
          <Text className="text-flame text-base font-semibold">Best me</Text>
          <Text className="mt-2 text-3xl font-bold text-white">
            Let's design days that bring out your best.
          </Text>
          <Text className="mt-3 text-muted">
            First, a few words from you. Everything is private and shapes the plans
            Best me builds.
          </Text>

          <Text className="mt-8 mb-2 text-white font-semibold">Your name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="What should we call you?"
            placeholderTextColor="#8A94B0"
            className="rounded-2xl bg-card px-4 py-3 text-white"
          />

          <Text className="mt-6 mb-2 text-white font-semibold">
            What do you want from the next chapter?
          </Text>
          <TextInput
            value={summary}
            onChangeText={setSummary}
            placeholder="e.g. Ship my project, move daily, protect evenings with family…"
            placeholderTextColor="#8A94B0"
            multiline
            className="h-32 rounded-2xl bg-card px-4 py-3 text-white"
            textAlignVertical="top"
          />

          <View className="flex-1" />

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/onboarding/questionnaire",
                params: { name, summary },
              })
            }
            className="mt-8 rounded-2xl bg-flame py-4"
          >
            <Text className="text-center text-base font-bold text-ink">Continue</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              exploreWithSeed();
              router.replace("/(tabs)");
            }}
            className="mt-3 py-2"
          >
            <Text className="text-center text-muted text-sm">
              Skip and explore with sample data
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
