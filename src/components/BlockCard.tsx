import React from "react";
import { Pressable, Text, View } from "react-native";

import { CATEGORY_META } from "../theme/categories";
import { clock } from "../lib/time";
import { Block } from "../types";

interface Props {
  block: Block;
  onComplete?: (block: Block) => void;
  onSkip?: (block: Block) => void;
}

/** One block in the Today timeline, with quick complete / skip actions. */
export function BlockCard({ block, onComplete, onSkip }: Props) {
  const meta = CATEGORY_META[block.category];
  const done = block.status === "done";
  const skipped = block.status === "skipped";

  return (
    <View className="mb-2 flex-row rounded-2xl bg-card p-3">
      <View className="w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      <View className="ml-3 flex-1">
        <Text className="text-muted text-xs">
          {clock(block.start)}–{clock(block.end)}
          {block.fixed ? " · calendar" : ""}
        </Text>
        <Text
          className={`text-base font-semibold ${
            done || skipped ? "text-muted line-through" : "text-white"
          }`}
        >
          {meta.emoji} {block.title}
        </Text>
        <Text className="text-muted text-xs">{meta.label}</Text>

        {!block.fixed && block.status === "planned" && (
          <View className="mt-2 flex-row">
            <Pressable
              onPress={() => onComplete?.(block)}
              className="mr-2 rounded-full bg-movement/20 px-3 py-1"
            >
              <Text className="text-movement text-xs font-semibold">Done</Text>
            </Pressable>
            <Pressable
              onPress={() => onSkip?.(block)}
              className="rounded-full bg-line px-3 py-1"
            >
              <Text className="text-muted text-xs font-semibold">Skip</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
