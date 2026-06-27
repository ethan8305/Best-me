import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BlockCard } from "../../src/components/BlockCard";
import { StreakFlame } from "../../src/components/StreakFlame";
import { minutesByCategory } from "../../src/lib/plan";
import { CATEGORY_META } from "../../src/theme/categories";
import { useAppStore } from "../../src/stores/useAppStore";
import { CATEGORIES } from "../../src/types";

export default function Today() {
  const plan = useAppStore((s) => s.plan);
  const streak = useAppStore((s) => s.streak);
  const profile = useAppStore((s) => s.profile);
  const wellnessScore = useAppStore((s) => s.wellnessScore());
  const setBlockStatus = useAppStore((s) => s.setBlockStatus);
  const closeToday = useAppStore((s) => s.closeToday);
  const [closed, setClosed] = useState(false);

  const byCat = useMemo(
    () => (plan ? minutesByCategory(plan.blocks) : null),
    [plan]
  );

  const onCloseDay = () => {
    const { qualified, score } = closeToday();
    setClosed(true);
    Alert.alert(
      qualified ? "Balanced day 🔥" : "Day logged",
      qualified
        ? `Streak kept! Today's wellness score: ${score}/100.`
        : `No worries — balance over grind. Wellness score: ${score}/100.`
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <ScrollView contentContainerClassName="px-5 pb-12 pt-2">
        <Text className="text-muted">Hi {profile.name || "there"},</Text>
        <Text className="mb-4 text-2xl font-bold text-white">Today</Text>

        <StreakFlame streak={streak} />

        <View className="mt-3 flex-row rounded-2xl bg-card p-4">
          <View className="flex-1">
            <Text className="text-muted text-xs">Wellness score (7-day)</Text>
            <Text className="text-2xl font-bold text-white">{wellnessScore}/100</Text>
          </View>
          <View className="flex-row items-center">
            {CATEGORIES.map((c) => {
              const mins = byCat?.[c] ?? 0;
              return (
                <View key={c} className="ml-2 items-center">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: CATEGORY_META[c].color, opacity: mins ? 1 : 0.25 }}
                  />
                  <Text className="text-muted mt-1 text-[10px]">{Math.round(mins / 60)}h</Text>
                </View>
              );
            })}
          </View>
        </View>

        {plan?.summary ? (
          <View className="mt-3 rounded-2xl bg-surface p-4">
            <Text className="text-line text-xs font-semibold uppercase">Your brief</Text>
            <Text className="mt-1 text-white">{plan.summary}</Text>
          </View>
        ) : null}

        <Text className="mb-2 mt-6 text-lg font-bold text-white">Your day</Text>
        {plan?.blocks.length ? (
          plan.blocks.map((b) => (
            <BlockCard
              key={b.id}
              block={b}
              onComplete={(blk) => setBlockStatus(blk.id, "done", blk.estimatedMinutes)}
              onSkip={(blk) => setBlockStatus(blk.id, "skipped")}
            />
          ))
        ) : (
          <Text className="text-muted">No plan yet. Add goals to shape your day.</Text>
        )}

        {!closed && plan ? (
          <Pressable onPress={onCloseDay} className="mt-6 rounded-2xl bg-card py-4">
            <Text className="text-center font-bold text-white">
              Close the day & reflect
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
