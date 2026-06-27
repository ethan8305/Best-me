import { Redirect } from "expo-router";
import React from "react";

import { useAppStore } from "../src/stores/useAppStore";

/** Send the user to onboarding or straight to Today based on their state. */
export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  return <Redirect href={onboarded ? "/(tabs)" : "/onboarding/summary"} />;
}
