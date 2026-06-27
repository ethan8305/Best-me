import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { StreakState } from "../types";

/**
 * The streak flame. It gently pulses to feel alive, and shows the current
 * count, longest streak, and how many "freezes" are banked to protect it.
 */
export function StreakFlame({ streak }: { streak: StreakState }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <View className="flex-row items-center rounded-2xl bg-card px-4 py-3">
      <Animated.Text style={{ transform: [{ scale }] }} className="text-4xl">
        🔥
      </Animated.Text>
      <View className="ml-3">
        <Text className="text-2xl font-bold text-white">{streak.current} day streak</Text>
        <Text className="text-muted text-xs">
          Best {streak.longest} · {streak.freezesAvailable} freeze
          {streak.freezesAvailable === 1 ? "" : "s"} banked
        </Text>
      </View>
    </View>
  );
}
