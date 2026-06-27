import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CATEGORY_META } from "../../src/theme/categories";
import { minutesByCategory } from "../../src/lib/plan";
import { useAppStore } from "../../src/stores/useAppStore";
import { CATEGORIES } from "../../src/types";

export default function Insights() {
  const dailyScores = useAppStore((s) => s.dailyScores);
  const wellnessScore = useAppStore((s) => s.wellnessScore());
  const streak = useAppStore((s) => s.streak);
  const plan = useAppStore((s) => s.plan);

  const balance = useMemo(() => {
    const byCat = plan ? minutesByCategory(plan.blocks) : null;
    const total = byCat ? CATEGORIES.reduce((s, c) => s + byCat[c], 0) : 0;
    return { byCat, total };
  }, [plan]);

  const maxScore = Math.max(100, ...dailyScores);

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <ScrollView contentContainerClassName="px-5 pb-12 pt-2">
        <Text className="mb-4 text-2xl font-bold text-white">Insights</Text>

        <View className="flex-row">
          <Stat label="Wellness" value={`${wellnessScore}`} suffix="/100" />
          <Stat label="Streak" value={`${streak.current}`} suffix=" days" />
          <Stat label="Best" value={`${streak.longest}`} suffix=" days" />
        </View>

        <Text className="mb-2 mt-6 text-lg font-bold text-white">
          Wellness trend
        </Text>
        <View className="flex-row items-end rounded-2xl bg-card p-4" style={{ height: 140 }}>
          {dailyScores.slice(-14).map((score, i) => (
            <View key={i} className="flex-1 items-center justify-end">
              <View
                className="w-3 rounded-full bg-flame"
                style={{ height: Math.max(4, (score / maxScore) * 100) }}
              />
            </View>
          ))}
        </View>

        <Text className="mb-2 mt-6 text-lg font-bold text-white">
          Today's balance
        </Text>
        <View className="rounded-2xl bg-card p-4">
          {CATEGORIES.map((c) => {
            const mins = balance.byCat?.[c] ?? 0;
            const pct = balance.total ? Math.round((mins / balance.total) * 100) : 0;
            return (
              <View key={c} className="mb-2">
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-white text-sm">
                    {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
                  </Text>
                  <Text className="text-muted text-xs">{pct}%</Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-line">
                  <View
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: CATEGORY_META[c].color }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <View className="mr-3 flex-1 rounded-2xl bg-card p-4">
      <Text className="text-muted text-xs">{label}</Text>
      <Text className="text-white">
        <Text className="text-2xl font-bold">{value}</Text>
        <Text className="text-muted text-xs">{suffix}</Text>
      </Text>
    </View>
  );
}
