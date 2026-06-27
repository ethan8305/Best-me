import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CATEGORY_META } from "../../src/theme/categories";
import { daysUntil } from "../../src/scheduler";
import { todayIso } from "../../src/lib/time";
import { useAppStore } from "../../src/stores/useAppStore";

export default function Goals() {
  const goals = useAppStore((s) => s.goals);
  const projects = useAppStore((s) => s.projects);
  const today = todayIso();

  return (
    <SafeAreaView className="flex-1 bg-ink" edges={["top"]}>
      <ScrollView contentContainerClassName="px-5 pb-12 pt-2">
        <Text className="mb-4 text-2xl font-bold text-white">Goals & deadlines</Text>

        {goals.map((g) => {
          const meta = CATEGORY_META[g.category];
          const goalProjects = projects.filter((p) => p.goalId === g.id);
          return (
            <View key={g.id} className="mb-3 rounded-2xl bg-card p-4">
              <View className="flex-row items-center">
                <View
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <Text className="flex-1 text-base font-bold text-white">{g.title}</Text>
                <Text className="text-muted text-xs uppercase">{g.priority}</Text>
              </View>
              {g.description ? (
                <Text className="mt-1 text-muted text-sm">{g.description}</Text>
              ) : null}

              {goalProjects.map((p) => {
                const left = daysUntil(p.deadline, today);
                const remaining = Math.max(0, p.estimatedEffortMinutes - p.completedMinutes);
                const pct = Math.min(
                  100,
                  Math.round((p.completedMinutes / Math.max(1, p.estimatedEffortMinutes)) * 100)
                );
                return (
                  <View key={p.id} className="mt-3 rounded-xl bg-surface p-3">
                    <Text className="text-white">{p.title}</Text>
                    <Text className="text-muted mt-1 text-xs">
                      {left === 0 ? "Due today" : `${left} days left`} ·{" "}
                      {Math.round(remaining / 60)}h remaining · {pct}% done
                    </Text>
                    <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                      <View
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: meta.color }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
